import "server-only";
import { randomUUID } from "node:crypto";
import { desc, eq, inArray, isNull, or } from "drizzle-orm";
import { DraftFailed, draftBlueprint } from "@/lib/ai/blueprint";
import { db } from "@/lib/db/client";
import { classLessons, classes, conceptEvents, lessons, messages, students, teachSessions } from "@/lib/db/schema";
import { styleForGrade } from "@/lib/age-styles";
import { BUILT_IN } from "@/lib/lesson";
import type { LessonBlueprint } from "@/lib/lesson/types";
import { checkBlueprint } from "./checks";
import { draftNext, draftSooner, dropEmptyUnit } from "./units";

/**
 * Teachers' lessons, from draft to approved.
 * STUDENTS ONLY EVER SEE APPROVED LESSONS: getApprovedLesson is the only way a student session loads one.
 */

export type LessonRow = typeof lessons.$inferSelect;

/** Live progress of lessons being drafted right now (this server only; it's fine to lose on restart) */
// (kept on globalThis so it survives code reloads in development while a draft is still running)
const store = globalThis as unknown as { protegeDraftProgress?: Map<string, string> };
const progress = (store.protegeDraftProgress ??= new Map<string, string>());
export { progress as draftProgress };

/** A teacher sees their own lessons and the ones built into Protégé, never another teacher's */
export function canSee(row: Pick<LessonRow, "id" | "teacherId">, teacherId: string) {
  return row.id in BUILT_IN || row.teacherId === teacherId;
}

export function listLessons(teacherId: string): (Pick<LessonRow, "id" | "title" | "grade" | "status" | "sourceName" | "updatedAt" | "unitId" | "position"> & { builtIn?: boolean; progress?: string })[] {
  // (after a restart, the lessons still waiting in a unit carry on drafting)
  draftNext();
  const rows = db
    .select({ id: lessons.id, teacherId: lessons.teacherId, title: lessons.title, grade: lessons.grade, status: lessons.status, sourceName: lessons.sourceName, updatedAt: lessons.updatedAt, unitId: lessons.unitId, position: lessons.position })
    .from(lessons)
    .where(or(eq(lessons.teacherId, teacherId), isNull(lessons.teacherId)))
    .orderBy(desc(lessons.updatedAt))
    .all()
    .filter((r) => canSee(r, teacherId));
  return rows.map((r) => ({ id: r.id, title: r.title, grade: r.grade, status: r.status, sourceName: r.sourceName, updatedAt: r.updatedAt, unitId: r.unitId, position: r.position, builtIn: r.id in BUILT_IN, progress: progress.get(r.id) }));
}

export function getLessonRow(id: string): (LessonRow & { progress?: string }) | null {
  const row = db.select().from(lessons).where(eq(lessons.id, id)).get();
  if (!row) return null;
  // Still says "drafting" but nothing is working on it (the server restarted): say so, offer a retry
  if (row.status === "drafting" && !progress.has(id)) {
    // (a unit's lesson just goes back in line)
    if (row.unitId) {
      db.update(lessons).set({ status: "queued", updatedAt: new Date() }).where(eq(lessons.id, id)).run();
      draftNext();
      return { ...row, status: "queued" };
    }
    const problem = "Drafting was interrupted (Protégé restarted). Press Try again to start it over.";
    db.update(lessons).set({ status: "failed", problem, updatedAt: new Date() }).where(eq(lessons.id, id)).run();
    return { ...row, status: "failed", problem };
  }
  return { ...row, progress: progress.get(id) };
}

/** The ONLY way students load a lesson: built-in, or teacher-approved. */
export function getApprovedLesson(id: string): LessonBlueprint | null {
  if (BUILT_IN[id]) return BUILT_IN[id];
  const row = db.select().from(lessons).where(eq(lessons.id, id)).get();
  if (!row || row.status !== "approved" || !row.blueprint) return null;
  return { ...row.blueprint, id: row.id };
}

/**
 * The lesson as this student plays it. In a class, Gloam, its world and its wording follow the CLASS's
 * grade (the teacher set it for who the students are), whatever grade the lesson was drafted for.
 */
export function playedBy(lesson: LessonBlueprint, studentId: string | null | undefined): LessonBlueprint {
  if (!studentId) return lesson;
  const c = db.select({ grade: classes.grade }).from(students).innerJoin(classes, eq(students.classId, classes.id)).where(eq(students.id, studentId)).get();
  return c ? { ...lesson, ageStyle: styleForGrade(c.grade).id } : lesson;
}

/** Start drafting. Returns right away; the AI works in the background (a few minutes on a laptop). */
export function startDraft(opts: { source: string; sourceName: string; grade: number; titleHint?: string; ownTitle?: boolean; teacherId: string }): string {
  const id = randomUUID();
  const now = new Date();
  db.insert(lessons)
    .values({
      id,
      title: opts.titleHint || opts.sourceName || "New lesson",
      teacherId: opts.teacherId,
      grade: opts.grade,
      status: "drafting",
      ownTitle: !!opts.ownTitle,
      sourceName: opts.sourceName,
      sourceText: opts.source,
      createdAt: now,
      updatedAt: now,
    })
    .run();
  progress.set(id, "Getting started");
  void runDraft(id, opts);
  return id;
}

class Deleted extends Error {}

/** Draft one lesson (its row already says "drafting"). Resolves when it's done, either way. */
export async function runDraft(id: string, opts: { source: string; grade: number; titleHint?: string; ownTitle?: boolean }) {
  try {
    const bp = await draftBlueprint({
      ...opts,
      onProgress: (step) => {
        // deleted while Gloam was drafting it: stop at the next step, so the laptop's AI isn't kept busy for nothing
        if (!db.select({ id: lessons.id }).from(lessons).where(eq(lessons.id, id)).get()) throw new Deleted();
        progress.set(id, step);
      },
    });
    // a title the teacher typed stays (Gloam's suggestion is only for when they didn't)
    if (opts.ownTitle && opts.titleHint) bp.title = opts.titleHint;
    db.update(lessons)
      .set({ status: "draft", title: bp.title, blueprint: { ...bp, id }, problem: null, updatedAt: new Date() })
      .where(eq(lessons.id, id))
      .run();
  } catch (err) {
    if (err instanceof Deleted) return;
    const message = err instanceof DraftFailed ? err.message : "Something went wrong while drafting. Try again, or use a shorter part of your notes.";
    if (!(err instanceof DraftFailed)) console.error("[draft] failed", err);
    db.update(lessons).set({ status: "failed", problem: message, updatedAt: new Date() }).where(eq(lessons.id, id)).run();
  } finally {
    progress.delete(id);
  }
}

export function retryDraft(id: string) {
  const row = getLessonRow(id);
  if (!row?.sourceText) return false;
  // a unit's lesson gets back in line, at the front (one draft at a time keeps the laptop quick for students)
  if (row.unitId) {
    db.update(lessons).set({ status: "queued", problem: null, updatedAt: new Date() }).where(eq(lessons.id, id)).run();
    draftSooner(id);
    return true;
  }
  db.update(lessons).set({ status: "drafting", problem: null, updatedAt: new Date() }).where(eq(lessons.id, id)).run();
  progress.set(id, "Starting again");
  void runDraft(id, { source: row.sourceText, grade: row.grade, titleHint: row.ownTitle ? row.title : undefined, ownTitle: !!row.ownTitle });
  return true;
}

/** Save the teacher's edits. Editing an approved lesson sends it back to draft until re-approved. */
export function saveBlueprint(id: string, blueprint: LessonBlueprint) {
  // the grade picks the age style (never trusted from the page)
  db.update(lessons)
    .set({ blueprint: { ...blueprint, id, ageStyle: styleForGrade(blueprint.grade).id }, title: blueprint.title, grade: blueprint.grade, status: "draft", approvedAt: null, updatedAt: new Date() })
    .where(eq(lessons.id, id))
    .run();
}

/** Approve, but only if every check passes. */
export function approveLesson(id: string): { ok: true } | { ok: false; problems: string[] } {
  const row = getLessonRow(id);
  if (!row?.blueprint) return { ok: false, problems: ["This lesson hasn't finished drafting yet."] };
  const problems = checkBlueprint(row.blueprint);
  if (problems.length) return { ok: false, problems: problems.map((p) => p.message) };
  const now = new Date();
  db.update(lessons).set({ status: "approved", approvedAt: now, updatedAt: now }).where(eq(lessons.id, id)).run();
  return { ok: true };
}

/** Delete a lesson and everything students did in it (their sessions, messages and candle history). */
export function deleteLesson(id: string) {
  const unitId = db.select({ unitId: lessons.unitId }).from(lessons).where(eq(lessons.id, id)).get()?.unitId ?? null;
  db.transaction((tx) => {
    const sessions = tx.select({ id: teachSessions.id }).from(teachSessions).where(eq(teachSessions.lessonId, id)).all().map((s) => s.id);
    if (sessions.length) {
      tx.delete(conceptEvents).where(inArray(conceptEvents.sessionId, sessions)).run();
      tx.delete(messages).where(inArray(messages.sessionId, sessions)).run();
      tx.delete(teachSessions).where(inArray(teachSessions.id, sessions)).run();
    }
    tx.delete(classLessons).where(eq(classLessons.lessonId, id)).run();
    tx.delete(lessons).where(eq(lessons.id, id)).run();
  });
  dropEmptyUnit(unitId);
}
