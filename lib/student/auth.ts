import "server-only";
import { randomInt, randomUUID } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import { nicknameSafe } from "@/lib/ai/safety";
import { getAgeStyle, styleForGrade } from "@/lib/age-styles";
import { clear, readSigned, setSigned } from "@/lib/auth/cookies";
import { hash, keyedHash, verify } from "@/lib/auth/crypto";
import { db } from "@/lib/db/client";
import { classes, gloams, students } from "@/lib/db/schema";
import { PICTURES, keySize } from "./pictures";

/**
 * Students: a nickname in a class, and a secret picture key. No real names, emails or birthdays, ever.
 * The key is stored only as a hash. "Continue with Google" (only if the teacher turned it on) is stored
 * only as a keyed hash of Google's account id: never an email, name or photo.
 */
const COOKIE = "protege_student";
const DAYS = 30;
const MAX_TRIES = 5;
const LOCK_MINUTES = 5;

export { PICTURES, keySize, type Picture } from "./pictures";
import type { JoinError } from "@/lib/age-styles/types";

export type Student = { id: string; nickname: string; classId: string };

export async function currentStudent(): Promise<Student | null> {
  const id = await readSigned(COOKIE);
  if (!id) return null;
  const s = db.select().from(students).where(eq(students.id, id)).get();
  if (!s?.classId) return null;
  db.update(students).set({ lastSeenAt: new Date() }).where(eq(students.id, id)).run();
  return { id: s.id, nickname: s.nickname, classId: s.classId };
}

export async function signInStudent(id: string, request?: Request) {
  await setSigned(COOKIE, id, DAYS, request);
}

export async function signOutStudent() {
  await clear(COOKIE);
}

/** What a student sees after typing a class code */
export function classPreview(classId: string) {
  const c = db.select().from(classes).where(eq(classes.id, classId)).get();
  if (!c) return null;
  const style = styleForGrade(c.grade);
  return {
    classId: c.id,
    name: c.name,
    ageStyle: style.id,
    language: c.language === "fr" ? ("fr" as const) : ("en" as const),
    keySize: keySize(c.grade),
    google: c.googleSignIn,
    // returning students tap their nickname (nicknames only; nothing else about anyone)
    nicknames: db
      .select({ id: students.id, nickname: students.nickname, hasKey: students.keyHash, google: students.googleIdHash })
      .from(students)
      .where(eq(students.classId, c.id))
      .orderBy(asc(students.nickname))
      .all()
      .map((s) => ({ id: s.id, nickname: s.nickname, google: !!s.google && !s.hasKey, needsNewKey: !s.hasKey && !s.google })),
  };
}

const keyString = (key: string[]) => key.join("-");
const validKey = (key: string[], size: number) => key.length === size && key.every((k) => (PICTURES as readonly string[]).includes(k));

/** A nickname a student may use in this class: safe for school, not taken, not too long */
export function checkNickname(classId: string, raw: string): { ok: true; nickname: string } | { ok: false; error: string; code: JoinError } {
  const nickname = raw.replace(/\s+/g, " ").trim();
  if (nickname.length < 2) return { ok: false, code: "nick_short", error: "Pick a nickname with at least 2 letters." };
  if (nickname.length > 24) return { ok: false, code: "nick_long", error: "That's a long one. Keep it under 24 letters." };
  const c = db.select({ grade: classes.grade }).from(classes).where(eq(classes.id, classId)).get();
  if (!nicknameSafe(nickname, getAgeStyle(styleForGrade(c?.grade ?? 9).id))) return { ok: false, code: "nick_unsafe", error: "Let's pick a different nickname. Tap \"Surprise me\" for ideas." };
  if (/@|\d{5,}/.test(nickname)) return { ok: false, code: "nick_contact", error: "Just a nickname, please: no emails or phone numbers." };
  const taken = db.select({ id: students.id, n: students.nickname }).from(students).where(eq(students.classId, classId)).all().some((s) => s.n.toLowerCase() === nickname.toLowerCase());
  if (taken) return { ok: false, code: "nick_taken", error: "Someone in your class already has that one. Try another." };
  return { ok: true, nickname };
}

export function createStudent(classId: string, nicknameRaw: string, key: string[] | null, googleIdHash?: string): { ok: true; student: Student } | { ok: false; error: string; code: JoinError } {
  const c = db.select().from(classes).where(eq(classes.id, classId)).get();
  if (!c) return { ok: false, code: "class_gone", error: "That class doesn't exist any more. Check the code with your teacher." };
  const nick = checkNickname(classId, nicknameRaw);
  if (!nick.ok) return nick;
  if (!googleIdHash && (!key || !validKey(key, keySize(c.grade)))) return { ok: false, code: "key_missing", error: "Pick your secret pictures first." };
  const id = randomUUID();
  const now = new Date();
  db.transaction((tx) => {
    tx.insert(students)
      .values({ id, nickname: nick.nickname, classId, keyHash: key ? hash(keyString(key)) : null, googleIdHash: googleIdHash ?? null, createdAt: now, lastSeenAt: now })
      .run();
    tx.insert(gloams).values({ studentId: id, updatedAt: now }).run();
  });
  return { ok: true, student: { id, nickname: nick.nickname, classId } };
}

/** Coming back: tap your nickname, then your picture key (after a reset, the key you pick becomes the new one) */
export function checkKey(classId: string, studentId: string, key: string[]): { ok: true; student: Student } | { ok: false; error: string; code: JoinError } {
  const s = db.select().from(students).where(and(eq(students.id, studentId), eq(students.classId, classId))).get();
  const c = db.select().from(classes).where(eq(classes.id, classId)).get();
  if (!s || !c) return { ok: false, code: "not_found", error: "We couldn't find you in this class. Ask your teacher." };
  if (!validKey(key, keySize(c.grade))) return { ok: false, code: "key_missing", error: "Pick your secret pictures." };
  if (s.lockedUntil && s.lockedUntil.getTime() > Date.now()) return { ok: false, code: "key_locked", error: "Too many tries. Wait a few minutes, or ask your teacher to reset your pictures." };
  // a Google student has no pictures: only Google gets them back in (otherwise anyone could set some)
  if (!s.keyHash && s.googleIdHash) return { ok: false, code: "key_google", error: "This one signs in with Google. Press \"Continue with Google\"." };
  if (!s.keyHash) {
    db.update(students).set({ keyHash: hash(keyString(key)), failedKeys: 0 }).where(eq(students.id, s.id)).run();
    return { ok: true, student: { id: s.id, nickname: s.nickname, classId } };
  }
  if (!verify(keyString(key), s.keyHash)) {
    const failed = s.failedKeys + 1;
    db.update(students)
      .set({ failedKeys: failed >= MAX_TRIES ? 0 : failed, lockedUntil: failed >= MAX_TRIES ? new Date(Date.now() + LOCK_MINUTES * 60000) : null })
      .where(eq(students.id, s.id))
      .run();
    return { ok: false, code: "key_wrong", error: "Those aren't your pictures. Try again, or ask your teacher to reset them." };
  }
  db.update(students).set({ failedKeys: 0, lockedUntil: null }).where(eq(students.id, s.id)).run();
  return { ok: true, student: { id: s.id, nickname: s.nickname, classId } };
}

/**
 * May the person on this device use this student's session? A class student's sessions belong to
 * whoever is signed in as them (a shared Chromebook must never open the last student's session).
 * The practice student (no class) belongs to the browser that made it.
 */
export async function maySeeStudent(studentId: string): Promise<boolean> {
  const s = db.select({ classId: students.classId }).from(students).where(eq(students.id, studentId)).get();
  if (!s) return false;
  if (!s.classId) return true;
  return (await currentStudent())?.id === studentId;
}

/** Has this student's teacher paused the class? */
export function classPaused(studentId: string): boolean {
  const s = db.select({ classId: students.classId }).from(students).where(eq(students.id, studentId)).get();
  if (!s?.classId) return false;
  return !!db.select({ p: classes.pausedAt }).from(classes).where(eq(classes.id, s.classId)).get()?.p;
}

/** Continue with Google: the student in this class with this Google account, if they've been here before */
export function studentByGoogle(classId: string, sub: string): Student | null {
  const s = db.select().from(students).where(and(eq(students.classId, classId), eq(students.googleIdHash, keyedHash(sub)))).get();
  return s ? { id: s.id, nickname: s.nickname, classId } : null;
}

// ---- "Surprise me" nicknames: gentle, a little funny, never about real people ----
const ADJ = ["Quiet", "Brave", "Sleepy", "Mossy", "Lucky", "Fuzzy", "Swift", "Cosmic", "Tiny", "Misty", "Sunny", "Clever", "Dizzy", "Gentle", "Spark", "Velvet", "Wild", "Calm", "Witty", "Bouncy"];
const NOUN = ["Otter", "Comet", "Fern", "Moth", "Pebble", "Badger", "Lantern", "Owl", "Maple", "Newt", "Puffin", "Cricket", "Willow", "Fox", "Ember", "Heron", "Acorn", "Wombat", "Firefly", "Narwhal"];

// French: the adjective comes after the noun, and only adjectives that are the same for every gender
// ("Comète Calme", "Renard Calme"), so every pair is good French
const NOUN_FR = ["Renard", "Hibou", "Loutre", "Comète", "Fougère", "Luciole", "Castor", "Héron", "Érable", "Grillon", "Saule", "Braise", "Triton", "Macareux", "Blaireau", "Galet", "Lanterne", "Narval", "Écureuil", "Chouette"];
const ADJ_FR = ["Calme", "Brave", "Drôle", "Magique", "Sage", "Timide", "Agile", "Cosmique", "Habile", "Rapide", "Tranquille", "Fidèle", "Rose", "Orange", "Mystique", "Étrange", "Sympa", "Pâle", "Splendide", "Unique"];

export function suggestNicknames(classId: string, count = 3): string[] {
  const french = db.select({ language: classes.language }).from(classes).where(eq(classes.id, classId)).get()?.language === "fr";
  const out = new Set<string>();
  for (let i = 0; out.size < count && i < 60; i++) {
    const n = french ? `${NOUN_FR[randomInt(NOUN_FR.length)]} ${ADJ_FR[randomInt(ADJ_FR.length)]}` : `${ADJ[randomInt(ADJ.length)]} ${NOUN[randomInt(NOUN.length)]}`;
    if (checkNickname(classId, n).ok) out.add(n);
  }
  return [...out];
}

export function markMetGloam(studentId: string) {
  db.update(students).set({ metGloamAt: new Date() }).where(eq(students.id, studentId)).run();
}
