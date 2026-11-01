import { z } from "zod";
import { forbidden, limit, sameOrigin, tooMany } from "@/lib/auth/request";
import { STASH } from "@/lib/game/stash";
import { buy, place, stashOf } from "@/lib/student/stash";
import { currentStudent } from "@/lib/student/auth";

const ids = STASH.map((s) => s.id) as [string, ...string[]];
const Change = z.union([z.object({ buy: z.enum(ids) }), z.object({ place: z.enum(ids), on: z.boolean() })]);

/** Gloam's stash: what this student has, and their jar */
export async function GET() {
  const me = await currentStudent();
  if (!me) return Response.json({ error: "Join your class first." }, { status: 401 });
  return Response.json({ stash: await stashOf(me.id) });
}

/** Buy something for Gloam's home with fireflies, or put something out or away */
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
  return Response.json({ stash: await place(me.id, body.data.place, body.data.on) });
}
