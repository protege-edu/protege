import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Where Protégé keeps its database: on this computer, in the app-data folder, OUTSIDE the project.
 * (Inside the project, the dev server sees the database's files change on every read and keeps
 * reloading the page.) Set PROTEGE_DATA_DIR to put it somewhere else, e.g. on a teacher's laptop.
 * Nothing here ever leaves the machine.
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
