import "server-only";
import os from "node:os";

/**
 * Where students should go: the ONE place hosting is decided (see README, "Putting Protégé online").
 *   1. PUBLIC_URL (the tunnel's https address), if set
 *   2. the address the teacher is using, unless it's "localhost" (students can't reach that)
 *   3. this laptop's address on the school network (works when everyone's on the same Wi-Fi)
 */
export function studentAddress(request: Request): { url: string; local: boolean } {
  if (process.env.PUBLIC_URL) return { url: process.env.PUBLIC_URL.replace(/\/$/, ""), local: false };
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "localhost:3000";
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  const [name, port] = host.split(":");
  if (!["localhost", "127.0.0.1", "[::1]"].includes(name)) return { url: `${proto}://${host}`, local: false };
  const lan = Object.values(os.networkInterfaces())
    .flat()
    .find((i) => i && i.family === "IPv4" && !i.internal && /^(10|172\.(1[6-9]|2\d|3[01])|192\.168)\./.test(i.address));
  return lan ? { url: `http://${lan.address}${port ? `:${port}` : ""}`, local: true } : { url: `http://${host}`, local: true };
}
