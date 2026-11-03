import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { forbidden, sameOrigin } from "@/lib/auth/request";
import { createSession, findSession, forBrowser, getSession } from "@/lib/companion/session";
import { db } from "@/lib/db/client";
import { classLessons } from "@/lib/db/schema";
import { DEFAULT_LESSON_ID } from "@/lib/lesson";
import { currentStudent, maySeeStudent } from "@/lib/student/auth";
import { gameOn } from "@/lib/game/config";
import { classBossView } from "@/lib/game/class-boss";
import { classBossOf } from "@/lib/student/class-boss";
import type { SessionState } from "@/lib/companion/session";

/** The session for the browser, with the class's boss if the teacher has one on the projector */
async function withClassBoss(session: SessionState) {
  const boss = session.classId && (await gameOn(session.classId)) ? await classBossOf(session.classId) : null;
  return { ...forBrowser(session), classBoss: boss ? classBossView(boss) : null };
}

/** Resume a session */
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  const session = id ? await getSession(id) : null;
  // someone else's session (e.g. the last student on this Chromebook), or one from practising before joining a
  // class: a student in a class only ever continues their own (so their teacher sees it). The browser then asks
  // for theirs.
  const me = await currentStudent();
  if (!session || !(await maySeeStudent(session.studentId)) || (me && session.studentId !== me.id)) return Response.json({ error: "We couldn't find that session. Starting a fresh one is fine!" }, { status: 404 });
  return Response.json(await withClassBoss(session));
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
    const assigned = student && await db.select().from(classLessons).where(and(eq(classLessons.classId, student.classId), eq(classLessons.lessonId, lessonId))).get();
    if (student && assigned) {
      const existing = body.success && body.data.fresh ? null : await findSession(student.id, lessonId);
      return Response.json(await withClassBoss(existing ?? (await createSession(lessonId, student.id, student.classId))));
    }
    // the browser's practice student, so their Gloam keeps growing across lessons
    return Response.json(forBrowser(await createSession(lessonId, body.success ? body.data.studentId : undefined)));
  } catch {
    // Not approved (or doesn't exist): students never see drafts
    return Response.json({ error: "This lesson isn't ready yet. Ask your teacher to approve it." }, { status: 404 });
  }
}
