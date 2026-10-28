import { bad, notYours, requireTeacher } from "@/lib/teacher/api";
import { canSee, getLessonRow } from "@/lib/teacher/lessons";
import { draftSooner } from "@/lib/teacher/units";

/** A lesson waiting its turn in a unit: draft it next */
export async function POST(request: Request, ctx: RouteContext<"/api/teacher/lessons/[id]/sooner">) {
  const me = await requireTeacher(request);
  if (me instanceof Response) return me;
  const { id } = await ctx.params;
  const row = getLessonRow(id);
  if (!row || !canSee(row, me.id)) return notYours();
  if (row.status !== "queued") return bad("That lesson isn't waiting to be drafted.");
  draftSooner(id);
  return Response.json({ ok: true });
}
