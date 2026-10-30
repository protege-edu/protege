// Cloudflare Pages Function: POST /api/room. "Start Protégé online" tells the website where its room is now.
// (Everything a room is and keeps is in site/room.ts.)
import { openRoom, type RoomStore } from "../../../site/room";

interface Env {
  /** the KV namespace bound to this Pages project as ROOMS (Cloudflare dashboard, see the README) */
  ROOMS?: RoomStore;
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  if (!env.ROOMS) return json({ error: "Rooms aren't set up on this website yet." }, 503);
  const r = await openRoom(env.ROOMS, await request.json().catch(() => null));
  return "error" in r ? json({ error: r.error }, r.status) : json(r);
};
