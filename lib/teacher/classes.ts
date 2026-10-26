import "server-only";
import { randomInt, randomUUID } from "node:crypto";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { classLessons, classes, conceptEvents, gloams, messages, students, teachSessions } from "@/lib/db/schema";
import type { Level, LessonBlueprint } from "@/lib/lesson/types";

export type ClassRow = typeof classes.$inferSelect;

// Join codes: a short word and two numbers, like GLOW-42. Easy to read off a projector and say out loud.
// (40 words x 90 numbers = 3600 codes; wrong guesses are rate-limited in app/api/join)
const WORDS = [
  "GLOW", "MOSS", "FERN", "MOTH", "STAR", "LAMP", "WICK", "OWL", "PINE", "MIST", "DUSK", "LEAF", "BEAM", "RAIN", "WAVE", "SEED", "HILL", "COVE", "REED", "ECHO",
  "OAK", "BAY", "SKY", "DEW", "FOX", "ELM", "BRIM", "CLAY", "DUNE", "FAWN", "GALE", "HAZE", "KITE", "LARK", "MAPLE", "NEST", "PEAK", "ROOK", "TIDE", "WREN",
];

export function newClassCode(): string {
  for (;;) {
    const code = `${WORDS[randomInt(WORDS.length)]}-${randomInt(10, 100)}`;
    if (!db.select({ id: classes.id }).from(classes).where(eq(classes.code, code)).get()) return code;
  }
}

/** Make the code look like ours, whatever a student typed ("glow 42", "Glow-42 ") */
export function normalizeCode(raw: string): string {
  const m = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").match(/^([A-Z]+)(\d+)$/);
  return m ? `${m[1]}-${m[2]}` : raw.toUpperCase().trim();
}

export function classByCode(raw: string) {
  return db.select().from(classes).where(eq(classes.code, normalizeCode(raw))).get() ?? null;
}

export function listClasses(teacherId: string) {
  const rows = db.select().from(classes).where(eq(classes.teacherId, teacherId)).orderBy(asc(classes.createdAt)).all();
  // classes made before codes existed get one now
  for (const c of rows) if (!c.code) db.update(classes).set({ code: (c.code = newClassCode()) }).where(eq(classes.id, c.id)).run();
  return rows.map((c) => ({
    ...c,
    students: db.select({ id: students.id }).from(students).where(eq(students.classId, c.id)).all().length,
    lessons: db.select({ id: classLessons.lessonId }).from(classLessons).where(eq(classLessons.classId, c.id)).all().map((r) => r.id),
  }));
}

/** A class, only if it belongs to this teacher */
export function getClass(id: string, teacherId: string) {
  const c = db.select().from(classes).where(eq(classes.id, id)).get();
  if (!c || c.teacherId !== teacherId) return null;
  if (!c.code) db.update(classes).set({ code: (c.code = newClassCode()) }).where(eq(classes.id, c.id)).run();
  return c;
}

export function createClass(name: string, grade: number, teacherId: string) {
  const id = randomUUID();
  db.insert(classes).values({ id, name, grade, teacherId, code: newClassCode(), createdAt: new Date() }).run();
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
  /** on Protégé right now (seen in the last 90 seconds) */
  online: boolean;
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
      online: !!k.lastSeenAt && Date.now() - k.lastSeenAt.getTime() < 90_000,
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

/** Remove a student from a class, with everything they did (sessions, messages, candle history, their Gloam) */
export function removeStudent(classId: string, studentId: string) {
  const kid = db.select().from(students).where(and(eq(students.id, studentId), eq(students.classId, classId))).get();
  if (!kid) return;
  db.transaction((tx) => {
    const sessions = tx.select({ id: teachSessions.id }).from(teachSessions).where(eq(teachSessions.studentId, studentId)).all().map((s) => s.id);
    if (sessions.length) {
      tx.delete(conceptEvents).where(inArray(conceptEvents.sessionId, sessions)).run();
      tx.delete(messages).where(inArray(messages.sessionId, sessions)).run();
      tx.delete(teachSessions).where(inArray(teachSessions.id, sessions)).run();
    }
    tx.delete(gloams).where(eq(gloams.studentId, studentId)).run();
    tx.delete(students).where(eq(students.id, studentId)).run();
  });
}
