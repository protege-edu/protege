import "server-only";

/**
 * Small checks every changing request goes through, so Protégé is safe on the open internet:
 *   sameOrigin: the request came from Protégé's own pages (not another website pretending to be you)
 *   clientIp:   who's asking (for rate limits), through the tunnel's forwarding headers
 *   limit:      too many tries from one place in a short time get a friendly "slow down"
 */

export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0] ?? request.headers.get("x-real-ip") ?? "local").trim();
}

export function sameOrigin(request: Request): boolean {
  if (request.method === "GET" || request.method === "HEAD") return true;
  const origin = request.headers.get("origin");
  if (!origin) return true; // same-origin fetches from older browsers may leave it out; cookies are SameSite=Lax anyway
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** Is this request coming over https (through the tunnel)? Then cookies are marked Secure. */
export function isHttps(request?: Request): boolean {
  if (!request) return process.env.PUBLIC_URL?.startsWith("https://") ?? false;
  return request.headers.get("x-forwarded-proto") === "https" || request.url.startsWith("https://");
}

// ---- rate limits: a few buckets kept in memory (one Protégé server per classroom laptop) ----
const store = globalThis as unknown as { protegeLimits?: Map<string, { count: number; reset: number }> };
const buckets = (store.protegeLimits ??= new Map());
// expired counters are forgotten every few minutes (they hold network addresses: never kept longer than needed)
const sweeper = globalThis as unknown as { protegeLimitSweep?: boolean };
if (!sweeper.protegeLimitSweep && typeof setInterval === "function") {
  sweeper.protegeLimitSweep = true;
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
  }, 5 * 60 * 1000).unref?.();
}

/** true = allowed. `max` tries per `windowMs` for this key (e.g. "signin:<ip>"). */
export function limit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    if (buckets.size > 5000) for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
    return true;
  }
  b.count++;
  return b.count <= max;
}

/** Strikes: only failures count (a whole class behind one school address all typing the RIGHT code is fine) */
export function struckOut(key: string, max: number): boolean {
  const b = buckets.get(key);
  return !!b && b.reset >= Date.now() && b.count >= max;
}
export const strike = (key: string, windowMs: number) => void limit(key, Number.MAX_SAFE_INTEGER, windowMs);

export const tooMany = () => Response.json({ error: "That's a lot of tries in a short time. Wait a minute, then try again." }, { status: 429 });
export const forbidden = () => Response.json({ error: "That request didn't come from Protégé. Reload the page and try again." }, { status: 403 });
