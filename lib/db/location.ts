import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Where Protégé's database is while developing: a file on this computer, in the app-data folder, OUTSIDE
 * the project (inside it, the dev server sees the database's files change on every read and keeps
 * reloading the page). Set PROTEGE_DATA_DIR to use another folder (tests use a throwaway one).
 * Online, the database is at Turso instead (TURSO_DATABASE_URL).
 */
export function dataDir(): string {
  if (process.env.PROTEGE_DATA_DIR) return process.env.PROTEGE_DATA_DIR;
  const base = process.platform === "win32" ? (process.env.LOCALAPPDATA ?? path.join(os.homedir(), "AppData", "Local")) : process.env.XDG_DATA_HOME ?? path.join(os.homedir(), ".local", "share");
  return path.join(base, "Protege");
}

export function dbFile(): string {
  return path.join(dataDir(), "protege.db");
}


export function ensureDataDir() {
  fs.mkdirSync(dataDir(), { recursive: true });
}

/** The database to open: Turso online, or the local file (libSQL reads both) */
export function databaseUrl(): string {
  return process.env.TURSO_DATABASE_URL ?? `file:${dbFile().replace(/\\/g, "/")}`;
}
