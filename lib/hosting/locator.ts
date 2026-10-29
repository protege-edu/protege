/**
 * The join code students type on the website (protege-edu.pages.dev/j): the class code, plus a few letters
 * that hold the teacher's laptop's address on the school network, like GLOW-42-26RK.
 *
 * The website is the same for every school and has no server, so it can't look a class up anywhere. Instead
 * the code itself says where the laptop is: the website reads it and sends the student there. Nothing is
 * stored or sent anywhere, and it only works on the school's own network (like the laptop's address itself).
 *
 * Only addresses on a private network fit (192.168.x.x, 10.x.x.x, 172.16-31.x.x). They're packed into a
 * number, written with Crockford's base 32 (no I, L, O or U, so nothing looks like something else), with one
 * check letter at the end so a typo is caught instead of sending a student to the wrong address.
 * Plain code, no dependencies: the app (to show the code) and the website (to read it) share it.
 */

const DIGITS = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
/** Protégé's usual port: only a different one adds to the code */
const USUAL_PORT = 3000;
// the three private ranges: how many bits of the address change in each, and how to write it back
const RANGES = [
  { bits: 16, from: (n: number) => `192.168.${n >> 8}.${n & 255}` },
  { bits: 24, from: (n: number) => `10.${(n >> 16) & 255}.${(n >> 8) & 255}.${n & 255}` },
  { bits: 20, from: (n: number) => `172.${16 + ((n >> 16) & 15)}.${(n >> 8) & 255}.${n & 255}` },
] as const;

function rangeOf(ip: string): { kind: number; n: number } | null {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((x) => !Number.isInteger(x) || x < 0 || x > 255)) return null;
  if (p[0] === 192 && p[1] === 168) return { kind: 0, n: (p[2] << 8) | p[3] };
  if (p[0] === 10) return { kind: 1, n: (p[1] << 16) | (p[2] << 8) | p[3] };
  if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return { kind: 2, n: ((p[1] - 16) << 16) | (p[2] << 8) | p[3] };
  return null;
}

const check = (body: string) => DIGITS[[...body].reduce((sum, c, i) => sum + DIGITS.indexOf(c) * (i + 1), 0) % 32];

/** The laptop's part of the join code, or null if the address isn't on a private network */
export function encodeLocator(ip: string, port = USUAL_PORT): string | null {
  const r = rangeOf(ip);
  if (!r || !Number.isInteger(port) || port < 1 || port > 65535) return null;
  // (multiplying, not shifting: it can be more than 32 bits)
  let n = r.n;
  const odd = port !== USUAL_PORT;
  if (odd) n = n * 65536 + port;
  n = (n * 2 + (odd ? 1 : 0)) * 4 + r.kind;
  let body = "";
  do {
    body = DIGITS[n % 32] + body;
    n = Math.floor(n / 32);
  } while (n > 0);
  return body + check(body);
}

/** Back to the laptop's address, or null if it isn't one (a typo, a missing letter) */
export function decodeLocator(text: string): { host: string; port: number } | null {
  const s = text.toUpperCase().replace(/O/g, "0").replace(/[IL]/g, "1").replace(/U/g, "V");
  if (!/^[0-9A-Z]{2,12}$/.test(s) || [...s].some((c) => !DIGITS.includes(c))) return null;
  const body = s.slice(0, -1);
  if (check(body) !== s.at(-1)) return null;
  let n = [...body].reduce((v, c) => v * 32 + DIGITS.indexOf(c), 0);
  const kind = n % 4;
  n = Math.floor(n / 4);
  const odd = n % 2 === 1;
  n = Math.floor(n / 2);
  let port = USUAL_PORT;
  if (odd) {
    port = n % 65536;
    n = Math.floor(n / 65536);
  }
  const range = RANGES[kind];
  if (!range || n >= 2 ** range.bits || port < 1) return null;
  return { host: range.from(n), port };
}

/**
 * Read what a student typed: a class code (a word and two numbers) and the laptop's letters, written any
 * way ("glow 42 26rk", "GLOW-42-26RK", "glow4226rk"). `locator` is null when they only typed the class code.
 */
export function readJoinCode(typed: string): { classCode: string; locator: string | null } | null {
  const m = typed.toUpperCase().replace(/[^A-Z0-9]/g, "").match(/^([A-Z]+)(\d{2})([0-9A-Z]*)$/);
  if (!m) return null;
  return { classCode: `${m[1]}-${m[2]}`, locator: m[3] || null };
}

/** Where a typed join code sends the student, or why it can't */
export function joinTarget(typed: string): { url: string } | { problem: "unreadable" | "short" | "typo" } {
  const read = readJoinCode(typed);
  if (!read) return { problem: "unreadable" };
  if (!read.locator) return { problem: "short" };
  const at = decodeLocator(read.locator);
  if (!at) return { problem: "typo" };
  return { url: `http://${at.host}:${at.port}/join?code=${encodeURIComponent(read.classCode)}` };
}
