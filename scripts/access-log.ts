/**
 * The access log, for the school's privacy officer: who looked at or changed a student's information, and when.
 * Ids and kinds of action only (Protégé never logs what anyone wrote). Run it on the computer running Protégé.
 *
 *   npm run access-log               the last 200 entries
 *   npm run access-log -- --all      everything (kept two years)
 */
import { desc } from "drizzle-orm";

async function main() {
  const { db } = await import("@/lib/db/client");
  const { accessLog, classes, students, teachers } = await import("@/lib/db/schema");
  const rows = db.select().from(accessLog).orderBy(desc(accessLog.id)).limit(process.argv.includes("--all") ? 1_000_000 : 200).all();
  const nameOf = <T extends { id: string }>(list: T[], pick: (t: T) => string) => new Map(list.map((x) => [x.id, pick(x)]));
  const who = nameOf(db.select({ id: teachers.id, email: teachers.email }).from(teachers).all(), (t) => t.email);
  const cls = nameOf(db.select({ id: classes.id, name: classes.name }).from(classes).all(), (c) => c.name);
  const kid = nameOf(db.select({ id: students.id, nickname: students.nickname }).from(students).all(), (s) => s.nickname);
  if (!rows.length) return console.log("Nothing in the access log yet.");
  for (const r of rows.reverse()) {
    const c = r.classId ? (cls.get(r.classId) ?? `(deleted class ${r.classId.slice(0, 8)})`) : "";
    const s = r.studentId ? (kid.get(r.studentId) ?? `(removed student ${r.studentId.slice(0, 8)})`) : "";
    console.log(`${r.at.toISOString().replace("T", " ").slice(0, 19)}  ${who.get(r.teacherId) ?? r.teacherId}  ${r.action}  ${c}${s ? ` / ${s}` : ""}`);
  }
}

void main();
