import "server-only";
import { createHmac, randomBytes, randomInt, scryptSync, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { settings } from "@/lib/db/schema";

/**
 * The small crypto Protégé needs, all from Node's built-in `crypto` (free, nothing to install):
 *   hash/verify: scrypt with a random salt (passwords, recovery codes, picture keys)
 *   sign/check:  HMAC with a secret only this computer knows (sign-in cookies)
 *   keyedHash:   HMAC of an outside id (a Google account) so we can recognise it without storing it
 */

export function secret(): string {
  const row = db.select().from(settings).where(eq(settings.key, "cookie_secret")).get();
  if (row) return row.value;
  const value = randomBytes(32).toString("hex");
  db.insert(settings).values({ key: "cookie_secret", value }).onConflictDoNothing().run();
  return db.select().from(settings).where(eq(settings.key, "cookie_secret")).get()!.value;
}

export function hash(plain: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(plain, salt, 32).toString("hex")}`;
}

export function verify(plain: string, stored: string | null | undefined): boolean {
  if (!stored) return false;
  const [salt, hex] = stored.split(":");
  if (!salt || !hex) return false;
  const attempt = scryptSync(plain, salt, 32);
  const want = Buffer.from(hex, "hex");
  return attempt.length === want.length && timingSafeEqual(attempt, want);
}

export function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

export function signedEquals(value: string, signature: string): boolean {
  const good = sign(value);
  return signature.length === good.length && timingSafeEqual(Buffer.from(signature), Buffer.from(good));
}

/** Recognise an outside account id (Google) later, without ever storing the id itself */
export function keyedHash(value: string): string {
  return createHmac("sha256", secret()).update(`id:${value}`).digest("hex");
}

// No look-alike characters (0/O, 1/I/L), so codes are easy to read off a projector or say out loud
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function randomCode(groups = 3, size = 4): string {
  return Array.from({ length: groups }, () => Array.from({ length: size }, () => ALPHABET[randomInt(ALPHABET.length)]).join("")).join("-");
}
