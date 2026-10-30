// Cloudflare Pages Function: GET /api/room/K7Q2. The join page (/j) asks where a room's class is.
// (Everything a room is and keeps is in site/room.ts.)
import { findRoom, type RoomStore } from "../../../site/room";

interface Env {
  ROOMS?: RoomStore;
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export const onRequestGet = async ({ env, params }: { env: Env; params: { code?: string | string[] } }) => {
  if (!env.ROOMS) return json({ error: "Rooms aren't set up on this website yet." }, 503);
  const code = Array.isArray(params.code) ? params.code[0] : params.code;
  const found = await findRoom(env.ROOMS, code ?? "", fetch);
  return found ? json(found) : json({ error: "No such room." }, 404);
};
