import "server-only";
import { createClient } from "@libsql/client";
import type { BatchItem } from "drizzle-orm/batch";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { databaseUrl, ensureDataDir } from "./location";
import * as schema from "./schema";

export type Db = LibSQLDatabase<typeof schema>;

/**
 * Protégé's database: SQLite, online at Turso (TURSO_DATABASE_URL + TURSO_AUTH_TOKEN), or a file on this
 * computer while developing (lib/db/location.ts). Its tables come from the migrations in drizzle/
 * (`npm run db:migrate`: `npm run dev` runs it first, and so does the build online).
 *
 * Online, every query waits for the database over the network, so every call is `await`ed.
 * Changes that must happen together go in one together([...]), which runs all-or-nothing.
 */
function open(): Db {
  const local = !process.env.TURSO_DATABASE_URL;
  if (local) ensureDataDir();
  const client = createClient({ url: databaseUrl(), authToken: process.env.TURSO_AUTH_TOKEN });
  // (a file on this computer: let many students read while one writes, and check that rows point at real rows)
  if (local) void client.executeMultiple("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  return drizzle(client, { schema });
}

// One connection, kept across code reloads while developing
const store = globalThis as unknown as { protegeDb?: Db };
export const db: Db = (store.protegeDb ??= open());

/**
 * Changes that must all happen or not at all. Build the queries without .run():
 * `await together([db.insert(a).values(x), db.update(b).set(y).where(z)])`. Returns each query's result.
 */
export async function together(queries: BatchItem<"sqlite">[]) {
  if (queries.length === 0) return [];
  return db.batch(queries as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
}
