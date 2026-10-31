import { logAccess } from "@/lib/privacy/log";
import { bad, notYours, requireTeacher } from "@/lib/teacher/api";
import { getClass, progressCsv } from "@/lib/teacher/classes";
import { canSee, getApprovedLesson, getLessonRow } from "@/lib/teacher/lessons";

/** Download a class's progress in one lesson as a spreadsheet: ?lesson=<id>. Nicknames only. */
export async function GET(request: Request, ctx: RouteContext<"/api/teacher/classes/[id]/export">) {
  const me = await requireTeacher(request);
  if (me instanceof Response) return me;
  const { id } = await ctx.params;
  const cls = await getClass(id, me.id);
  if (!cls) return notYours();
  const lessonId = new URL(request.url).searchParams.get("lesson") ?? "";
  const row = await getLessonRow(lessonId);
  const lesson = row && canSee(row, me.id) ? await getApprovedLesson(lessonId) : null;
  if (!lesson) return bad("Pick a lesson first.", 404);
  const name = `${cls.name} - ${lesson.title}`.replace(/[^\p{L}\p{N} ._-]+/gu, "").slice(0, 80) || "class";
  await logAccess(me.id, "downloaded-class-progress", { classId: id });
  // the byte-order mark tells Excel it's UTF-8 (so accents in names and ideas come through)
  return new Response("\uFEFF" + await progressCsv(id, lesson), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="progress.csv"; filename*=UTF-8''${encodeURIComponent(name)}.csv`,
    },
  });
}
