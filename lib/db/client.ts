import "server-only";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { BUILT_IN } from "@/lib/lesson";
import * as schema from "./schema";

import { scheduleBackups } from "./backup";
import { OLD_DB_FILE, dbFile, ensureDataDir } from "./location";

function open() {
  ensureDataDir();
  const DB_FILE = dbFile();
  // One time: bring the database along from its old place inside the project (data/protege.db)
  if (!process.env.PROTEGE_DATA_DIR && !fs.existsSync(DB_FILE) && fs.existsSync(OLD_DB_FILE)) {
    const old = new Database(OLD_DB_FILE);
    old.pragma("wal_checkpoint(TRUNCATE)");
    old.close();
    fs.copyFileSync(OLD_DB_FILE, DB_FILE);
    fs.writeFileSync(path.join(path.dirname(OLD_DB_FILE), "MOVED.txt"), `Protégé's database now lives at ${DB_FILE}\nThis old copy isn't used any more. You can delete this folder.\n`);
  }
  const sqlite = new Database(DB_FILE);
  // WAL lets many students read while one writes. Matters for Phase 4 classroom mode.
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  // Built-in lessons get a row too, so classes and sessions can point at them like any other lesson
  const now = new Date();
  for (const b of Object.values(BUILT_IN)) {
    db.insert(schema.lessons)
      .values({ id: b.id, title: b.title, grade: b.grade, status: "approved", blueprint: b, sourceName: "Built into Protégé", createdAt: now, updatedAt: now, approvedAt: now })
      .onConflictDoNothing()
      .run();
  }
  scheduleBackups(sqlite);
  return db;
}

// Reuse one connection across hot reloads in development.
const globalForDb = globalThis as unknown as { protegeDb?: ReturnType<typeof open> };
export const db = globalForDb.protegeDb ?? open();
if (process.env.NODE_ENV !== "production") globalForDb.protegeDb = db;
