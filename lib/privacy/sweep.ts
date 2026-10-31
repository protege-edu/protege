import "server-only";
import { and, eq, isNotNull, isNull, lt, lte, max } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { accessLog, classes, students, teachSessions } from "@/lib/db/schema";
import { deleteClass, eraseStudent } from "@/lib/teacher/classes";
import { PRACTICE_DAYS, UNUSED_DAYS, retentionRule } from "./retention";

/**
 * The daily clean-up: classes past their delete date go (with all their students' work), and practice-mode
 * students nobody has used for a while. Returns what it removed (counts only).
 * Vercel runs it once a day (vercel.json: crons -> app/api/internal/sweep).
 */
export async function sweep(now = new Date()): Promise<{ classes: number; practice: number }> {
  const due = await db.select({ id: classes.id }).from(classes).where(and(isNotNull(classes.deleteOn), lte(classes.deleteOn, now))).all();
  // the default rule: classes without a date go a year after anyone last used them
  if (retentionRule() === "after-a-year") {
    const idle = new Date(now.getTime() - UNUSED_DAYS * 86_400_000);
    for (const c of await db.select({ id: classes.id, created: classes.createdAt }).from(classes).where(isNull(classes.deleteOn)).all()) {
      const seen = (await db.select({ at: max(students.lastSeenAt) }).from(students).where(eq(students.classId, c.id)).get())?.at;
      const taught = (await db.select({ at: max(teachSessions.updatedAt) }).from(teachSessions).where(eq(teachSessions.classId, c.id)).get())?.at;
      const last = Math.max(c.created.getTime(), seen ? new Date(seen).getTime() : 0, taught ? new Date(taught).getTime() : 0);
      if (last < idle.getTime()) due.push({ id: c.id });
    }
  }
  for (const c of due) await deleteClass(c.id);
  const cutoff = new Date(now.getTime() - PRACTICE_DAYS * 86_400_000);
  // practice students: judged by the last time they taught Gloam anything (or when they started, if never)
  const lastUsed = await db
    .select({ id: students.id, created: students.createdAt, used: max(teachSessions.updatedAt) })
    .from(students)
    .leftJoin(teachSessions, eq(teachSessions.studentId, students.id))
    .where(isNull(students.classId))
    .groupBy(students.id)
    .all();
  const stale = lastUsed.filter((s) => (s.used ? new Date(s.used) : s.created) < cutoff);
  for (const s of stale) await eraseStudent(s.id);
  // the access log is kept two years (long enough to look into a problem, no longer)
  await db.delete(accessLog).where(lt(accessLog.at, new Date(now.getTime() - 730 * 86_400_000))).run();
  return { classes: due.length, practice: stale.length };
}
