import "server-only";
import { randomUUID } from "node:crypto";
import { eq, isNull } from "drizzle-orm";
import { clear, readSigned, setSigned } from "@/lib/auth/cookies";
import { hash, keyedHash, randomCode, verify } from "@/lib/auth/crypto";
import { db } from "@/lib/db/client";
import { classes, lessons, settings, teachers } from "@/lib/db/schema";
import { BUILT_IN } from "@/lib/lesson";
import { schoolByStaffCode } from "./schools";

/**
 * Teacher accounts. No paid login service: an email + password (hashed with scrypt) stored on this
 * Protégé, optional "Continue with Google", and a recovery code (shown once at sign-up) for a
 * forgotten password, because sending a reset email would need an email service.
 */
const COOKIE = "protege_teacher";
const DAYS = 14;
const MAX_TRIES = 5;
const LOCK_MINUTES = 10;

export type Teacher = Pick<typeof teachers.$inferSelect, "id" | "email" | "name" | "onboardedAt" | "schoolId" | "owner">;

const pick = (t: typeof teachers.$inferSelect): Teacher => ({ id: t.id, email: t.email, name: t.name, onboardedAt: t.onboardedAt, schoolId: t.schoolId, owner: t.owner });

export const anyTeachers = async () => !!await db.select({ id: teachers.id }).from(teachers).limit(1).get();

/** The signed-in teacher, or null */
export async function currentTeacher(): Promise<Teacher | null> {
  const id = await readSigned(COOKIE);
  if (!id) return null;
  const t = await db.select().from(teachers).where(eq(teachers.id, id)).get();
  return t ? pick(t) : null;
}

export async function signInAs(teacherId: string, request?: Request) {
  await setSigned(COOKIE, teacherId, DAYS, request);
}

export async function signOut() {
  await clear(COOKIE);
}

/**
 * The very first teacher account takes over everything made before accounts existed
 * (the practice class, lessons drafted with the old passcode), and the old passcode is retired.
 */
async function claimUnowned(teacherId: string) {
  await db.update(classes).set({ teacherId }).where(isNull(classes.teacherId)).run();
  for (const l of await db.select({ id: lessons.id }).from(lessons).where(isNull(lessons.teacherId)).all()) {
    if (!(l.id in BUILT_IN)) await db.update(lessons).set({ teacherId }).where(eq(lessons.id, l.id)).run();
  }
  await db.delete(settings).where(eq(settings.key, "teacher_passcode")).run();
  await setupDone();
}

export type SignUpResult = { ok: true; teacher: Teacher; recoveryCode: string } | { ok: false; error: string };

/** Make an account. `code` is the setup code (the first account: the owner) or a school's staff code (everyone after). */
export async function signUp(input: { email: string; password: string; name: string; code?: string }): Promise<SignUpResult> {
  const email = input.email.trim().toLowerCase();
  const joining = await whoIsJoining(input.code);
  if (!joining) return { ok: false, error: await wrongCode() };
  if (await db.select({ id: teachers.id }).from(teachers).where(eq(teachers.email, email)).get()) {
    return { ok: false, error: "There's already an account with that email. Sign in instead." };
  }
  const recoveryCode = randomCode(3, 4);
  const id = randomUUID();
  await db
    .insert(teachers)
    .values({ id, email, name: input.name.trim(), passwordHash: hash(input.password), recoveryHash: hash(recoveryCode), schoolId: joining.schoolId, owner: joining.owner, createdAt: new Date() })
    .run();
  if (joining.owner) await claimUnowned(id);
  return { ok: true, teacher: pick((await db.select().from(teachers).where(eq(teachers.id, id)).get())!), recoveryCode };
}

export type SignInResult = { ok: true; teacher: Teacher } | { ok: false; error: string };

/** Email + password, with a short lock-out after too many wrong tries */
export async function signIn(emailRaw: string, password: string): Promise<SignInResult> {
  const email = emailRaw.trim().toLowerCase();
  const t = await db.select().from(teachers).where(eq(teachers.email, email)).get();
  const wrong: SignInResult = { ok: false, error: "That email and password don't match. Try again." };
  if (!t) return wrong;
  if (t.lockedUntil && t.lockedUntil.getTime() > Date.now()) {
    const mins = Math.ceil((t.lockedUntil.getTime() - Date.now()) / 60000);
    return { ok: false, error: `Too many wrong tries. Wait ${mins} minute${mins === 1 ? "" : "s"}, or use your recovery code.` };
  }
  if (!t.passwordHash) return { ok: false, error: "This account signs in with Google. Use \"Continue with Google\"." };
  if (!verify(password, t.passwordHash)) {
    const failed = t.failedLogins + 1;
    await db.update(teachers)
      .set({ failedLogins: failed >= MAX_TRIES ? 0 : failed, lockedUntil: failed >= MAX_TRIES ? new Date(Date.now() + LOCK_MINUTES * 60000) : null })
      .where(eq(teachers.id, t.id))
      .run();
    return wrong;
  }
  await db.update(teachers).set({ failedLogins: 0, lockedUntil: null }).where(eq(teachers.id, t.id)).run();
  return { ok: true, teacher: pick(t) };
}

/** Forgot your password: email + recovery code + a new password. Gives a NEW recovery code (each one works once). */
export async function recover(emailRaw: string, code: string, newPassword: string): Promise<{ ok: true; teacher: Teacher; recoveryCode: string } | { ok: false; error: string }> {
  const email = emailRaw.trim().toLowerCase();
  const t = await db.select().from(teachers).where(eq(teachers.email, email)).get();
  if (!t || !verify(code.trim().toUpperCase(), t.recoveryHash)) return { ok: false, error: "That email and recovery code don't match." };
  const recoveryCode = randomCode(3, 4);
  await db.update(teachers).set({ passwordHash: hash(newPassword), recoveryHash: hash(recoveryCode), failedLogins: 0, lockedUntil: null }).where(eq(teachers.id, t.id)).run();
  return { ok: true, teacher: pick(t), recoveryCode };
}

/**
 * Lost the password AND the recovery code: whoever runs Protégé resets it (the owner page, or
 * npm run reset-teacher -- <email>). Gives a new recovery code, which signs them in like the usual "forgot password".
 */
export async function resetByOwner(emailRaw: string): Promise<string | null> {
  const t = await db.select().from(teachers).where(eq(teachers.email, emailRaw.trim().toLowerCase())).get();
  if (!t) return null;
  const recoveryCode = randomCode(3, 4);
  await db.update(teachers).set({ recoveryHash: hash(recoveryCode), failedLogins: 0, lockedUntil: null }).where(eq(teachers.id, t.id)).run();
  return recoveryCode;
}

/**
 * Continue with Google: find the teacher by their Google account, or by email, or make a new account.
 * A NEW account needs the setup code or a staff code, like signing up with email.
 */
export async function teacherFromGoogle(sub: string, email: string, code?: string): Promise<Teacher | null> {
  const idHash = await keyedHash(sub);
  const byGoogle = await db.select().from(teachers).where(eq(teachers.googleIdHash, idHash)).get();
  if (byGoogle) return pick(byGoogle);
  const byEmail = await db.select().from(teachers).where(eq(teachers.email, email)).get();
  if (byEmail) {
    await db.update(teachers).set({ googleIdHash: idHash }).where(eq(teachers.id, byEmail.id)).run();
    return pick(byEmail);
  }
  const joining = await whoIsJoining(code);
  if (!joining) return null;
  const id = randomUUID();
  await db.insert(teachers).values({ id, email, name: email.split("@")[0], googleIdHash: idHash, schoolId: joining.schoolId, owner: joining.owner, createdAt: new Date() }).run();
  if (joining.owner) await claimUnowned(id);
  return pick((await db.select().from(teachers).where(eq(teachers.id, id)).get())!);
}

/*
 * Who may make a teacher account (Protégé is on the open internet, and students have school accounts too,
 * so an email address proves nothing):
 *   - the FIRST account needs the setup code, which Protégé prints in its logs (only whoever runs it can see
 *     them). That account is the OWNER: it adds schools, and each school gets a staff code.
 *   - after that, a school's STAFF CODE (lib/teacher/schools.ts). The teacher becomes part of that school.
 */
const SETUP = "setup_code";
const store = globalThis as unknown as { protegeSetupShown?: boolean };

/** The setup code (made once, kept until the first account exists). Printed in the logs once per start. */
export async function setupCode(): Promise<string> {
  let row = await db.select().from(settings).where(eq(settings.key, SETUP)).get();
  if (!row) {
    await db.insert(settings).values({ key: SETUP, value: randomCode(2, 4) }).onConflictDoNothing().run();
    row = (await db.select().from(settings).where(eq(settings.key, SETUP)).get())!;
  }
  if (!store.protegeSetupShown) {
    store.protegeSetupShown = true;
    console.log(`\n  ┌──────────────────────────────────────────────┐\n  │  Protégé setup code:  ${row.value}              │\n  │  Type it to make the first teacher account.  │\n  └──────────────────────────────────────────────┘\n`);
  }
  return row.value;
}

async function setupDone() {
  await db.delete(settings).where(eq(settings.key, SETUP)).run();
}

export type SignUpGate = "setup" | "staff";
/** What a new teacher needs: the setup code (no accounts yet) or their school's staff code */
export async function signUpGate(): Promise<SignUpGate> {
  if (await anyTeachers()) return "staff";
  await setupCode();
  return "setup";
}

/** Who this code lets in: the owner (the setup code, before any account exists) or a teacher at a school. Null: nobody. */
async function whoIsJoining(code: string | undefined): Promise<{ owner: boolean; schoolId: string | null } | null> {
  if (!code?.trim()) return null;
  if (!(await anyTeachers())) return code.trim().toUpperCase() === (await setupCode()) ? { owner: true, schoolId: null } : null;
  const school = await schoolByStaffCode(code);
  return school ? { owner: false, schoolId: school.id } : null;
}

async function wrongCode() {
  return (await anyTeachers())
    ? "That staff code doesn't work. Ask your principal, or a teacher at your school who uses Protégé, for your school's code."
    : "That setup code isn't right. It's in Protégé's logs (see the README, \"Your account\")."
}

export async function markOnboarded(teacherId: string) {
  await db.update(teachers).set({ onboardedAt: new Date() }).where(eq(teachers.id, teacherId)).run();
}
