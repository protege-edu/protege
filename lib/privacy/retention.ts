/**
 * How long Protégé keeps things (the "retention" rules), in one place. Shown to teachers and in the
 * privacy documents, so what they say is what happens.
 *
 * The school board decides, with one setting (PROTEGE_RETENTION in protege.env / .env.local):
 *   "after-a-year"        (default) a class and all its students' work are deleted a year after the class
 *                         was last used. Ontario's MFIPPA (Reg. 823 s.5) asks for personal information that
 *                         was used to be kept at least a year, unless the board sets a different period.
 *   "end-of-school-year"  deleted at the end of the school year they were made in (SCHOOL_YEAR_END, June 30)
 *   "never"               kept until a teacher deletes them
 * A teacher can always set a date for one class, or delete it, a student, or their data, themselves.
 * Practice mode (no class, no name) is deleted after PRACTICE_DAYS without use.
 * Backups keep the last 7 days (lib/db/backup.ts), so anything deleted is gone from backups within a week.
 */
export type RetentionRule = "after-a-year" | "end-of-school-year" | "never";
export const RULES: RetentionRule[] = ["after-a-year", "end-of-school-year", "never"];
export const UNUSED_DAYS = 365;
export const PRACTICE_DAYS = 30;

export function retentionRule(): RetentionRule {
  const r = process.env.PROTEGE_RETENTION as RetentionRule | undefined;
  return r && RULES.includes(r) ? r : "after-a-year";
}

/** The school year ends on this month and day (SCHOOL_YEAR_END="MM-DD", default June 30) */
export function endOfSchoolYear(from = new Date()): Date {
  const [m, d] = (process.env.SCHOOL_YEAR_END ?? "06-30").split("-").map(Number);
  const end = new Date(from.getFullYear(), (m || 6) - 1, d || 30, 23, 59);
  if (end.getTime() <= from.getTime()) end.setFullYear(end.getFullYear() + 1);
  return end;
}

/** The delete date a new class starts with under the board's rule (null: none, the "a year after last use" rule or "never" applies) */
export const newClassDeleteOn = (): Date | null => (retentionRule() === "end-of-school-year" ? endOfSchoolYear() : null);
