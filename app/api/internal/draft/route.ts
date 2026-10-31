import { after } from "next/server";
import { fromOurselves } from "@/lib/auth/internal";
import { draftNow } from "@/lib/teacher/drafting";

// one lesson's draft takes about 40 seconds: this request may keep working for up to 5 minutes
export const maxDuration = 300;

/** Protégé asks itself to draft one lesson (lib/teacher/drafting.ts). Answers at once; drafts afterwards. */
export async function POST(request: Request) {
  if (!(await fromOurselves(request))) return new Response(null, { status: 404 });
  const body = (await request.json().catch(() => null)) as { lessonId?: unknown } | null;
  if (typeof body?.lessonId !== "string") return new Response(null, { status: 400 });
  const lessonId = body.lessonId;
  after(() => draftNow(lessonId).catch((err) => console.error("[draft]", err)));
  return Response.json({ ok: true }, { status: 202 });
}
