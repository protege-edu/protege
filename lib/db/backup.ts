import "server-only";
import fs from "node:fs";
import path from "node:path";
import type Database from "better-sqlite3";
import { dataDir } from "./location";

/**
 * Daily backups of the database, in the data folder next to it (never anywhere else: they hold
 * students' work). The last 7 days are kept; older ones are deleted, so deleted data really goes.
 * A teacher restores one with `npm run restore` (see README, "Backups").
 */
export const KEEP_DAYS = 7;
export const backupDir = () => path.join(dataDir(), "backups");
const fileFor = (day: string) => path.join(backupDir(), `protege-${day}.db`);
const today = () => new Date().toISOString().slice(0, 10);

/** Every backup, newest first */
export function listBackups(): { file: string; day: string; at: Date }[] {
  if (!fs.existsSync(backupDir())) return [];
  return fs
    .readdirSync(backupDir())
    .filter((f) => /^protege-\d{4}-\d{2}-\d{2}\.db$/.test(f))
    .map((f) => ({ file: path.join(backupDir(), f), day: f.slice(8, 18), at: fs.statSync(path.join(backupDir(), f)).mtime }))
    .sort((a, b) => b.day.localeCompare(a.day));
}

/** Make today's backup now (a consistent copy, even while students are writing) and drop old ones */
export async function backupNow(sqlite: Database.Database) {
  fs.mkdirSync(backupDir(), { recursive: true });
  const to = fileFor(today());
  await sqlite.backup(`${to}.part`);
  fs.renameSync(`${to}.part`, to);
  for (const old of listBackups().slice(KEEP_DAYS)) fs.rmSync(old.file, { force: true });
}

/** Delete every backup (part of "delete everything": nothing a teacher deleted may live on in a backup) */
export function deleteBackups() {
  for (const b of listBackups()) fs.rmSync(b.file, { force: true });
}

/** Once a day while Protégé runs: a backup if today has none yet (checked hourly) */
export function scheduleBackups(sqlite: Database.Database) {
  const flag = globalThis as unknown as { protegeBackups?: boolean };
  if (flag.protegeBackups || process.env.PROTEGE_NO_BACKUPS) return;
  flag.protegeBackups = true;
  const check = () => {
    if (!fs.existsSync(fileFor(today()))) backupNow(sqlite).catch((e) => console.error("[backup] failed:", e instanceof Error ? e.message : e));
  };
  setTimeout(check, 30_000).unref();
  setInterval(check, 60 * 60 * 1000).unref();
}
