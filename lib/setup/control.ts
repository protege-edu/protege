import "server-only";
import crypto from "node:crypto";
import type { SetupState } from "./types";

/**
 * The setup page talks to the launcher (scripts/lib/setup.ts) through here. The launcher gives Protégé's
 * server two secrets when it starts it:
 *   PROTEGE_SETUP_KEY:     the setup page has it (in the address the launcher opened, after #), which proves
 *                          the page was opened on this computer by whoever started Protégé
 *   PROTEGE_CONTROL_TOKEN: only the server has it, to reach the launcher at PROTEGE_CONTROL (127.0.0.1)
 * Run from the code (npm run dev / class), there's no launcher, so there's no setup page.
 */
const env = () => ({ key: process.env.PROTEGE_SETUP_KEY, control: process.env.PROTEGE_CONTROL, token: process.env.PROTEGE_CONTROL_TOKEN });

export function setupAvailable(): boolean {
  const e = env();
  return !!(e.key && e.control && e.token);
}

/** Did this request come from the setup page the launcher opened? */
export function setupKeyOk(request: Request): boolean {
  const want = env().key;
  const given = request.headers.get("x-setup-key");
  if (!want || !given) return false;
  const [a, b] = [Buffer.from(given), Buffer.from(want)];
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Ask the launcher something (its state, or to do something) */
export async function launcher(path: "/state" | "/voices" | "/retry" | "/stop", body?: unknown): Promise<SetupState | null> {
  const e = env();
  if (!e.control || !e.token) return null;
  try {
    const res = await fetch(`${e.control}${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: { authorization: `Bearer ${e.token}`, "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(3000),
    });
    return res.ok ? ((await res.json()) as SetupState) : null;
  } catch {
    return null;
  }
}
