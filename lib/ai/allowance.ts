import "server-only";
import { desc, eq, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { aiUsage, classes, students } from "@/lib/db/schema";

/**
 * How much Gloam's brain (Claude, which costs money per use) may be used in one day, so one class, one
 * student, or a stranger who got a staff code can't run up the bill. A busy student sends about 60 messages
 * in a class; a message costs about a hundredth of a cent. Whoever runs Protégé can change these (env vars).
 * When a limit is reached, Gloam falls asleep in character until tomorrow (lib/age-styles: lines.tired).
 */
export const DAILY = {
  /** messages one student may send */
  student: Number(process.env.AI_DAILY_PER_STUDENT ?? 300),
  /** messages one class may send, all its students together */
  class: Number(process.env.AI_DAILY_PER_CLASS ?? 3000),
  /** lessons one teacher may draft */
  drafts: Number(process.env.AI_DAILY_DRAFTS_PER_TEACHER ?? 40),
  /** everything on this Protégé (a lesson counts as 50 messages): about $2 a day at most */
  all: Number(process.env.AI_DAILY_TOTAL ?? 20000),
};
const DRAFT_WEIGHT = 50;

/** Today, in Toronto (a school day), like 2026-10-31 */
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

/** Add to today's count and say what it is now (the database adds, so two at once can't both read the old number) */
async function bump(key: string, by = 1): Promise<number> {
  const [row] = await db
    .insert(aiUsage)
    .values({ key, day: today(), count: by })
    .onConflictDoUpdate({ target: [aiUsage.key, aiUsage.day], set: { count: sql`${aiUsage.count} + ${by}` } })
    .returning({ count: aiUsage.count });
  return row?.count ?? by;
}

/** A student's message: may Gloam's brain answer it today? (Counts it.) */
export async function mayTeach(studentId: string): Promise<boolean> {
  const s = await db.select({ classId: students.classId }).from(students).where(eq(students.id, studentId)).get();
  const [mine, cls, all] = await Promise.all([bump(`student:${studentId}`), s?.classId ? bump(`class:${s.classId}`) : 0, bump("all")]);
  return mine <= DAILY.student && cls <= DAILY.class && all <= DAILY.all;
}

/** A teacher drafting `lessons` lessons: allowed today? (Counts them.) */
export async function mayDraft(teacherId: string, lessons = 1): Promise<boolean> {
  const [mine, all] = await Promise.all([bump(`drafts:${teacherId}`, lessons), bump("all", lessons * DRAFT_WEIGHT)]);
  return mine <= DAILY.drafts && all <= DAILY.all;
}

/** For the owner page: today's use, the busiest classes first (counts only) */
export async function usageToday() {
  const rows = await db.select().from(aiUsage).where(eq(aiUsage.day, today())).orderBy(desc(aiUsage.count)).all();
  const all = rows.find((r) => r.key === "all")?.count ?? 0;
  const busiest = rows.filter((r) => r.key.startsWith("class:")).slice(0, 5);
  const names = new Map(
    busiest.length
      ? (await db.select({ id: classes.id, name: classes.name }).from(classes).all()).map((c) => [c.id, c.name])
      : [],
  );
  return {
    all,
    limit: DAILY.all,
    classes: busiest.map((r) => ({ name: names.get(r.key.slice(6)) ?? "(deleted class)", messages: r.count, limit: DAILY.class })),
  };
}

/** The daily clean-up: counts older than two days are forgotten */
export async function forgetOldUsage() {
  const cutoff = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(Date.now() - 2 * 86_400_000));
  await db.delete(aiUsage).where(lt(aiUsage.day, cutoff)).run();
}
