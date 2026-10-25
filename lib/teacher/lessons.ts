import "server-only";
import { randomUUID } from "node:crypto";
import { desc, eq, inArray } from "drizzle-orm";
import { DraftFailed, draftBlueprint } from "@/lib/ai/blueprint";
import { db } from "@/lib/db/client";
import { classLessons, conceptEvents, lessons, messages, teachSessions } from "@/lib/db/schema";
import { BUILT_IN } from "@/lib/lesson";
import type { LessonBlueprint } from "@/lib/lesson/types";
import { checkBlueprint } from "./checks";

/**
 * Teachers' lessons, from draft to approved.
 * STUDENTS ONLY EVER SEE APPROVED LESSONS: getApprovedLesson is the only way a student session loads one.
 */

export type LessonRow = typeof lessons.$inferSelect;

/** Live progress of lessons being drafted right now (this server only; it's fine to lose on restart) */
// (kept on globalThis so it survives code reloads in development while a draft is still running)
const store = globalThis as unknown as { protegeDraftProgress?: Map<string, string> };
const progress = (store.protegeDraftProgress ??= new Map<string, string>());

export function listLessons(): (Pick<LessonRow, "id" | "title" | "grade" | "status" | "sourceName" | "updatedAt"> & { builtIn?: boolean })[] {
  const rows = db
    .select({ id: lessons.id, title: lessons.title, grade: lessons.grade, status: lessons.status, sourceName: lessons.sourceName, updatedAt: lessons.updatedAt })
    .from(lessons)
    .orderBy(desc(lessons.updatedAt))
    .all();
  return rows.map((r) => ({ ...r, builtIn: r.id in BUILT_IN }));
}

export function getLessonRow(id: string): (LessonRow & { progress?: string }) | null {
  const row = db.select().from(lessons).where(eq(lessons.id, id)).get();
  if (!row) return null;
  // Still says "drafting" but nothing is working on it (the server restarted): say so, offer a retry
  if (row.status === "drafting" && !progress.has(id)) {
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

/** Start drafting. Returns right away; the AI works in the background (a few minutes on a laptop). */
export function startDraft(opts: { source: string; sourceName: string; grade: number; titleHint?: string }): string {
  const id = randomUUID();
  const now = new Date();
  db.insert(lessons)
    .values({
      id,
      title: opts.titleHint || opts.sourceName || "New lesson",
      grade: opts.grade,
      status: "drafting",
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

async function runDraft(id: string, opts: { source: string; grade: number; titleHint?: string }) {
  try {
    const bp = await draftBlueprint({ ...opts, onProgress: (step) => progress.set(id, step) });
    db.update(lessons)
      .set({ status: "draft", title: bp.title, blueprint: { ...bp, id }, problem: null, updatedAt: new Date() })
      .where(eq(lessons.id, id))
      .run();
  } catch (err) {
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
  db.update(lessons).set({ status: "drafting", problem: null, updatedAt: new Date() }).where(eq(lessons.id, id)).run();
  progress.set(id, "Starting again");
  void runDraft(id, { source: row.sourceText, grade: row.grade });
  return true;
}

/** Save the teacher's edits. Editing an approved lesson sends it back to draft until re-approved. */
export function saveBlueprint(id: string, blueprint: LessonBlueprint) {
  db.update(lessons)
    .set({ blueprint: { ...blueprint, id }, title: blueprint.title, grade: blueprint.grade, status: "draft", approvedAt: null, updatedAt: new Date() })
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
}
