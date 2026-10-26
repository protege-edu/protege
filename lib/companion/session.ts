import "server-only";
import { randomUUID } from "node:crypto";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { conceptEvents, gloams, messages, students, teachSessions } from "@/lib/db/schema";
import { lessonRecap } from "@/lib/lesson";
import { getApprovedLesson } from "@/lib/teacher/lessons";
import type { RecapItem } from "@/lib/lesson/types";
import { levelFor, newlyLit, type GloamLevel } from "./level";
import { startingUnderstanding, type Understanding } from "./progress";
import type { Emotion, Quality } from "@/lib/ai/schemas";

export interface SessionState {
  id: string;
  lessonId: string;
  /** the (fake, nickname-only) student, so their Gloam can grow across lessons */
  studentId: string;
  nickname: string;
  understanding: Understanding;
  /** ideas fully understood, in the order they were lit: the journey's checkpoints */
  checkpoints: string[];
  /** this student's Gloam across every lesson */
  gloam: GloamLevel;
  finished: boolean;
  /** Only present once the lesson is finished */
  recap?: RecapItem[];
  messages: { from: "student" | "gloam"; text: string; emotion: string | null }[];
}

/**
 * Until classroom mode (Phase 4), each browser has one fake practice student, "Test Pilot",
 * remembered by an id in the browser so their Gloam keeps growing across lessons.
 * No real student data, ever.
 */
/** A signed-in student's session for a lesson, if they've started it before (any Chromebook) */
export function findSession(studentId: string, lessonId: string): SessionState | null {
  // the most recent one ("start over" makes a new one)
  const row = db.select({ id: teachSessions.id }).from(teachSessions).where(and(eq(teachSessions.studentId, studentId), eq(teachSessions.lessonId, lessonId))).orderBy(desc(teachSessions.createdAt)).get();
  return row ? getSession(row.id) : null;
}

export function createSession(lessonId: string, existingStudentId?: string, classId?: string): SessionState {
  const lesson = getApprovedLesson(lessonId);
  if (!lesson) throw new Error("Students can only start approved lessons.");
  const now = new Date();
  const known = existingStudentId ? db.select({ id: students.id }).from(students).where(eq(students.id, existingStudentId)).get() : undefined;
  const studentId = known?.id ?? randomUUID();
  const sessionId = randomUUID();
  const understanding = startingUnderstanding(lesson.concepts.map((c) => c.id));

  db.transaction((tx) => {
    if (!known) tx.insert(students).values({ id: studentId, nickname: "Test Pilot", createdAt: now }).run();
    tx.insert(gloams).values({ studentId, updatedAt: now }).onConflictDoNothing().run();
    tx.insert(teachSessions)
      .values({ id: sessionId, studentId, lessonId, classId: classId ?? null, understanding, createdAt: now, updatedAt: now })
      .run();
    tx.insert(messages).values({ sessionId, from: "gloam", text: lesson.opener, emotion: "proud", createdAt: now }).run();
  });

  return getSession(sessionId)!;
}

export function getSession(id: string): SessionState | null {
  const row = db
    .select({ s: teachSessions, nickname: students.nickname })
    .from(teachSessions)
    .innerJoin(students, eq(students.id, teachSessions.studentId))
    .where(eq(teachSessions.id, id))
    .get();
  if (!row) return null;

  const msgs = db
    .select({ from: messages.from, text: messages.text, emotion: messages.emotion })
    .from(messages)
    .where(eq(messages.sessionId, id))
    .orderBy(asc(messages.id))
    .all();

  return {
    id: row.s.id,
    lessonId: row.s.lessonId,
    studentId: row.s.studentId,
    nickname: row.nickname,
    understanding: row.s.understanding,
    checkpoints: row.s.checkpoints,
    gloam: gloamOf(row.s.studentId),
    finished: row.s.finishedAt !== null,
    ...(row.s.finishedAt !== null && getApprovedLesson(row.s.lessonId) ? { recap: lessonRecap(getApprovedLesson(row.s.lessonId)!) } : {}),
    messages: msgs,
  };
}

export function gloamOf(studentId: string): GloamLevel {
  const g = db.select().from(gloams).where(eq(gloams.studentId, studentId)).get();
  return levelFor(g?.light ?? 0);
}

/** Saves one turn. Returns this student's Gloam before and after (so the game can play a level-up). */
export function recordTurn(opts: {
  sessionId: string;
  studentText: string;
  reply: string;
  emotion: Emotion;
  before: Understanding;
  after: Understanding;
  judged: { id: string; quality: Quality }[];
  finished: boolean;
}): { before: GloamLevel; after: GloamLevel; checkpoints: string[] } {
  const now = new Date();
  const row = db.select({ studentId: teachSessions.studentId, checkpoints: teachSessions.checkpoints, finishedAt: teachSessions.finishedAt }).from(teachSessions).where(eq(teachSessions.id, opts.sessionId)).get();
  const studentId = row?.studentId ?? "";
  const lit = newlyLit(opts.before, opts.after, Object.keys(opts.after));
  const checkpoints = [...(row?.checkpoints ?? []), ...lit.filter((id) => !row?.checkpoints.includes(id))];
  const before = gloamOf(studentId);
  const firstFinish = opts.finished && !row?.finishedAt;
  db.transaction((tx) => {
    tx.insert(messages).values({ sessionId: opts.sessionId, from: "student", text: opts.studentText, createdAt: now }).run();
    tx.insert(messages)
      .values({ sessionId: opts.sessionId, from: "gloam", text: opts.reply, emotion: opts.emotion, createdAt: now })
      .run();
    for (const j of opts.judged) {
      tx.insert(conceptEvents)
        .values({
          sessionId: opts.sessionId,
          conceptId: j.id,
          quality: j.quality,
          levelBefore: opts.before[j.id] ?? 0,
          levelAfter: opts.after[j.id] ?? 0,
          createdAt: now,
        })
        .run();
    }
    tx.update(teachSessions)
      .set({ understanding: opts.after, checkpoints, updatedAt: now, ...(firstFinish ? { finishedAt: now } : {}) })
      .where(eq(teachSessions.id, opts.sessionId))
      .run();
    if (studentId && (lit.length || firstFinish)) {
      const g = tx.select().from(gloams).where(eq(gloams.studentId, studentId)).get();
      const light = (g?.light ?? 0) + lit.length;
      const lessons = (g?.lessons ?? 0) + (firstFinish ? 1 : 0);
      tx.insert(gloams).values({ studentId, light, lessons, updatedAt: now }).onConflictDoUpdate({ target: gloams.studentId, set: { light, lessons, updatedAt: now } }).run();
    }
  });
  return { before, after: gloamOf(studentId), checkpoints };
}
