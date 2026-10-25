import { requireTeacher } from "@/lib/teacher/api";
import { approveLesson } from "@/lib/teacher/lessons";

/** Approve a lesson so students can see it. Refused if any check fails. */
export async function POST(_req: Request, ctx: RouteContext<"/api/teacher/lessons/[id]/approve">) {
  const denied = await requireTeacher();
  if (denied) return denied;
  const result = approveLesson((await ctx.params).id);
  if (!result.ok) return Response.json({ error: "Fix these first:", problems: result.problems }, { status: 400 });
  return Response.json({ ok: true });
}
