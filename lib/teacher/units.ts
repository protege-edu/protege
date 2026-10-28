import "server-only";
import { randomUUID } from "node:crypto";
import { and, asc, eq, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { lessons, units } from "@/lib/db/schema";
import { deleteLesson, draftProgress, runDraft } from "./lessons";

/**
 * Units: a teacher's notes of any length, as several lessons (split by lib/teacher/plan.ts).
 *
 * Drafting a lesson keeps a laptop's AI busy for a few minutes, so a unit's lessons are drafted ONE AT A
 * TIME, in order: the first one is ready to review while the others wait their turn ("queued"). The teacher
 * can move a lesson to the front. Students always go first (lib/ai/queue.ts gives drafting only a spare slot).
 * The line lives in the database, so if Protégé restarts, it carries on where it was.
 */

export type UnitRow = typeof units.$inferSelect;

// (on globalThis so a code reload while developing doesn't start a second drafter)
const store = globalThis as unknown as { protegeUnitDrafter?: { busy: boolean; first: string[] } };
const drafter = (store.protegeUnitDrafter ??= { busy: false, first: [] });

export function createUnit(opts: { teacherId: string; title: string; sourceName: string; grade: number; lessons: { title: string; source: string; ownTitle?: boolean }[] }) {
  const id = randomUUID();
  const now = new Date();
  const ids = opts.lessons.map(() => randomUUID());
  db.transaction((tx) => {
    tx.insert(units).values({ id, teacherId: opts.teacherId, title: opts.title, sourceName: opts.sourceName, grade: opts.grade, createdAt: now }).run();
    opts.lessons.forEach((l, position) =>
      tx
        .insert(lessons)
        .values({ id: ids[position], title: l.title, teacherId: opts.teacherId, grade: opts.grade, status: "queued", unitId: id, position, ownTitle: !!l.ownTitle, sourceName: opts.sourceName, sourceText: l.source, createdAt: now, updatedAt: now })
        .run(),
    );
  });
  draftNext();
  return { id, lessonIds: ids };
}

/** Draft the next lesson in line, if nothing else in a unit is drafting. Safe to call any time. */
export function draftNext() {
  if (drafter.busy) return;
  // only this drafter drafts a unit's lessons, and it's idle: any still marked "drafting" was cut off
  // (Protégé closed mid-draft), so it goes back in line, at the front
  const cut = db.select({ id: lessons.id }).from(lessons).where(and(eq(lessons.status, "drafting"), isNotNull(lessons.unitId))).all();
  for (const c of cut) {
    db.update(lessons).set({ status: "queued", updatedAt: new Date() }).where(eq(lessons.id, c.id)).run();
    if (!drafter.first.includes(c.id)) drafter.first.unshift(c.id);
  }
  const nextId = queueOrder()[0];
  if (!nextId) return;
  const next = db.select().from(lessons).where(eq(lessons.id, nextId)).get();
  if (!next?.sourceText) return;
  drafter.busy = true;
  drafter.first = drafter.first.filter((x) => x !== next.id);
  db.update(lessons).set({ status: "drafting", updatedAt: new Date() }).where(eq(lessons.id, next.id)).run();
  draftProgress.set(next.id, "Getting started");
  void runDraft(next.id, { source: next.sourceText, grade: next.grade, titleHint: next.title, ownTitle: !!next.ownTitle }).finally(() => {
    drafter.busy = false;
    draftNext();
  });
}
const rank = (id: string) => {
  const i = drafter.first.indexOf(id);
  return i < 0 ? 1e6 : i;
};

/** The teacher wants this one sooner: it's drafted next */
export function draftSooner(lessonId: string) {
  drafter.first = [lessonId, ...drafter.first.filter((x) => x !== lessonId)];
  draftNext();
}

/** A unit and its lessons in order, if it's this teacher's */
export function getUnit(id: string, teacherId: string) {
  const unit = db.select().from(units).where(eq(units.id, id)).get();
  if (!unit || unit.teacherId !== teacherId) return null;
  const rows = db
    .select({ id: lessons.id, title: lessons.title, status: lessons.status, position: lessons.position, problem: lessons.problem })
    .from(lessons)
    .where(eq(lessons.unitId, id))
    .orderBy(asc(lessons.position))
    .all();
  // where each waiting lesson is in line (1 = next)
  const line = queueOrder();
  return {
    ...unit,
    lessons: rows.map((r) => ({ ...r, progress: draftProgress.get(r.id), inLine: r.status === "queued" ? line.indexOf(r.id) + 1 : undefined })),
  };
}

/** Every queued lesson, in the order they'll be drafted: the ones the teacher moved to the front, then the oldest unit's lessons in order */
function queueOrder(): string[] {
  const queued = db.select({ id: lessons.id, unitId: lessons.unitId, position: lessons.position }).from(lessons).where(eq(lessons.status, "queued")).all();
  const unitAge = new Map(db.select({ id: units.id, at: units.createdAt }).from(units).all().map((u) => [u.id, u.at.getTime()]));
  return queued
    .sort((a, b) => rank(a.id) - rank(b.id) || (unitAge.get(a.unitId ?? "") ?? 0) - (unitAge.get(b.unitId ?? "") ?? 0) || (a.position ?? 0) - (b.position ?? 0))
    .map((q) => q.id);
}

export function listUnits(teacherId: string) {
  return db.select().from(units).where(eq(units.teacherId, teacherId)).orderBy(asc(units.createdAt)).all();
}

export function renameUnit(id: string, title: string) {
  db.update(units).set({ title }).where(eq(units.id, id)).run();
}

/** Delete a unit, with all its lessons and everything students did in them */
export function deleteUnit(id: string) {
  const ids = db.select({ id: lessons.id }).from(lessons).where(eq(lessons.unitId, id)).all().map((r) => r.id);
  for (const lid of ids) deleteLesson(lid);
  db.delete(units).where(eq(units.id, id)).run();
}

/** After a lesson is deleted: a unit with no lessons left goes too */
export function dropEmptyUnit(unitId: string | null) {
  if (!unitId) return;
  if (!db.select({ id: lessons.id }).from(lessons).where(eq(lessons.unitId, unitId)).get()) db.delete(units).where(eq(units.id, unitId)).run();
}
