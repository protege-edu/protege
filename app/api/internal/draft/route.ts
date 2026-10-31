import { fromOurWorker } from "@/lib/auth/internal";
import { draftNow } from "@/lib/teacher/drafting";

/** The drafting queue hands a lesson here (worker.ts). Answers when the draft is done, either way. */
export async function POST(request: Request) {
  if (!(await fromOurWorker(request))) return new Response(null, { status: 404 });
  const body = (await request.json().catch(() => null)) as { lessonId?: unknown } | null;
  if (typeof body?.lessonId !== "string") return new Response(null, { status: 400 });
  await draftNow(body.lessonId);
  return Response.json({ ok: true });
}
