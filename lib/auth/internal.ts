import "server-only";
import { timingSafeEqual } from "node:crypto";
import { secret } from "./crypto";

/**
 * Is this request from Protégé itself (lib/teacher/drafting.ts asking for a lesson to be drafted)?
 * It carries the app's secret, which never leaves the server. Anyone else gets "not found".
 */
export async function fromOurselves(request: Request): Promise<boolean> {
  const sent = request.headers.get("x-protege-internal") ?? "";
  const want = await secret();
  return sent.length === want.length && timingSafeEqual(Buffer.from(sent), Buffer.from(want));
}
