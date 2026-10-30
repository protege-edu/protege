import "server-only";
import os from "node:os";
import { encodeLocator } from "./locator";
import { SITE_URL } from "./site";
import { currentTunnel } from "./tunnel";

export { SITE_URL };

/**
 * Where students should go: the ONE place hosting is decided (see README, "Putting Protégé online").
 *   1. PUBLIC_URL (a fixed https address, e.g. the school's own tunnel), if set
 *   1b. the quick tunnel "Start Protégé online" opened, while it's running (lib/hosting/tunnel.ts)
 *   2. the address the teacher is using, unless it's "localhost" (students can't reach that)
 *   3. this laptop's address on the school network (works when everyone's on the same Wi-Fi)
 * `locator` is the end of the join code students type on the website (SITE_URL/j): online, the laptop's room
 * there (site/room.ts); on the school network, the laptop's address packed into letters (lib/hosting/locator.ts).
 */
export function studentAddress(request: Request): { url: string; local: boolean; locator: string | null; site: string } {
  const { room, ...at } = where(request);
  const m = at.url.match(/^http:\/\/(\d+\.\d+\.\d+\.\d+)(?::(\d+))?$/);
  // online with a room on the website, or on the school network: either way, one short code on our website
  return { ...at, locator: room ?? (m ? encodeLocator(m[1], m[2] ? Number(m[2]) : 80) : null), site: SITE_URL };
}

function where(request: Request): { url: string; local: boolean; room?: string | null } {
  if (process.env.PUBLIC_URL) return { url: process.env.PUBLIC_URL.replace(/\/$/, ""), local: false };
  const online = currentTunnel();
  if (online) return { url: online.url, local: false, room: online.room };
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "localhost:3000";
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  const [name, port] = host.split(":");
  if (!["localhost", "127.0.0.1", "[::1]"].includes(name)) return { url: `${proto}://${host}`, local: false };
  const lan = Object.values(os.networkInterfaces())
    .flat()
    .find((i) => i && i.family === "IPv4" && !i.internal && /^(10|172\.(1[6-9]|2\d|3[01])|192\.168)\./.test(i.address));
  return lan ? { url: `http://${lan.address}${port ? `:${port}` : ""}`, local: true } : { url: `http://${host}`, local: true };
}
