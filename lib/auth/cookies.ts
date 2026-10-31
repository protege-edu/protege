import "server-only";
import { cookies } from "next/headers";
import { sign, signedEquals } from "./crypto";
import { isHttps } from "./request";

/**
 * Signed cookies: "<value>.<expires>.<signature>". Only this server can make a valid one, so nobody
 * can pretend to be a teacher or another student by editing a cookie. httpOnly (scripts can't read
 * them), SameSite=Lax (other sites can't use them), Secure over https.
 */
export async function setSigned(name: string, value: string, days: number, request?: Request) {
  const expires = String(Date.now() + days * 864e5);
  (await cookies()).set(name, `${value}.${expires}.${await sign(`${name}:${value}.${expires}`)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: isHttps(request),
    path: "/",
    maxAge: days * 86400,
  });
}

export async function readSigned(name: string): Promise<string | null> {
  const raw = (await cookies()).get(name)?.value;
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 3) return null;
  const [value, expires, sig] = parts;
  if (Number(expires) < Date.now()) return null;
  return (await signedEquals(`${name}:${value}.${expires}`, sig)) ? value : null;
}

export async function clear(name: string) {
  (await cookies()).delete(name);
}
