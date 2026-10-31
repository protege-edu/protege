import "server-only";
import { randomUUID } from "node:crypto";
import { and, asc, eq, gt, isNotNull, lte } from "drizzle-orm";
import { db, together } from "@/lib/db/client";
import { lessons, units } from "@/lib/db/schema";
import { draftLater } from "./drafting";
import { DRAFT_STALE_MS, deleteLesson } from "./lessons";

/**
 * Units: a teacher's notes of any length, as several lessons (split by lib/teacher/plan.ts).
 *
 * A unit's lessons are drafted ONE AT A TIME, in order: the first one is ready to review while the others
 * wait their turn ("queued"), and the teacher can move one to the front (soonerAt). Students always go first
 * (lib/ai/queue.ts gives drafting only a spare slot).
 * The whole line lives in the database (never in one server's memory: online, every request can land on a
 * different copy of the server), so if drafting is cut off, it carries on where it was.
 */

export type UnitRow = typeof units.$inferSelect;

export async function createUnit(opts: { teacherId: string; title: string; sourceName: string; grade: number; lessons: { title: string; source: string; ownTitle?: boolean }[] }) {
  const id = randomUUID();
  const now = new Date();
  const ids = opts.lessons.map(() => randomUUID());
  await together([
    db.insert(units).values({ id, teacherId: opts.teacherId, title: opts.title, sourceName: opts.sourceName, grade: opts.grade, createdAt: now }),
    ...opts.lessons.map((l, position) =>
      db
        .insert(lessons)
        .values({ id: ids[position], title: l.title, teacherId: opts.teacherId, grade: opts.grade, status: "queued", unitId: id, position, ownTitle: !!l.ownTitle, sourceName: opts.sourceName, sourceText: l.source, createdAt: now, updatedAt: now }),
    ),
  ]);
  await draftNext();
  return { id, lessonIds: ids };
}

/** Draft the next lesson in line, if nothing else in a unit is drafting. Safe to call any time. */
export async function draftNext() {
  const unitDrafts = and(eq(lessons.status, "drafting"), isNotNull(lessons.unitId));
  const freshSince = new Date(Date.now() - DRAFT_STALE_MS);
  // one is drafting (and still giving news): it starts the next one when it's done
  if (await db.select({ id: lessons.id }).from(lessons).where(and(unitDrafts, gt(lessons.updatedAt, freshSince))).get()) return;
  // any still marked "drafting" with no news for a while was cut off: back in line, at the front
  await db.update(lessons).set({ status: "queued", progress: null, soonerAt: new Date() }).where(and(unitDrafts, lte(lessons.updatedAt, freshSince))).run();
  for (const nextId of await queueOrder()) {
    // claim it (only one request can: the database changes it from "queued" exactly once)
    const claimed = await db
      .update(lessons)
      .set({ status: "drafting", progress: "Getting started", soonerAt: null, updatedAt: new Date() })
      .where(and(eq(lessons.id, nextId), eq(lessons.status, "queued")))
      .run();
    if (claimed.rowsAffected === 1) return draftLater(nextId);
  }
}

/** The teacher wants this one sooner: it's drafted next */
export async function draftSooner(lessonId: string) {
  await db.update(lessons).set({ soonerAt: new Date() }).where(eq(lessons.id, lessonId)).run();
  await draftNext();
}

/** A unit and its lessons in order, if it's this teacher's */
export async function getUnit(id: string, teacherId: string) {
  const unit = await db.select().from(units).where(eq(units.id, id)).get();
  if (!unit || unit.teacherId !== teacherId) return null;
  const rows = await db
    .select({ id: lessons.id, title: lessons.title, status: lessons.status, position: lessons.position, problem: lessons.problem, progress: lessons.progress })
    .from(lessons)
    .where(eq(lessons.unitId, id))
    .orderBy(asc(lessons.position))
    .all();
  // where each waiting lesson is in line (1 = next)
  const line = await queueOrder();
  return {
    ...unit,
    lessons: rows.map(({ progress, ...r }) => ({ ...r, progress: r.status === "drafting" ? (progress ?? undefined) : undefined, inLine: r.status === "queued" ? line.indexOf(r.id) + 1 : undefined })),
  };
}

/** Every queued lesson, in the order they'll be drafted: the ones the teacher moved to the front (latest ask first), then the oldest unit's lessons in order */
async function queueOrder(): Promise<string[]> {
  const queued = await db
    .select({ id: lessons.id, position: lessons.position, sooner: lessons.soonerAt, unitAt: units.createdAt })
    .from(lessons)
    .innerJoin(units, eq(units.id, lessons.unitId))
    .where(eq(lessons.status, "queued"))
    .all();
  const t = (d: Date | null) => d?.getTime() ?? 0;
  return queued.sort((a, b) => t(b.sooner) - t(a.sooner) || t(a.unitAt) - t(b.unitAt) || (a.position ?? 0) - (b.position ?? 0)).map((q) => q.id);
}

export async function listUnits(teacherId: string) {
  return await db.select().from(units).where(eq(units.teacherId, teacherId)).orderBy(asc(units.createdAt)).all();
}

export async function renameUnit(id: string, title: string) {
  await db.update(units).set({ title }).where(eq(units.id, id)).run();
}

/** Delete a unit, with all its lessons and everything students did in them */
export async function deleteUnit(id: string) {
  const ids = (await db.select({ id: lessons.id }).from(lessons).where(eq(lessons.unitId, id)).all()).map((r) => r.id);
  for (const lid of ids) await deleteLesson(lid);
  await db.delete(units).where(eq(units.id, id)).run();
}

/** After a lesson is deleted: a unit with no lessons left goes too */
export async function dropEmptyUnit(unitId: string | null) {
  if (!unitId) return;
  if (!await db.select({ id: lessons.id }).from(lessons).where(eq(lessons.unitId, unitId)).get()) await db.delete(units).where(eq(units.id, unitId)).run();
}
