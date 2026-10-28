import "server-only";
import { randomInt, randomUUID } from "node:crypto";
import { and, asc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { classLessons, classes, conceptEvents, gloams, messages, students, teachSessions } from "@/lib/db/schema";
import type { Level, LessonBlueprint } from "@/lib/lesson/types";
import { keySize } from "@/lib/student/pictures";
import { newClassDeleteOn } from "@/lib/privacy/retention";
import { getApprovedLesson } from "./lessons";

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
    lessons: classLessonList(c.id),
  }));
}

/** A class, only if it belongs to this teacher */
export function getClass(id: string, teacherId: string) {
  const c = db.select().from(classes).where(eq(classes.id, id)).get();
  if (!c || c.teacherId !== teacherId) return null;
  if (!c.code) db.update(classes).set({ code: (c.code = newClassCode()) }).where(eq(classes.id, c.id)).run();
  return c;
}

export function createClass(name: string, grade: number, teacherId: string, language: "en" | "fr" = "en") {
  const id = randomUUID();
  // the board's retention rule decides when it's cleared out (lib/privacy/retention.ts); the teacher can set a date
  db.insert(classes).values({ id, name, grade, teacherId, language, code: newClassCode(), createdAt: new Date(), deleteOn: newClassDeleteOn() }).run();
  return id;
}

/**
 * A class's lessons, in the order its students see them (the teacher can move them), approved ones only.
 * `latest` is the one given most recently: what the class is probably on right now.
 */
export function classLessonList(classId: string): { id: string; title: string; latest: boolean }[] {
  const rows = db
    .select()
    .from(classLessons)
    .where(eq(classLessons.classId, classId))
    // (lessons given before there was an order keep the order they were given in)
    .orderBy(sql`coalesce(${classLessons.position}, 1e9)`, asc(classLessons.assignedAt))
    .all();
  const newest = Math.max(0, ...rows.map((r) => r.assignedAt.getTime()));
  return rows.flatMap((r) => {
    const l = getApprovedLesson(r.lessonId);
    return l ? [{ id: l.id, title: l.title, latest: r.assignedAt.getTime() === newest }] : [];
  });
}

/** Give a class a lesson: it goes at the end of the class's list (giving it again changes nothing) */
export function assignLesson(classId: string, lessonId: string) {
  const end = db.select({ n: sql<number>`coalesce(max(${classLessons.position}), -1) + 1` }).from(classLessons).where(eq(classLessons.classId, classId)).get()?.n ?? 0;
  db.insert(classLessons).values({ classId, lessonId, assignedAt: new Date(), position: end }).onConflictDoNothing().run();
}

/** Take a lesson away from a class. What students taught Gloam in it stays (giving it back brings it back). */
export function unassignLesson(classId: string, lessonId: string) {
  db.delete(classLessons).where(and(eq(classLessons.classId, classId), eq(classLessons.lessonId, lessonId))).run();
}

/** Move a lesson one place earlier (-1) or later (+1) in the class's list */
export function moveLesson(classId: string, lessonId: string, by: -1 | 1) {
  const ids = db
    .select({ id: classLessons.lessonId })
    .from(classLessons)
    .where(eq(classLessons.classId, classId))
    .orderBy(sql`coalesce(${classLessons.position}, 1e9)`, asc(classLessons.assignedAt))
    .all()
    .map((r) => r.id);
  const at = ids.indexOf(lessonId);
  const to = at + by;
  if (at < 0 || to < 0 || to >= ids.length) return;
  [ids[at], ids[to]] = [ids[to], ids[at]];
  db.transaction((tx) => {
    ids.forEach((id, position) => tx.update(classLessons).set({ position }).where(and(eq(classLessons.classId, classId), eq(classLessons.lessonId, id))).run());
  });
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
  if (kid) eraseStudent(studentId);
}

/** Delete one student and everything they did: their sessions, messages, candle history and Gloam */
export function eraseStudent(studentId: string) {
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

/**
 * The teacher corrects one of Gloam's candles for a student (Gloam's AI judged it wrong). The teacher has
 * the last word: the student's journey and the dashboard follow. False if they haven't started the lesson.
 */
export function correctCandle(classId: string, studentId: string, lessonId: string, conceptId: string, level: Level): boolean {
  const id = studentSessionId(classId, studentId, lessonId);
  if (!id) return false;
  const s = db.select().from(teachSessions).where(eq(teachSessions.id, id)).get();
  if (!s) return false;
  const understanding = { ...s.understanding, [conceptId]: level };
  // a lit candle is a checkpoint on the journey; an unlit one isn't
  const checkpoints = level === 3 ? (s.checkpoints.includes(conceptId) ? s.checkpoints : [...s.checkpoints, conceptId]) : s.checkpoints.filter((c) => c !== conceptId);
  db.update(teachSessions).set({ understanding, checkpoints, updatedAt: new Date() }).where(eq(teachSessions.id, id)).run();
  return true;
}

/** Delete a class and everything in it: its students, what they taught Gloam, their Gloams, and the class itself */
export function deleteClass(classId: string) {
  for (const k of db.select({ id: students.id }).from(students).where(eq(students.classId, classId)).all()) removeStudent(classId, k.id);
  db.transaction((tx) => {
    tx.delete(classLessons).where(eq(classLessons.classId, classId)).run();
    tx.delete(classes).where(eq(classes.id, classId)).run();
  });
}

/**
 * Move a class to another grade, which switches its age style (Gloam, world, wording) straight away.
 * Crossing between K-2 (2-picture keys) and grade 3+ (3-picture keys) means the old keys can't be typed
 * any more, so those students pick a new key the next time they join, like a teacher's key reset.
 * Returns how many students will pick a new key.
 */
export function setClassGrade(classId: string, grade: number): number {
  return db.transaction((tx) => {
    const c = tx.select({ grade: classes.grade }).from(classes).where(eq(classes.id, classId)).get();
    if (!c) return 0;
    tx.update(classes).set({ grade }).where(eq(classes.id, classId)).run();
    if (keySize(c.grade) === keySize(grade)) return 0;
    return tx
      .update(students)
      .set({ keyHash: null, failedKeys: 0, lockedUntil: null })
      .where(and(eq(students.classId, classId), isNotNull(students.keyHash)))
      .run().changes;
  });
}

/**
 * A class's progress in one lesson, as a spreadsheet (CSV): nickname, then each idea's candle.
 * Nicknames only, nothing else about anyone (it's for the teacher's own records).
 */
export function progressCsv(classId: string, lesson: LessonBlueprint): string {
  const words = ["not yet", "a spark", "flickering", "lit"];
  // a nickname like `Moss, Otter` mustn't split a column; spreadsheets can also run cells starting with = + - @
  const cell = (v: string) => {
    const safe = /^[=+\-@]/.test(v) ? `'${v}` : v;
    return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const d = dashboard(classId, lesson);
  const head = ["Nickname", ...lesson.concepts.map((c) => c.name), "Stuck on", "Messages", "Finished"];
  const rows = d.students.map((s) => [
    s.nickname,
    ...lesson.concepts.map((c) => words[s.understanding[c.id] ?? 0]),
    s.stuck.map((id) => lesson.concepts.find((c) => c.id === id)?.name ?? id).join("; "),
    String(s.messages),
    s.finished ? "yes" : "no",
  ]);
  return [head, ...rows].map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
}

