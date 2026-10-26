import { notYours, requireTeacher } from "@/lib/teacher/api";
import { approveLesson, canSee, getLessonRow } from "@/lib/teacher/lessons";

/** Approve a lesson so students can see it. Refused if any check fails. */
export async function POST(request: Request, ctx: RouteContext<"/api/teacher/lessons/[id]/approve">) {
  const me = await requireTeacher(request);
  if (me instanceof Response) return me;
  const { id } = await ctx.params;
  const row = getLessonRow(id);
  if (!row || !canSee(row, me.id)) return notYours();
  const result = approveLesson(id);
  if (!result.ok) return Response.json({ error: "Fix these first:", problems: result.problems }, { status: 400 });
  return Response.json({ ok: true });
}
