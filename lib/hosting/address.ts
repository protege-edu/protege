import "server-only";
import os from "node:os";
import { encodeLocator } from "./locator";
import { currentTunnel } from "./tunnel";

/**
 * The public website, where students type their join code (/j). One setting: a school that runs its own
 * copy of the website points this at it.
 */
export const SITE_URL = (process.env.PROTEGE_SITE_URL ?? "https://protege-edu.pages.dev").replace(/\/$/, "");

/**
 * Where students should go: the ONE place hosting is decided (see README, "Putting Protégé online").
 *   1. PUBLIC_URL (a fixed https address, e.g. the school's own tunnel), if set
 *   1b. the quick tunnel "Start Protégé online" opened, while it's running (lib/hosting/tunnel.ts)
 *   2. the address the teacher is using, unless it's "localhost" (students can't reach that)
 *   3. this laptop's address on the school network (works when everyone's on the same Wi-Fi)
 * When it's an address on the school network, `locator` is the laptop's part of the join code, so students
 * can go to the website (SITE_URL/j) and type one code instead of this address (lib/hosting/locator.ts).
 */
export function studentAddress(request: Request): { url: string; local: boolean; locator: string | null; site: string } {
  const at = where(request);
  const m = at.url.match(/^http:\/\/(\d+\.\d+\.\d+\.\d+)(?::(\d+))?$/);
  return { ...at, locator: m ? encodeLocator(m[1], m[2] ? Number(m[2]) : 80) : null, site: SITE_URL };
}

function where(request: Request): { url: string; local: boolean } {
  if (process.env.PUBLIC_URL) return { url: process.env.PUBLIC_URL.replace(/\/$/, ""), local: false };
  const online = currentTunnel();
  if (online) return { url: online, local: false };
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "localhost:3000";
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  const [name, port] = host.split(":");
  if (!["localhost", "127.0.0.1", "[::1]"].includes(name)) return { url: `${proto}://${host}`, local: false };
  const lan = Object.values(os.networkInterfaces())
    .flat()
    .find((i) => i && i.family === "IPv4" && !i.internal && /^(10|172\.(1[6-9]|2\d|3[01])|192\.168)\./.test(i.address));
  return lan ? { url: `http://${lan.address}${port ? `:${port}` : ""}`, local: true } : { url: `http://${host}`, local: true };
}
