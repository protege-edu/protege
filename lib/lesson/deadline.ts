/**
 * Lesson deadlines. A deadline is optional (null = none, the default — Protégé never forces anything).
 * This module is pure and runs on the server AND in the browser, so the same rules decide "overdue"
 * everywhere. The human label is formatted in the browser, where the student's own time zone is known.
 */
export type DueStatus = "none" | "upcoming" | "soon" | "today" | "overdue";

const DAY = 86_400_000;

/** Whole-day difference between two instants in local time: "due tomorrow" even if it's less than 24h away. */
export function daysUntil(dueAt: number, now: number): number {
  const d = new Date(dueAt);
  const n = new Date(now);
  const midD = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const midN = new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime();
  return Math.round((midD - midN) / DAY);
}

/**
 * Where a lesson stands against its deadline. "overdue" is a precise instant (now past the deadline), so it's
 * the same whatever time zone the server is in; the softer "today/soon/upcoming" are for the gentle heads-up.
 */
export function dueStatus(dueAt: number | null, now: number): DueStatus {
  if (dueAt == null) return "none";
  if (now > dueAt) return "overdue";
  const days = daysUntil(dueAt, now);
  if (days <= 0) return "today";
  if (days <= 2) return "soon";
  return "upcoming";
}

/** A short, friendly due label for a student: "overdue", "due today", "due Friday", "due Mar 4". */
export function dueLabel(dueAt: number, now: number, lang: "en" | "fr"): string {
  const status = dueStatus(dueAt, now);
  const fr = lang === "fr";
  if (status === "overdue") return fr ? "en retard" : "overdue";
  if (status === "today") return fr ? "à rendre aujourd'hui" : "due today";
  const days = daysUntil(dueAt, now);
  if (days === 1) return fr ? "à rendre demain" : "due tomorrow";
  const d = new Date(dueAt);
  if (days <= 6) {
    const weekday = new Intl.DateTimeFormat(fr ? "fr-CA" : "en-CA", { weekday: "long" }).format(d);
    return fr ? `à rendre ${weekday}` : `due ${weekday}`;
  }
  const date = new Intl.DateTimeFormat(fr ? "fr-CA" : "en-CA", { month: "short", day: "numeric" }).format(d);
  return fr ? `à rendre le ${date}` : `due ${date}`;
}
