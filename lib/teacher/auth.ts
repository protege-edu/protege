import "server-only";
import { randomUUID } from "node:crypto";
import { eq, isNull } from "drizzle-orm";
import { clear, readSigned, setSigned } from "@/lib/auth/cookies";
import { hash, keyedHash, randomCode, verify } from "@/lib/auth/crypto";
import { db } from "@/lib/db/client";
import { classes, lessons, settings, teachers } from "@/lib/db/schema";
import { BUILT_IN } from "@/lib/lesson";

/**
 * Teacher accounts. No paid login service: an email + password (hashed with scrypt) stored on this
 * Protégé, optional "Continue with Google", and a recovery code (shown once at sign-up) for a
 * forgotten password, because sending a reset email would need an email service.
 */
const COOKIE = "protege_teacher";
const DAYS = 14;
const MAX_TRIES = 5;
const LOCK_MINUTES = 10;

export type Teacher = Pick<typeof teachers.$inferSelect, "id" | "email" | "name" | "onboardedAt">;

const pick = (t: typeof teachers.$inferSelect): Teacher => ({ id: t.id, email: t.email, name: t.name, onboardedAt: t.onboardedAt });

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

/** Make an account. `code` is the setup code (first account) or an invite (everyone after). */
export async function signUp(input: { email: string; password: string; name: string; code?: string }): Promise<SignUpResult> {
  const email = input.email.trim().toLowerCase();
  const first = !await anyTeachers();
  if (!await joinCodeValid(input.code)) {
    return {
      ok: false,
      error: first ? "That setup code isn't right. It's in the window where Protégé is running." : "That invite code doesn't work. Ask a teacher who uses Protégé to make you a new one.",
    };
  }
  if (await db.select({ id: teachers.id }).from(teachers).where(eq(teachers.email, email)).get()) {
    return { ok: false, error: "There's already an account with that email. Sign in instead." };
  }
  const recoveryCode = randomCode(3, 4);
  const id = randomUUID();
  await db.insert(teachers).values({ id, email, name: input.name.trim(), passwordHash: hash(input.password), recoveryHash: hash(recoveryCode), createdAt: new Date() }).run();
  if (first) await claimUnowned(id);
  else await spendInvite(input.code!);
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
 * Lost the password AND the recovery code: whoever runs Protégé resets it from the laptop's terminal
 * (npm run reset-teacher -- <email>). Gives a new recovery code, which signs them in like the usual "forgot password".
 */
export async function resetFromLaptop(emailRaw: string): Promise<string | null> {
  const t = await db.select().from(teachers).where(eq(teachers.email, emailRaw.trim().toLowerCase())).get();
  if (!t) return null;
  const recoveryCode = randomCode(3, 4);
  await db.update(teachers).set({ recoveryHash: hash(recoveryCode), failedLogins: 0, lockedUntil: null }).where(eq(teachers.id, t.id)).run();
  return recoveryCode;
}

/**
 * Continue with Google: find the teacher by their Google account, or by email, or make a new account.
 * A NEW account needs the setup code or an invite, like signing up with email.
 */
export async function teacherFromGoogle(sub: string, email: string, invite?: string): Promise<Teacher | null> {
  const idHash = await keyedHash(sub);
  const byGoogle = await db.select().from(teachers).where(eq(teachers.googleIdHash, idHash)).get();
  if (byGoogle) return pick(byGoogle);
  const byEmail = await db.select().from(teachers).where(eq(teachers.email, email)).get();
  if (byEmail) {
    await db.update(teachers).set({ googleIdHash: idHash }).where(eq(teachers.id, byEmail.id)).run();
    return pick(byEmail);
  }
  if (!await joinCodeValid(invite)) return null;
  const first = !await anyTeachers();
  const id = randomUUID();
  await db.insert(teachers).values({ id, email, name: email.split("@")[0], googleIdHash: idHash, createdAt: new Date() }).run();
  if (first) await claimUnowned(id);
  else await spendInvite(invite!);
  return pick((await db.select().from(teachers).where(eq(teachers.id, id)).get())!);
}

/*
 * Who may make a teacher account (Protégé is reachable from the internet, so not just anyone):
 *   - the FIRST account needs the setup code, which Protégé prints in the window it runs in.
 *     Only whoever runs Protégé can see it.
 *   - after that, a one-use invite code that a signed-in teacher made (lasts 7 days).
 * (Not "is this the laptop?": request headers can be faked by anyone on the school network.)
 * Invites live in settings as "teacher_invite:<keyed hash>" → expiry time, so the code itself is never stored.
 */
const SETUP = "setup_code";
const store = globalThis as unknown as { protegeSetupShown?: boolean };

/** The setup code (made once, kept until the first account exists). Printed in the terminal once per start. */
export async function setupCode(): Promise<string> {
  let row = await db.select().from(settings).where(eq(settings.key, SETUP)).get();
  if (!row) {
    await db.insert(settings).values({ key: SETUP, value: randomCode(2, 4) }).run();
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

export type SignUpGate = "setup" | "invite";
/** What a new teacher needs: the setup code (no accounts yet) or an invite */
export async function signUpGate(): Promise<SignUpGate> {
  if (await anyTeachers()) return "invite";
  await setupCode();
  return "setup";
}

/** Is this the right code to make an account right now (setup code first, invites after)? */
export async function joinCodeValid(code: string | undefined): Promise<boolean> {
  if (!code?.trim()) return false;
  if (!await anyTeachers()) return code.trim().toUpperCase() === await setupCode();
  return await inviteValid(code);
}

const INVITE_DAYS = 7;
const inviteKey = async (code: string) => `teacher_invite:${await keyedHash(code.trim().toUpperCase())}`;

export async function makeInvite(): Promise<{ code: string; expires: Date }> {
  const code = randomCode(2, 4);
  const expires = new Date(Date.now() + INVITE_DAYS * 86400000);
  await db.insert(settings).values({ key: await inviteKey(code), value: expires.toISOString() }).run();
  return { code, expires };
}

export async function inviteValid(code: string | undefined): Promise<boolean> {
  if (!code?.trim()) return false;
  const row = await db.select().from(settings).where(eq(settings.key, await inviteKey(code))).get();
  return !!row && new Date(row.value).getTime() > Date.now();
}

export async function spendInvite(code: string) {
  await db.delete(settings).where(eq(settings.key, await inviteKey(code))).run();
}

export async function markOnboarded(teacherId: string) {
  await db.update(teachers).set({ onboardedAt: new Date() }).where(eq(teachers.id, teacherId)).run();
}
