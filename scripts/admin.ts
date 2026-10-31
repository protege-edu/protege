/**
 * Jobs for whoever runs Protégé. From the code (the local database, or the online one when
 * TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are set):
 *   npm run access-log [-- --all]          who viewed or changed students' information, and when
 *   npm run reset-teacher -- their@email   a new recovery code for a teacher who lost theirs
 * To put the online database back to an earlier moment, Turso keeps its recent history: see the README.
 */
import path from "node:path";

const say = (s = "") => console.log(s);

/** The access log: ids and kinds of action only, shown with today's names where they still exist */
async function accessLog(all: boolean) {
  const { desc } = await import("drizzle-orm");
  const { db } = await import("@/lib/db/client");
  const { accessLog, classes, students, teachers } = await import("@/lib/db/schema");
  const rows = await db.select().from(accessLog).orderBy(desc(accessLog.id)).limit(all ? 1_000_000 : 200).all();
  const nameOf = <T extends { id: string }>(list: T[], pick: (t: T) => string) => new Map(list.map((x) => [x.id, pick(x)]));
  const who = nameOf(await db.select({ id: teachers.id, email: teachers.email }).from(teachers).all(), (t) => t.email);
  const cls = nameOf(await db.select({ id: classes.id, name: classes.name }).from(classes).all(), (c) => c.name);
  const kid = nameOf(await db.select({ id: students.id, nickname: students.nickname }).from(students).all(), (s) => s.nickname);
  if (!rows.length) return say("Nothing in the access log yet.");
  for (const r of rows.reverse()) {
    const c = r.classId ? (cls.get(r.classId) ?? `(deleted class ${r.classId.slice(0, 8)})`) : "";
    const s = r.studentId ? (kid.get(r.studentId) ?? `(removed student ${r.studentId.slice(0, 8)})`) : "";
    say(`${r.at.toISOString().replace("T", " ").slice(0, 19)}  ${who.get(r.teacherId) ?? r.teacherId}  ${r.action}  ${c}${s ? ` / ${s}` : ""}`);
  }
}

/** A teacher lost their password AND their recovery code: a new recovery code, from this computer only */
async function resetTeacher(email?: string) {
  if (!email) return say("Which teacher? Add their email, for example: reset-teacher their@school.ca");
  const { resetFromLaptop } = await import("@/lib/teacher/auth");
  const code = await resetFromLaptop(email);
  if (!code) return say(`No teacher account uses ${email}. Check the spelling.`);
  say(`\nNew recovery code for ${email}:  ${code}\nOn the sign-in page, they press "Forgot your password?" and use it to pick a new password.\n`);
}

export async function admin(args: string[]) {
  const [job, arg] = args;
  if (job === "access-log") return accessLog(arg === "--all");
  if (job === "reset-teacher") return resetTeacher(arg);
  say("Jobs: access-log [--all], reset-teacher <email>");
}

if (process.argv[1] && /admin/.test(path.basename(process.argv[1]))) {
  admin(process.argv.slice(2)).catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
