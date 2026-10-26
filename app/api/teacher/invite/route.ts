import { limit, tooMany } from "@/lib/auth/request";
import { requireTeacher } from "@/lib/teacher/api";
import { makeInvite } from "@/lib/teacher/auth";

/** A signed-in teacher makes a one-use invite code for a colleague (lasts 7 days) */
export async function POST(request: Request) {
  const me = await requireTeacher(request);
  if (me instanceof Response) return me;
  if (!limit(`invite:${me.id}`, 10, 60 * 60 * 1000)) return tooMany();
  const { code, expires } = makeInvite();
  return Response.json({ code, expires });
}
