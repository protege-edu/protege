import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { forbidden, sameOrigin } from "@/lib/auth/request";
import { createSession, findSession, getSession } from "@/lib/companion/session";
import { db } from "@/lib/db/client";
import { classLessons } from "@/lib/db/schema";
import { DEFAULT_LESSON_ID } from "@/lib/lesson";
import { currentStudent } from "@/lib/student/auth";

/** Resume a session */
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  const session = id ? getSession(id) : null;
  if (!session) return Response.json({ error: "We couldn't find that session. Starting a fresh one is fine!" }, { status: 404 });
  return Response.json(session);
}

const Body = z.object({ lessonId: z.string().optional(), studentId: z.string().max(64).optional(), fresh: z.boolean().optional() });

/**
 * Start (or, for a signed-in student, pick up) a session.
 * A student in a class gets their own session for a lesson their class was given, on any Chromebook.
 * Without a class (this computer's practice student), it works like before.
 */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return forbidden();
  const body = Body.safeParse(await request.json().catch(() => ({})));
  const lessonId = body.success ? (body.data.lessonId ?? DEFAULT_LESSON_ID) : DEFAULT_LESSON_ID;
  try {
    const student = await currentStudent();
    const assigned = student && db.select().from(classLessons).where(and(eq(classLessons.classId, student.classId), eq(classLessons.lessonId, lessonId))).get();
    if (student && assigned) {
      const existing = body.success && body.data.fresh ? null : findSession(student.id, lessonId);
      return Response.json(existing ?? createSession(lessonId, student.id, student.classId));
    }
    // the browser's practice student, so their Gloam keeps growing across lessons
    return Response.json(createSession(lessonId, body.success ? body.data.studentId : undefined));
  } catch {
    // Not approved (or doesn't exist): students never see drafts
    return Response.json({ error: "This lesson isn't ready yet. Ask your teacher to approve it." }, { status: 404 });
  }
}
