import "server-only";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/lib/db/client";
import { settings } from "@/lib/db/schema";

/**
 * A simple local lock for the teacher side. No accounts, no emails, no paid login service.
 * The teacher picks a passcode the first time. We store only a scrypt hash of it, never the passcode.
 * Being signed in = a cookie signed with a secret that only this computer knows.
 */
const COOKIE = "protege_teacher";
const DAYS = 14;

function getSetting(key: string) {
  return db.select().from(settings).where(eq(settings.key, key)).get()?.value ?? null;
}
function setSetting(key: string, value: string) {
  db.insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value } }).run();
}

function secret(): string {
  let s = getSetting("cookie_secret");
  if (!s) {
    s = randomBytes(32).toString("hex");
    setSetting("cookie_secret", s);
  }
  return s;
}

export function hasPasscode() {
  return getSetting("teacher_passcode") !== null;
}

export function setPasscode(passcode: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(passcode, salt, 32).toString("hex");
  setSetting("teacher_passcode", `${salt}:${hash}`);
}

export function checkPasscode(passcode: string): boolean {
  const stored = getSetting("teacher_passcode");
  if (!stored) return false;
  const [salt, hash] = stored.split(":");
  const attempt = scryptSync(passcode, salt, 32);
  return timingSafeEqual(attempt, Buffer.from(hash, "hex"));
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

export async function signIn() {
  const expires = Date.now() + DAYS * 864e5;
  const value = `${expires}.${sign(String(expires))}`;
  (await cookies()).set(COOKIE, value, { httpOnly: true, sameSite: "lax", path: "/", maxAge: DAYS * 86400 });
}

export async function signOut() {
  (await cookies()).delete(COOKIE);
}

export async function isTeacher(): Promise<boolean> {
  const value = (await cookies()).get(COOKIE)?.value;
  // No passcode (never set, or reset) means nobody is signed in
  if (!value || !hasPasscode()) return false;
  const [expires, sig] = value.split(".");
  if (!expires || !sig || Number(expires) < Date.now()) return false;
  const good = sign(expires);
  return sig.length === good.length && timingSafeEqual(Buffer.from(sig), Buffer.from(good));
}
