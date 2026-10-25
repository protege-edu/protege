import { bad, requireTeacher } from "@/lib/teacher/api";
import { retryDraft } from "@/lib/teacher/lessons";

/** Draft again from the same notes (after a failure, or if the teacher wants a fresh version) */
export async function POST(_req: Request, ctx: RouteContext<"/api/teacher/lessons/[id]/retry">) {
  const denied = await requireTeacher();
  if (denied) return denied;
  return retryDraft((await ctx.params).id) ? Response.json({ ok: true }) : bad("We don't have the original notes for this lesson anymore. Start a new one.");
}
