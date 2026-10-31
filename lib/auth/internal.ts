import "server-only";
import { timingSafeEqual } from "node:crypto";
import { secret } from "./crypto";

/**
 * Is this request from Protégé's own Worker (worker.ts: the drafting queue, the daily clean-up)?
 * It carries the app's secret, which never leaves the server. Anyone else gets "not found".
 */
export async function fromOurWorker(request: Request): Promise<boolean> {
  const sent = request.headers.get("x-protege-internal") ?? "";
  const want = await secret();
  return sent.length === want.length && timingSafeEqual(Buffer.from(sent), Buffer.from(want));
}
