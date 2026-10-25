import { z } from "zod";
import { bad, requireTeacher } from "@/lib/teacher/api";
import { assignLesson, dashboard, getClass } from "@/lib/teacher/classes";
import { getApprovedLesson } from "@/lib/teacher/lessons";

/** The live dashboard for one class and one lesson: ?lesson=<id> */
export async function GET(request: Request, ctx: RouteContext<"/api/teacher/classes/[id]">) {
  const denied = await requireTeacher();
  if (denied) return denied;
  const { id } = await ctx.params;
  const cls = getClass(id);
  if (!cls) return bad("We couldn't find that class.", 404);
  const lessonId = new URL(request.url).searchParams.get("lesson");
  const lesson = lessonId ? getApprovedLesson(lessonId) : null;
  if (!lesson) return bad("Pick an approved lesson to see the dashboard.", 404);
  return Response.json({
    class: cls,
    lesson: { id: lesson.id, title: lesson.title, concepts: lesson.concepts.map((c) => ({ id: c.id, name: c.name, misconception: c.misconception })) },
    ...dashboard(id, lesson),
  });
}

const Assign = z.object({ lessonId: z.string() });

/** Give a class an approved lesson */
export async function POST(request: Request, ctx: RouteContext<"/api/teacher/classes/[id]">) {
  const denied = await requireTeacher();
  if (denied) return denied;
  const { id } = await ctx.params;
  const body = Assign.safeParse(await request.json().catch(() => null));
  if (!body.success || !getApprovedLesson(body.data.lessonId)) return bad("Only approved lessons can be given to a class.");
  assignLesson(id, body.data.lessonId);
  return Response.json({ ok: true });
}
