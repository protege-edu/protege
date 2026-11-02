import "server-only";
import { and, desc, eq, gt, isNull, or, sql } from "drizzle-orm";
import { db, together } from "@/lib/db/client";
import { classBosses, classBossHits, gloams, students } from "@/lib/db/schema";
import { CLASS_BOSS_REWARD, classBossView, hitsNeeded, SHOW_BEATEN_MS, type ClassBossView } from "@/lib/game/class-boss";

/** The class's boss right now: the one going on, or the one beaten in the last few minutes (for the dawn) */
export async function classBossOf(classId: string) {
  return (
    (await db
      .select()
      .from(classBosses)
      .where(and(eq(classBosses.classId, classId), or(isNull(classBosses.endedAt), and(eq(classBosses.beaten, true), gt(classBosses.endedAt, new Date(Date.now() - SHOW_BEATEN_MS))))))
      .orderBy(desc(classBosses.id))
      .get()) ?? null
  );
}

/** For the teacher's projector: how much fog is left, and how many students helped (a count, never names) */
export async function classBossForTeacher(classId: string): Promise<(ClassBossView & { startedAt: number; helpers: number }) | null> {
  const b = await classBossOf(classId);
  if (!b) return null;
  const h = await db.select({ n: sql<number>`count(*)` }).from(classBossHits).where(eq(classBossHits.bossId, b.id)).get();
  return { ...classBossView(b), startedAt: b.startedAt.getTime(), helpers: Number(h?.n ?? 0) };
}

/** The teacher starts one (or gets the one already going): its size comes from how many students are in the class */
export async function startClassBoss(classId: string) {
  const going = await db.select().from(classBosses).where(and(eq(classBosses.classId, classId), isNull(classBosses.endedAt))).get();
  if (going) return going;
  const kids = await db.select({ n: sql<number>`count(*)` }).from(students).where(eq(students.classId, classId)).get();
  await db.insert(classBosses).values({ classId, need: hitsNeeded(Number(kids?.n ?? 0)), startedAt: new Date() }).run();
  return classBossOf(classId);
}

/** The teacher ends it before the class beats it (the bell rang): no harm, nobody loses anything */
export async function endClassBoss(classId: string) {
  await db.update(classBosses).set({ endedAt: new Date() }).where(and(eq(classBosses.classId, classId), isNull(classBosses.endedAt))).run();
}

/**
 * A student's turn hits the class's boss (if one is going). Two students hitting at once both count, and the
 * last hit beats it exactly once. Returns what the student's screen shows, or null (no boss going).
 */
export async function hitClassBoss(classId: string, studentId: string, hits: number): Promise<(ClassBossView & { hit: boolean; justBeaten: boolean }) | null> {
  const b = await db.select().from(classBosses).where(and(eq(classBosses.classId, classId), isNull(classBosses.endedAt))).get();
  if (!b) return null;
  if (hits <= 0) return { ...classBossView(b), hit: false, justBeaten: false };
  await together([
    db
      .update(classBosses)
      .set({ hits: sql`min(${classBosses.need}, ${classBosses.hits} + ${hits})` })
      .where(and(eq(classBosses.id, b.id), isNull(classBosses.endedAt))),
    db
      .insert(classBossHits)
      .values({ bossId: b.id, studentId, hits })
      .onConflictDoUpdate({ target: [classBossHits.bossId, classBossHits.studentId], set: { hits: sql`${classBossHits.hits} + ${hits}` } }),
  ]);
  // the hit that finishes it (only one turn can win this update)
  const won = await db
    .update(classBosses)
    .set({ endedAt: new Date(), beaten: true })
    .where(and(eq(classBosses.id, b.id), isNull(classBosses.endedAt), sql`${classBosses.hits} >= ${classBosses.need}`))
    .run();
  const now = (await db.select().from(classBosses).where(eq(classBosses.id, b.id)).get()) ?? b;
  return { ...classBossView(now), hit: true, justBeaten: won.rowsAffected === 1 };
}

/**
 * A student who helped beat a class boss gets their fireflies (once per boss), on their next turn or when they
 * open the lesson. Returns how many they got (0: nothing owed).
 */
export async function claimClassBossReward(studentId: string): Promise<number> {
  const owed = await db
    .select({ bossId: classBossHits.bossId })
    .from(classBossHits)
    .innerJoin(classBosses, eq(classBosses.id, classBossHits.bossId))
    .where(and(eq(classBossHits.studentId, studentId), eq(classBossHits.rewarded, false), eq(classBosses.beaten, true)))
    .all();
  let got = 0;
  for (const o of owed) {
    // (marking it rewarded first: a reward can't be claimed twice by two requests at once)
    const mark = await db
      .update(classBossHits)
      .set({ rewarded: true })
      .where(and(eq(classBossHits.bossId, o.bossId), eq(classBossHits.studentId, studentId), eq(classBossHits.rewarded, false)))
      .run();
    if (mark.rowsAffected !== 1) continue;
    await db
      .insert(gloams)
      .values({ studentId, fireflies: CLASS_BOSS_REWARD, updatedAt: new Date() })
      .onConflictDoUpdate({ target: gloams.studentId, set: { fireflies: sql`${gloams.fireflies} + ${CLASS_BOSS_REWARD}`, updatedAt: new Date() } })
      .run();
    got += CLASS_BOSS_REWARD;
  }
  return got;
}

/** For the student's own data download: the class bosses they helped with (just their own hit counts) */
export async function classBossHitsOf(studentId: string) {
  return db.select({ hits: classBossHits.hits, rewarded: classBossHits.rewarded }).from(classBossHits).where(eq(classBossHits.studentId, studentId)).all();
}
