import "server-only";
import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { classes, gloams, messages, students, teachSessions } from "@/lib/db/schema";
import { getApprovedLesson } from "@/lib/teacher/lessons";
import { studentAccessParts } from "@/lib/student/access";

const LEVELS = ["not yet", "a spark", "flickering", "lit"];

/**
 * Everything Protégé holds about one student, in plain words: for a student's or family's request to see
 * their information (MFIPPA, GDPR and others give them that right). The teacher downloads it from the class page.
 * The secret picture key is never included: it's only stored scrambled, and can't be turned back into pictures.
 */
export async function studentExport(studentId: string) {
  const s = await db.select().from(students).where(eq(students.id, studentId)).get();
  if (!s) return null;
  const c = s.classId ? await db.select().from(classes).where(eq(classes.id, s.classId)).get() : null;
  const g = await db.select().from(gloams).where(eq(gloams.studentId, studentId)).get();
  const sessions = await db.select().from(teachSessions).where(eq(teachSessions.studentId, studentId)).orderBy(asc(teachSessions.createdAt)).all();
  const said = sessions.length
    ? await db
        .select()
        .from(messages)
        .where(
          inArray(
            messages.sessionId,
            sessions.map((x) => x.id),
          ),
        )
        .orderBy(asc(messages.id))
        .all()
    : [];
  const access = await studentAccessParts(studentId);
  return {
    about: "Everything Protégé stores about this student. Made by their teacher on request.",
    madeOn: new Date().toISOString(),
    student: {
      nickname: s.nickname,
      class: c?.name ?? null,
      joined: s.createdAt.toISOString(),
      lastSeen: s.lastSeenAt?.toISOString() ?? null,
      signsInWith: s.googleIdHash ? "Google (only a scrambled account number is stored: no name, email or photo)" : "secret pictures (stored scrambled, can't be read back)",
      waysToPlay: { theirOwnChoices: access.own ?? "none", switchedOnByTheirTeacher: access.accommodations ?? "none" },
      gloam: { ideasTaught: g?.light ?? 0, lessonsFinished: g?.lessons ?? 0 },
    },
    lessons: await Promise.all(
      sessions.map(async (x) => {
        const lesson = await getApprovedLesson(x.lessonId);
        return {
          lesson: lesson?.title ?? x.lessonId,
          started: x.createdAt.toISOString(),
          finished: x.finishedAt?.toISOString() ?? null,
          ideas: (lesson?.concepts ?? []).map((k) => ({ idea: k.name, howFar: LEVELS[x.understanding[k.id] ?? 0] })),
          conversation: said.filter((m) => m.sessionId === x.id).map((m) => ({ who: m.from === "student" ? s.nickname : "Gloam", said: m.text, at: m.createdAt.toISOString() })),
        };
      }),
    ),
  };
}
