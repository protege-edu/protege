import { z } from "zod";
import { createSession, getSession } from "@/lib/companion/session";
import { DEFAULT_LESSON_ID } from "@/lib/lesson";

/** Resume a session */
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  const session = id ? getSession(id) : null;
  if (!session) return Response.json({ error: "We couldn't find that session. Starting a fresh one is fine!" }, { status: 404 });
  return Response.json(session);
}

const Body = z.object({ lessonId: z.string().optional(), studentId: z.string().max(64).optional() });

/** Start a new session */
export async function POST(request: Request) {
  const body = Body.safeParse(await request.json().catch(() => ({})));
  const lessonId = body.success ? (body.data.lessonId ?? DEFAULT_LESSON_ID) : DEFAULT_LESSON_ID;
  try {
    // the browser's practice student, so their Gloam keeps growing across lessons
    return Response.json(createSession(lessonId, body.success ? body.data.studentId : undefined));
  } catch {
    // Not approved (or doesn't exist): students never see drafts
    return Response.json({ error: "This lesson isn't ready yet. Ask your teacher to approve it." }, { status: 404 });
  }
}
