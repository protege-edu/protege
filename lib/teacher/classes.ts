import "server-only";
import { randomUUID } from "node:crypto";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { classLessons, classes, conceptEvents, students, teachSessions } from "@/lib/db/schema";
import type { Level, LessonBlueprint } from "@/lib/lesson/types";

export type ClassRow = typeof classes.$inferSelect;

export function listClasses() {
  const rows = db.select().from(classes).orderBy(asc(classes.createdAt)).all();
  return rows.map((c) => ({
    ...c,
    students: db.select({ id: students.id }).from(students).where(eq(students.classId, c.id)).all().length,
    lessons: db.select({ id: classLessons.lessonId }).from(classLessons).where(eq(classLessons.classId, c.id)).all().map((r) => r.id),
  }));
}

export function getClass(id: string) {
  return db.select().from(classes).where(eq(classes.id, id)).get() ?? null;
}

export function createClass(name: string, grade: number) {
  const id = randomUUID();
  db.insert(classes).values({ id, name, grade, createdAt: new Date() }).run();
  return id;
}

export function assignLesson(classId: string, lessonId: string) {
  db.insert(classLessons).values({ classId, lessonId, assignedAt: new Date() }).onConflictDoNothing().run();
}

export interface StudentRow {
  id: string;
  nickname: string;
  understanding: Record<string, Level>;
  /** Ideas they've tried at least twice without it clicking */
  stuck: string[];
  messages: number;
  finished: boolean;
  lastActive: Date | null;
}

export interface Dashboard {
  students: StudentRow[];
  /** Sentences a teacher can act on: "7 of 12 students think …" */
  insights: { conceptId: string; count: number; total: number; text: string }[];
  /** How many students have each idea lit */
  litCount: Record<string, number>;
}

/**
 * Everything the teacher's live dashboard shows for one class and one lesson.
 * No grades, no percentages: candles, who's stuck, and what the class thinks.
 */
export function dashboard(classId: string, lesson: LessonBlueprint): Dashboard {
  const kids = db.select().from(students).where(eq(students.classId, classId)).orderBy(asc(students.nickname)).all();
  const sessions = kids.length
    ? db
        .select()
        .from(teachSessions)
        .where(and(eq(teachSessions.lessonId, lesson.id), inArray(teachSessions.studentId, kids.map((k) => k.id))))
        .all()
    : [];
  const sessionByStudent = new Map(sessions.map((s) => [s.studentId, s]));
  const events = sessions.length
    ? db.select().from(conceptEvents).where(inArray(conceptEvents.sessionId, sessions.map((s) => s.id))).all()
    : [];

  const rows: StudentRow[] = kids.map((k) => {
    const s = sessionByStudent.get(k.id);
    const mine = s ? events.filter((e) => e.sessionId === s.id) : [];
    const understanding = (s?.understanding ?? {}) as Record<string, Level>;
    const stuck = lesson.concepts
      .filter((c) => {
        const tries = mine.filter((e) => e.conceptId === c.id);
        return (understanding[c.id] ?? 0) < 3 && tries.length >= 2 && tries.slice(-2).every((e) => e.levelAfter === e.levelBefore);
      })
      .map((c) => c.id);
    return {
      id: k.id,
      nickname: k.nickname,
      understanding,
      stuck,
      messages: mine.length,
      finished: !!s?.finishedAt,
      lastActive: s?.updatedAt ?? null,
    };
  });

  // Misconceptions: students who explained an idea with the WRONG version at least once
  const total = rows.filter((r) => r.messages > 0).length;
  const insights = lesson.concepts
    .map((c) => {
      const who = new Set(events.filter((e) => e.conceptId === c.id && e.quality === "wrong").map((e) => e.sessionId));
      return { conceptId: c.id, count: who.size, total, text: c.misconception };
    })
    .filter((i) => i.count > 0)
    .sort((a, b) => b.count - a.count);

  const litCount = Object.fromEntries(lesson.concepts.map((c) => [c.id, rows.filter((r) => (r.understanding[c.id] ?? 0) === 3).length]));
  return { students: rows, insights, litCount };
}

/** One student's conversation, for the teacher to read */
export function studentSessionId(classId: string, studentId: string, lessonId: string) {
  return (
    db
      .select({ id: teachSessions.id })
      .from(teachSessions)
      .where(and(eq(teachSessions.studentId, studentId), eq(teachSessions.lessonId, lessonId), eq(teachSessions.classId, classId)))
      .get()?.id ?? null
  );
}
