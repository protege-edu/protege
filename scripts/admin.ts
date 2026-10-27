/**
 * Jobs for whoever runs Protégé, on the computer running it. From the code:
 *   npm run restore [-- 2026-10-25]        list backups, or put Protégé back to that day (stop Protégé first)
 *   npm run access-log [-- --all]          who viewed or changed students' information, and when
 *   npm run reset-teacher -- their@email   a new recovery code for a teacher who lost theirs
 * In the download, the launcher runs the same jobs (node launch.js --restore, --access-log, --reset-teacher).
 */
import fs from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { backupDir } from "@/lib/db/backup";
import { dataDir, dbFile } from "@/lib/db/location";

const say = (s = "") => console.log(s);

function backups() {
  return fs.existsSync(backupDir())
    ? fs
        .readdirSync(backupDir())
        .filter((f) => /^protege-\d{4}-\d{2}-\d{2}\.db$/.test(f))
        .sort()
        .reverse()
        .map((f) => f.slice(8, 18))
    : [];
}

/** Put Protégé back to an earlier day from its daily backups. Today's database is kept first, so it can be undone. */
async function restore(day?: string) {
  const days = backups();
  if (!days.length) return say(`No backups yet. Protégé makes one each day it runs, in ${backupDir()}`);
  if (!day) {
    say("Backups (newest first):");
    days.forEach((d, i) => say(`  ${i + 1}. ${d}`));
    if (!process.stdin.isTTY) return say("\nRun again with the date to restore.");
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const pick = (await rl.question("\nWhich one? Type its number (or press Enter to cancel): ")).trim();
    rl.close();
    day = days[Number(pick) - 1];
    if (!day) return say("Nothing changed.");
  }
  if (!days.includes(day)) return say(`There's no backup from ${day}.`);
  const db = dbFile();
  const port = process.env.PORT ?? "3000";
  const running = await fetch(`http://localhost:${port}/api/health`, { signal: AbortSignal.timeout(1500) }).then(
    () => true,
    () => false,
  );
  try {
    // Windows won't move a file another program has open
    if (!running && fs.existsSync(db)) {
      fs.renameSync(db, `${db}.checking`);
      fs.renameSync(`${db}.checking`, db);
    }
  } catch {
    return say("Protégé seems to be running. Stop it (close its window), then run this again.");
  }
  if (running) return say("Protégé is running. Stop it (close its window), then run this again.");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  if (fs.existsSync(db)) fs.copyFileSync(db, path.join(dataDir(), `protege-before-restore-${stamp}.db`));
  for (const extra of ["-wal", "-shm"]) fs.rmSync(db + extra, { force: true });
  fs.copyFileSync(path.join(backupDir(), `protege-${day}.db`), db);
  say(`Restored Protégé to ${day}. (Today's copy is kept as protege-before-restore-${stamp}.db.) Start Protégé again.`);
}

/** The access log: ids and kinds of action only, shown with today's names where they still exist */
async function accessLog(all: boolean) {
  const { desc } = await import("drizzle-orm");
  const { db } = await import("@/lib/db/client");
  const { accessLog, classes, students, teachers } = await import("@/lib/db/schema");
  const rows = db.select().from(accessLog).orderBy(desc(accessLog.id)).limit(all ? 1_000_000 : 200).all();
  const nameOf = <T extends { id: string }>(list: T[], pick: (t: T) => string) => new Map(list.map((x) => [x.id, pick(x)]));
  const who = nameOf(db.select({ id: teachers.id, email: teachers.email }).from(teachers).all(), (t) => t.email);
  const cls = nameOf(db.select({ id: classes.id, name: classes.name }).from(classes).all(), (c) => c.name);
  const kid = nameOf(db.select({ id: students.id, nickname: students.nickname }).from(students).all(), (s) => s.nickname);
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
  const code = resetFromLaptop(email);
  if (!code) return say(`No teacher account uses ${email}. Check the spelling.`);
  say(`\nNew recovery code for ${email}:  ${code}\nOn the sign-in page, they press "Forgot your password?" and use it to pick a new password.\n`);
}

export async function admin(args: string[]) {
  const [job, arg] = args;
  if (job === "restore") return restore(arg);
  if (job === "access-log") return accessLog(arg === "--all");
  if (job === "reset-teacher") return resetTeacher(arg);
  say("Jobs: restore [date], access-log [--all], reset-teacher <email>");
}

if (process.argv[1] && /admin/.test(path.basename(process.argv[1]))) {
  admin(process.argv.slice(2)).catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
