import "server-only";
import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db, together } from "@/lib/db/client";
import { conceptEvents, encounters, gloams, messages, students, teachSessions } from "@/lib/db/schema";
import { view } from "@/lib/game/engine";
import type { ChallengeKind, EncounterView, Play } from "@/lib/game/types";
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
  /** `about`: on Gloam's lines, the idea its question was about. The rival and the Muddle speak too (the game layer). */
  messages: { from: "student" | "gloam" | "rival" | "muddle"; text: string; emotion: string | null; about: string | null }[];
  /** the game layer for this lesson (null: none yet) */
  play: Play | null;
  /** the challenge or boss fight open right now, as the browser may see it */
  encounter: EncounterView | null;
  /** fireflies in this student's jar (all lessons) */
  fireflies: number;
}

/**
 * Until classroom mode (Phase 4), each browser has one fake practice student, "Test Pilot",
 * remembered by an id in the browser so their Gloam keeps growing across lessons.
 * No real student data, ever.
 */
/** A signed-in student's session for a lesson, if they've started it before (any Chromebook) */
export async function findSession(studentId: string, lessonId: string): Promise<SessionState | null> {
  // the most recent one ("start over" makes a new one)
  const row = await db.select({ id: teachSessions.id }).from(teachSessions).where(and(eq(teachSessions.studentId, studentId), eq(teachSessions.lessonId, lessonId))).orderBy(desc(teachSessions.createdAt)).get();
  return row ? await getSession(row.id) : null;
}

export async function createSession(lessonId: string, existingStudentId?: string, classId?: string): Promise<SessionState> {
  const lesson = await getApprovedLesson(lessonId);
  if (!lesson) throw new Error("Students can only start approved lessons.");
  const now = new Date();
  const known = existingStudentId ? await db.select({ id: students.id }).from(students).where(eq(students.id, existingStudentId)).get() : undefined;
  const studentId = known?.id ?? randomUUID();
  const sessionId = randomUUID();
  const understanding = startingUnderstanding(lesson.concepts.map((c) => c.id));

  await together([
    ...(known ? [] : [db.insert(students).values({ id: studentId, nickname: "Test Pilot", createdAt: now })]),
    db.insert(gloams).values({ studentId, updatedAt: now }).onConflictDoNothing(),
    db.insert(teachSessions).values({ id: sessionId, studentId, lessonId, classId: classId ?? null, understanding, createdAt: now, updatedAt: now }),
    db.insert(messages).values({ sessionId, from: "gloam", text: lesson.opener, emotion: "proud", createdAt: now }),
  ]);

  return (await getSession(sessionId))!;
}

export async function getSession(id: string): Promise<SessionState | null> {
  const row = await db
    .select({ s: teachSessions, nickname: students.nickname })
    .from(teachSessions)
    .innerJoin(students, eq(students.id, teachSessions.studentId))
    .where(eq(teachSessions.id, id))
    .get();
  if (!row) return null;

  const msgs = await db
    .select({ from: messages.from, text: messages.text, emotion: messages.emotion, about: messages.about })
    .from(messages)
    .where(eq(messages.sessionId, id))
    .orderBy(asc(messages.id))
    .all();
  const finishedLesson = row.s.finishedAt !== null ? await getApprovedLesson(row.s.lessonId) : null;

  return {
    id: row.s.id,
    lessonId: row.s.lessonId,
    studentId: row.s.studentId,
    nickname: row.nickname,
    understanding: row.s.understanding,
    checkpoints: row.s.checkpoints,
    gloam: await gloamOf(row.s.studentId),
    finished: row.s.finishedAt !== null,
    ...(finishedLesson ? { recap: lessonRecap(finishedLesson) } : {}),
    messages: msgs,
    play: row.s.play ?? null,
    encounter: row.s.play?.open ? view(row.s.play.open) : null,
    fireflies: await firefliesOf(row.s.studentId),
  };
}

/** What the browser gets: everything but the game's answer key (which notebook line is wrong, the cards' order) */
export type ClientSession = Omit<SessionState, "play">;
export function forBrowser(session: SessionState): ClientSession {
  const { play: _answers, ...rest } = session;
  void _answers;
  return rest;
}

/** Fireflies in a student's jar (caught minus spent) */
export async function firefliesOf(studentId: string): Promise<number> {
  const g = await db.select({ fireflies: gloams.fireflies, spent: gloams.spent }).from(gloams).where(eq(gloams.studentId, studentId)).get();
  return Math.max(0, (g?.fireflies ?? 0) - (g?.spent ?? 0));
}

export async function gloamOf(studentId: string): Promise<GloamLevel> {
  const g = await db.select().from(gloams).where(eq(gloams.studentId, studentId)).get();
  return levelFor(g?.light ?? 0);
}

/** Saves one turn. Returns this student's Gloam before and after (so the game can play a level-up). */
export async function recordTurn(opts: {
  sessionId: string;
  studentText: string;
  reply: string;
  emotion: Emotion;
  /** the idea Gloam's question in the reply is about */
  about?: string | null;
  /** Gloam's next line straight after a candle lights (saved after the reply) */
  followUp?: { text: string; about: string };
  /** The game layer: everything said this turn, in order (instead of reply + followUp), including the rival and the Muddle */
  lines?: { who: "gloam" | "rival" | "muddle"; text: string; emotion?: string; about?: string | null }[];
  /** The game layer: the session's game after this turn (undefined: unchanged) */
  play?: Play | null;
  /** fireflies caught this turn */
  fireflies?: number;
  /** a challenge or boss fight that just ended */
  resolved?: { kind: ChallengeKind | "boss"; conceptId: string | null; outcome: "won" | "skipped"; tries: number };
  before: Understanding;
  after: Understanding;
  judged: { id: string; quality: Quality }[];
  finished: boolean;
}): Promise<{ before: GloamLevel; after: GloamLevel; checkpoints: string[] }> {
  const now = new Date();
  const row = await db.select({ studentId: teachSessions.studentId, checkpoints: teachSessions.checkpoints, finishedAt: teachSessions.finishedAt }).from(teachSessions).where(eq(teachSessions.id, opts.sessionId)).get();
  const studentId = row?.studentId ?? "";
  const lit = newlyLit(opts.before, opts.after, Object.keys(opts.after));
  const checkpoints = [...(row?.checkpoints ?? []), ...lit.filter((id) => !row?.checkpoints.includes(id))];
  const before = await gloamOf(studentId);
  const firstFinish = opts.finished && !row?.finishedAt;
  const moreLessons = firstFinish ? 1 : 0;
  await together([
    db.insert(messages).values({ sessionId: opts.sessionId, from: "student", text: opts.studentText, createdAt: now }),
    ...(opts.lines
      ? opts.lines.map((l) => db.insert(messages).values({ sessionId: opts.sessionId, from: l.who, text: l.text, emotion: l.emotion ?? null, about: l.about ?? null, createdAt: now }))
      : [
          db.insert(messages).values({ sessionId: opts.sessionId, from: "gloam", text: opts.reply, emotion: opts.emotion, about: opts.about ?? null, createdAt: now }),
          ...(opts.followUp ? [db.insert(messages).values({ sessionId: opts.sessionId, from: "gloam", text: opts.followUp.text, emotion: "curious", about: opts.followUp.about, createdAt: now })] : []),
        ]),
    ...(opts.resolved ? [db.insert(encounters).values({ sessionId: opts.sessionId, ...opts.resolved, createdAt: now })] : []),
    ...opts.judged.map((j) =>
      db.insert(conceptEvents).values({ sessionId: opts.sessionId, conceptId: j.id, quality: j.quality, levelBefore: opts.before[j.id] ?? 0, levelAfter: opts.after[j.id] ?? 0, createdAt: now }),
    ),
    db
      .update(teachSessions)
      .set({ understanding: opts.after, checkpoints, updatedAt: now, ...(firstFinish ? { finishedAt: now } : {}), ...(opts.play !== undefined ? { play: opts.play } : {}) })
      .where(eq(teachSessions.id, opts.sessionId)),
    // (the database adds to the light itself, so two quick messages can't both start from the same old number)
    ...(studentId && (lit.length || firstFinish || opts.fireflies)
      ? [
          db
            .insert(gloams)
            .values({ studentId, light: lit.length, lessons: moreLessons, fireflies: opts.fireflies ?? 0, updatedAt: now })
            .onConflictDoUpdate({
              target: gloams.studentId,
              set: { light: sql`${gloams.light} + ${lit.length}`, lessons: sql`${gloams.lessons} + ${moreLessons}`, fireflies: sql`${gloams.fireflies} + ${opts.fireflies ?? 0}`, updatedAt: now },
            }),
        ]
      : []),
  ]);
  return { before, after: await gloamOf(studentId), checkpoints };
}
