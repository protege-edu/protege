/**
 * Put Protégé back the way it was on an earlier day, from its daily backups.
 *
 *   npm run restore                  list the backups
 *   npm run restore -- 2026-10-25    restore that day (stop Protégé first)
 *
 * Today's database is kept as protege-before-restore-<time>.db first, so a restore can be undone.
 */
import fs from "node:fs";
import path from "node:path";
import { backupDir } from "@/lib/db/backup";
import { dataDir, dbFile } from "@/lib/db/location";

const day = process.argv[2];
const backups = fs.existsSync(backupDir())
  ? fs
      .readdirSync(backupDir())
      .filter((f) => /^protege-\d{4}-\d{2}-\d{2}\.db$/.test(f))
      .sort()
      .reverse()
  : [];

if (!day) {
  if (!backups.length) console.log(`No backups yet. Protégé makes one each day it runs, in ${backupDir()}`);
  else {
    console.log("Backups (newest first):");
    for (const f of backups) console.log(`  ${f.slice(8, 18)}`);
    console.log("\nStop Protégé, then: npm run restore -- <date>");
  }
  process.exit(0);
}

const file = path.join(backupDir(), `protege-${day}.db`);
if (!fs.existsSync(file)) {
  console.error(`There's no backup from ${day}. Run \`npm run restore\` to see the list.`);
  process.exit(1);
}
async function main() {
  const db = dbFile();
  // a running Protégé holds the database open: refuse rather than corrupt it
  const running = () => {
    console.error("Protégé seems to be running. Stop it (Ctrl+C in its window), then run this again.");
    process.exit(1);
  };
  const port = process.env.PORT ?? "3000";
  if (await fetch(`http://localhost:${port}/api/health`, { signal: AbortSignal.timeout(1500) }).then(() => true, () => false)) running();
  try {
    // Windows won't move a file another program has open
    if (fs.existsSync(db)) {
      fs.renameSync(db, `${db}.checking`);
      fs.renameSync(`${db}.checking`, db);
    }
  } catch {
    running();
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  if (fs.existsSync(db)) fs.copyFileSync(db, path.join(dataDir(), `protege-before-restore-${stamp}.db`));
  for (const extra of ["-wal", "-shm"]) fs.rmSync(db + extra, { force: true });
  fs.copyFileSync(file, db);
  console.log(`Restored Protégé to ${day}. (Today's copy is kept as protege-before-restore-${stamp}.db.) Start Protégé again.`);
}

void main();
