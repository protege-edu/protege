import "server-only";
import { randomUUID } from "node:crypto";
import { desc, eq, inArray, isNull, or } from "drizzle-orm";
import { DraftFailed, draftBlueprint } from "@/lib/ai/blueprint";
import { db, together } from "@/lib/db/client";
import { classLessons, classes, conceptEvents, lessons, messages, students, teachSessions } from "@/lib/db/schema";
import { styleForGrade } from "@/lib/age-styles";
import { BUILT_IN } from "@/lib/lesson";
import type { LessonBlueprint } from "@/lib/lesson/types";
import { checkBlueprint } from "./checks";
import { draftLater } from "./drafting";
import { draftNext, draftSooner, dropEmptyUnit } from "./units";

/**
 * Teachers' lessons, from draft to approved.
 * STUDENTS ONLY EVER SEE APPROVED LESSONS: getApprovedLesson is the only way a student session loads one.
 */

export type LessonRow = typeof lessons.$inferSelect;

/** A lesson still "drafting" with no news for this long was cut off (the drafter stopped): it's started over */
export const DRAFT_STALE_MS = 8 * 60_000;
const stale = (row: { status: string; updatedAt: Date }) => row.status === "drafting" && Date.now() - row.updatedAt.getTime() > DRAFT_STALE_MS;

/** A teacher sees their own lessons and the ones built into Protégé, never another teacher's */
export function canSee(row: Pick<LessonRow, "id" | "teacherId">, teacherId: string) {
  return row.id in BUILT_IN || row.teacherId === teacherId;
}

export async function listLessons(teacherId: string): Promise<(Pick<LessonRow, "id" | "title" | "grade" | "status" | "sourceName" | "updatedAt" | "unitId" | "position"> & { builtIn?: boolean; progress?: string })[]> {
  // (if a unit's drafting was cut off, its lessons still waiting carry on)
  await draftNext();
  const rows = (await db
    .select({ id: lessons.id, teacherId: lessons.teacherId, title: lessons.title, grade: lessons.grade, status: lessons.status, sourceName: lessons.sourceName, updatedAt: lessons.updatedAt, unitId: lessons.unitId, position: lessons.position, progress: lessons.progress })
    .from(lessons)
    .where(or(eq(lessons.teacherId, teacherId), isNull(lessons.teacherId)))
    .orderBy(desc(lessons.updatedAt))
    .all())
    .filter((r) => canSee(r, teacherId));
  return rows.map((r) => ({ id: r.id, title: r.title, grade: r.grade, status: r.status, sourceName: r.sourceName, updatedAt: r.updatedAt, unitId: r.unitId, position: r.position, builtIn: r.id in BUILT_IN, progress: r.status === "drafting" ? (r.progress ?? undefined) : undefined }));
}

export async function getLessonRow(id: string): Promise<LessonRow | null> {
  const row = await db.select().from(lessons).where(eq(lessons.id, id)).get();
  if (!row) return null;
  // Still says "drafting" but nothing has worked on it for a while (the drafter was cut off): say so, offer a retry
  if (stale(row)) {
    // (a unit's lesson just goes back in line)
    if (row.unitId) {
      await db.update(lessons).set({ status: "queued", progress: null, soonerAt: new Date(), updatedAt: new Date() }).where(eq(lessons.id, id)).run();
      await draftNext();
      return { ...row, status: "queued" };
    }
    const problem = "Drafting was interrupted. Press Try again to start it over.";
    await db.update(lessons).set({ status: "failed", problem, progress: null, updatedAt: new Date() }).where(eq(lessons.id, id)).run();
    return { ...row, status: "failed", problem };
  }
  return row;
}

/** The ONLY way students load a lesson: built-in, or teacher-approved. */
export async function getApprovedLesson(id: string): Promise<LessonBlueprint | null> {
  if (BUILT_IN[id]) return BUILT_IN[id];
  const row = await db.select().from(lessons).where(eq(lessons.id, id)).get();
  if (!row || row.status !== "approved" || !row.blueprint) return null;
  return { ...row.blueprint, id: row.id };
}

/**
 * The lesson as this student plays it. In a class, Gloam, its world and its wording follow the CLASS's
 * grade (the teacher set it for who the students are), whatever grade the lesson was drafted for.
 */
export async function playedBy(lesson: LessonBlueprint, studentId: string | null | undefined): Promise<LessonBlueprint> {
  if (!studentId) return lesson;
  const c = await db.select({ grade: classes.grade }).from(students).innerJoin(classes, eq(students.classId, classes.id)).where(eq(students.id, studentId)).get();
  return c ? { ...lesson, ageStyle: styleForGrade(c.grade).id } : lesson;
}

/** Start drafting. Returns right away; Claude works in the background (lib/teacher/drafting.ts). */
export async function startDraft(opts: { source: string; sourceName: string; grade: number; titleHint?: string; ownTitle?: boolean; teacherId: string }): Promise<string> {
  const id = randomUUID();
  const now = new Date();
  await db.insert(lessons)
    .values({
      id,
      title: opts.titleHint || opts.sourceName || "New lesson",
      teacherId: opts.teacherId,
      grade: opts.grade,
      status: "drafting",
      progress: "Getting started",
      ownTitle: !!opts.ownTitle,
      sourceName: opts.sourceName,
      sourceText: opts.source,
      createdAt: now,
      updatedAt: now,
    })
    .run();
  await draftLater(id);
  return id;
}

class Deleted extends Error {}

/** Draft one lesson (its row already says "drafting"). Resolves when it's done, either way. Called by lib/teacher/drafting.ts. */
export async function runDraft(id: string, opts: { source: string; grade: number; titleHint?: string; ownTitle?: boolean }) {
  try {
    const bp = await draftBlueprint({
      ...opts,
      onProgress: async (step) => {
        // the teacher sees the step (and it shows the draft is still alive). Deleted meanwhile: stop, so Claude isn't paid for nothing
        const saved = await db.update(lessons).set({ progress: step, updatedAt: new Date() }).where(eq(lessons.id, id)).run();
        if (saved.meta.changes === 0) throw new Deleted();
      },
    });
    // a title the teacher typed stays (Gloam's suggestion is only for when they didn't)
    if (opts.ownTitle && opts.titleHint) bp.title = opts.titleHint;
    await db.update(lessons)
      .set({ status: "draft", title: bp.title, blueprint: { ...bp, id }, problem: null, progress: null, updatedAt: new Date() })
      .where(eq(lessons.id, id))
      .run();
  } catch (err) {
    if (err instanceof Deleted) return;
    const message = err instanceof DraftFailed ? err.message : "Something went wrong while drafting. Try again, or use a shorter part of your notes.";
    if (!(err instanceof DraftFailed)) console.error("[draft] failed", err);
    await db.update(lessons).set({ status: "failed", problem: message, progress: null, updatedAt: new Date() }).where(eq(lessons.id, id)).run();
  }
}

export async function retryDraft(id: string) {
  const row = await getLessonRow(id);
  if (!row?.sourceText) return false;
  // a unit's lesson gets back in line, at the front (a unit's lessons are drafted one at a time)
  if (row.unitId) {
    await db.update(lessons).set({ status: "queued", problem: null, updatedAt: new Date() }).where(eq(lessons.id, id)).run();
    await draftSooner(id);
    return true;
  }
  await db.update(lessons).set({ status: "drafting", problem: null, progress: "Starting again", updatedAt: new Date() }).where(eq(lessons.id, id)).run();
  await draftLater(id);
  return true;
}

/** Save the teacher's edits. Editing an approved lesson sends it back to draft until re-approved. */
export async function saveBlueprint(id: string, blueprint: LessonBlueprint) {
  // the grade picks the age style (never trusted from the page)
  await db.update(lessons)
    .set({ blueprint: { ...blueprint, id, ageStyle: styleForGrade(blueprint.grade).id }, title: blueprint.title, grade: blueprint.grade, status: "draft", approvedAt: null, updatedAt: new Date() })
    .where(eq(lessons.id, id))
    .run();
}

/** Approve, but only if every check passes. */
export async function approveLesson(id: string): Promise<{ ok: true } | { ok: false; problems: string[] }> {
  const row = await getLessonRow(id);
  if (!row?.blueprint) return { ok: false, problems: ["This lesson hasn't finished drafting yet."] };
  const problems = checkBlueprint(row.blueprint);
  if (problems.length) return { ok: false, problems: problems.map((p) => p.message) };
  const now = new Date();
  await db.update(lessons).set({ status: "approved", approvedAt: now, updatedAt: now }).where(eq(lessons.id, id)).run();
  return { ok: true };
}

/** Delete a lesson and everything students did in it (their sessions, messages and candle history). */
export async function deleteLesson(id: string) {
  const unitId = (await db.select({ unitId: lessons.unitId }).from(lessons).where(eq(lessons.id, id)).get())?.unitId ?? null;
  const sessions = (await db.select({ id: teachSessions.id }).from(teachSessions).where(eq(teachSessions.lessonId, id)).all()).map((s) => s.id);
  await together([
    ...(sessions.length
      ? [
          db.delete(conceptEvents).where(inArray(conceptEvents.sessionId, sessions)),
          db.delete(messages).where(inArray(messages.sessionId, sessions)),
          db.delete(teachSessions).where(inArray(teachSessions.id, sessions)),
        ]
      : []),
    db.delete(classLessons).where(eq(classLessons.lessonId, id)),
    db.delete(lessons).where(eq(lessons.id, id)),
  ]);
  await dropEmptyUnit(unitId);
}
