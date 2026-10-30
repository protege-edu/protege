// (a relative import: Cloudflare builds the Pages Functions without this project's "@/" shortcut)
import { decodeLocator, normalizeLetters } from "../lib/hosting/locator";

/**
 * Rooms: the website's tiny lookup, so students go to protege-edu.pages.dev/j and type GLOW-42-K7Q2 even when
 * the class is online (a Cloudflare quick tunnel, whose address is random and new every time).
 *
 *   - "Start Protégé online" opens the tunnel, then tells the website "my room is at this address". A laptop
 *     keeps the same room (it holds a secret for it), so its link stays the same every class.
 *   - A student's code ends with the room; the website looks it up and, if that laptop is answering right
 *     now, sends them there. If not: "your class isn't open right now".
 *
 * A room holds ONLY its tunnel address (and a hash of its secret), and is forgotten after 90 days unused.
 * No names, nicknames or anything students type ever come here. Plain code (no Cloudflare types), so the
 * Pages Functions (functions/api/room) and the tests (scripts/check-logic.ts) share it.
 */

export interface RoomStore {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
}

interface Room {
  url: string;
  /** sha-256 of the laptop's secret for this room */
  key: string;
}

const DIGITS = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const KEEP = 90 * 24 * 60 * 60;
/** only ever a Cloudflare quick tunnel: a room can't send students anywhere else */
const TUNNEL = /^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/;
const ROOM = /^[0-9A-HJKMNP-TV-Z]{4}$/;

const hash = async (s: string) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)))].map((b) => b.toString(16).padStart(2, "0")).join("");
const pick = (n: number) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => DIGITS[b % 32]).join("");

/** A room code is never also a valid school-network code (lib/hosting/locator.ts), so the two can't be confused */
const usable = (room: string) => ROOM.test(room) && decodeLocator(room) === null;

export async function openRoom(store: RoomStore, body: unknown): Promise<{ room: string; secret: string } | { error: string; status: number }> {
  const b = (body ?? {}) as { url?: unknown; room?: unknown; secret?: unknown };
  if (typeof b.url !== "string" || !TUNNEL.test(b.url)) return { error: "That isn't a Protégé tunnel address.", status: 400 };
  const url = b.url;
  // the laptop's room, if it still holds its secret
  if (typeof b.room === "string" && typeof b.secret === "string" && usable(b.room) && b.secret.length >= 24) {
    const had = await store.get(b.room);
    const mine = had ? (JSON.parse(had) as Room).key === (await hash(b.secret)) : true;
    if (mine) {
      await store.put(b.room, JSON.stringify({ url, key: await hash(b.secret) } satisfies Room), { expirationTtl: KEEP });
      return { room: b.room, secret: b.secret };
    }
  }
  // a new room (and a new secret only that laptop knows)
  for (let i = 0; i < 20; i++) {
    const room = pick(4);
    if (!usable(room) || (await store.get(room))) continue;
    const secret = pick(32);
    await store.put(room, JSON.stringify({ url, key: await hash(secret) } satisfies Room), { expirationTtl: KEEP });
    return { room, secret };
  }
  return { error: "No free room right now. Try again.", status: 503 };
}

/**
 * Where a room's class is, only if that laptop is answering right now (otherwise it's closed: Protégé isn't
 * running online). `ask` is fetch (passed in so tests can stand in for the laptop).
 */
export async function findRoom(store: RoomStore, typed: string, ask: typeof fetch): Promise<{ url: string } | { closed: true } | null> {
  const room = normalizeLetters(typed);
  if (!ROOM.test(room)) return null;
  const had = await store.get(room);
  if (!had) return null;
  const { url } = JSON.parse(had) as Room;
  const up = await ask(`${url}/api/health`, { signal: AbortSignal.timeout(5000) }).then(
    (r) => r.ok,
    () => false,
  );
  return up ? { url } : { closed: true };
}
