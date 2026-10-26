import { limit, tooMany } from "@/lib/auth/request";
import { bad, notYours, requireTeacher } from "@/lib/teacher/api";
import { canSee, getLessonRow, retryDraft } from "@/lib/teacher/lessons";

/** Draft again from the same notes (after a failure, or if the teacher wants a fresh version) */
export async function POST(request: Request, ctx: RouteContext<"/api/teacher/lessons/[id]/retry">) {
  const me = await requireTeacher(request);
  if (me instanceof Response) return me;
  if (!limit(`draft:${me.id}`, 12, 60 * 60 * 1000)) return tooMany();
  const { id } = await ctx.params;
  const row = getLessonRow(id);
  if (!row || !canSee(row, me.id)) return notYours();
  return retryDraft(id) ? Response.json({ ok: true }) : bad("We don't have the original notes for this lesson anymore. Start a new one.");
}
