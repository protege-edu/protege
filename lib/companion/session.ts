import "server-only";
import { randomUUID } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { conceptEvents, messages, students, teachSessions } from "@/lib/db/schema";
import { lessonRecap } from "@/lib/lesson";
import { getApprovedLesson } from "@/lib/teacher/lessons";
import type { RecapItem } from "@/lib/lesson/types";
import { startingUnderstanding, type Understanding } from "./progress";
import type { Emotion, Quality } from "@/lib/ai/schemas";

export interface SessionState {
  id: string;
  lessonId: string;
  nickname: string;
  understanding: Understanding;
  finished: boolean;
  /** Only present once the lesson is finished */
  recap?: RecapItem[];
  messages: { from: "student" | "gloam"; text: string; emotion: string | null }[];
}

/** Phase 1 has one fake student. No real student data, ever. */
export function createSession(lessonId: string): SessionState {
  const lesson = getApprovedLesson(lessonId);
  if (!lesson) throw new Error("Students can only start approved lessons.");
  const now = new Date();
  const studentId = randomUUID();
  const sessionId = randomUUID();
  const understanding = startingUnderstanding(lesson.concepts.map((c) => c.id));

  db.transaction((tx) => {
    tx.insert(students).values({ id: studentId, nickname: "Test Pilot", createdAt: now }).run();
    tx.insert(teachSessions)
      .values({ id: sessionId, studentId, lessonId, understanding, createdAt: now, updatedAt: now })
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
    nickname: row.nickname,
    understanding: row.s.understanding,
    finished: row.s.finishedAt !== null,
    ...(row.s.finishedAt !== null && getApprovedLesson(row.s.lessonId) ? { recap: lessonRecap(getApprovedLesson(row.s.lessonId)!) } : {}),
    messages: msgs,
  };
}

export function recordTurn(opts: {
  sessionId: string;
  studentText: string;
  reply: string;
  emotion: Emotion;
  before: Understanding;
  after: Understanding;
  judged: { id: string; quality: Quality }[];
  finished: boolean;
}) {
  const now = new Date();
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
      .set({ understanding: opts.after, updatedAt: now, ...(opts.finished ? { finishedAt: now } : {}) })
      .where(eq(teachSessions.id, opts.sessionId))
      .run();
  });
}
