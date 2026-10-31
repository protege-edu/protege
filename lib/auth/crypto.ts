import "server-only";
import { createHmac, randomBytes, randomInt, scryptSync, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { settings } from "@/lib/db/schema";

/**
 * The small crypto Protégé needs, all from Node's built-in `crypto` (free, nothing to install):
 *   hash/verify: scrypt with a random salt (passwords, recovery codes, picture keys)
 *   sign/check:  HMAC with a secret only this server knows (sign-in cookies)
 *   keyedHash:   HMAC of an outside id (a Google account) so we can recognise it without storing it
 */

// asked for once per server start (it never changes)
let known: string | null = null;

export async function secret(): Promise<string> {
  if (known) return known;
  const row = await db.select().from(settings).where(eq(settings.key, "cookie_secret")).get();
  if (row) return (known = row.value);
  const value = randomBytes(32).toString("hex");
  await db.insert(settings).values({ key: "cookie_secret", value }).onConflictDoNothing().run();
  return (known = (await db.select().from(settings).where(eq(settings.key, "cookie_secret")).get())!.value);
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

export async function sign(value: string): Promise<string> {
  return createHmac("sha256", await secret()).update(value).digest("hex");
}

export async function signedEquals(value: string, signature: string): Promise<boolean> {
  const good = await sign(value);
  return signature.length === good.length && timingSafeEqual(Buffer.from(signature), Buffer.from(good));
}

/** Recognise an outside account id (Google) later, without ever storing the id itself */
export async function keyedHash(value: string): Promise<string> {
  return createHmac("sha256", await secret()).update(`id:${value}`).digest("hex");
}

// No look-alike characters (0/O, 1/I/L), so codes are easy to read off a projector or say out loud
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function randomCode(groups = 3, size = 4): string {
  return Array.from({ length: groups }, () => Array.from({ length: size }, () => ALPHABET[randomInt(ALPHABET.length)]).join("")).join("-");
}
