import { z } from "zod";
import { forbidden, limit, sameOrigin, tooMany } from "@/lib/auth/request";
import { OUTFIT_SHOP, STASH } from "@/lib/game/stash";
import { buy, dress, place, stashOf } from "@/lib/student/stash";
import { currentStudent } from "@/lib/student/auth";

const ids = STASH.map((s) => s.id) as [string, ...string[]];
const outfits = OUTFIT_SHOP.map((o) => o.id) as [string, ...string[]];
const Change = z.union([z.object({ buy: z.enum([...ids, ...outfits] as [string, ...string[]]) }), z.object({ place: z.enum(ids), on: z.boolean() }), z.object({ wear: z.enum(outfits), on: z.boolean() })]);

/** Gloam's stash: what this student has, and their jar */
export async function GET() {
  const me = await currentStudent();
  if (!me) return Response.json({ error: "Join your class first." }, { status: 401 });
  return Response.json({ stash: await stashOf(me.id) });
}

/** Buy something for Gloam's home (or for Gloam to wear) with fireflies, put something out or away, or dress Gloam */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return forbidden();
  const me = await currentStudent();
  if (!me) return Response.json({ error: "Join your class first." }, { status: 401 });
  if (!limit(`stash:${me.id}`, 30, 60 * 1000)) return tooMany();
  const body = Change.safeParse(await request.json().catch(() => null));
  if (!body.success) return Response.json({ error: "That didn't make sense. Reload the page and try again." }, { status: 400 });
  if ("buy" in body.data) {
    const r = await buy(me.id, body.data.buy);
    return r.ok ? Response.json({ stash: r.stash }) : Response.json({ error: r.error }, { status: 409 });
  }
  if ("wear" in body.data) return Response.json({ stash: await dress(me.id, body.data.wear, body.data.on) });
  return Response.json({ stash: await place(me.id, body.data.place, body.data.on) });
}
