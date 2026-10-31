import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { D1Database } from "@cloudflare/workers-types";
import type { BatchItem } from "drizzle-orm/batch";
import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "./schema";

export type Db = DrizzleD1Database<typeof schema>;

/**
 * Protégé's database: Cloudflare D1, an online SQLite database (wrangler.jsonc, binding "DB").
 * Its tables come from the migrations in drizzle/ (`npm run db:migrate`, or `npm run db:migrate:online`).
 *
 * Every query waits for the database over the network, so every call is `await`ed. D1 can't hold a
 * transaction open while code runs: changes that must happen together go in one `db.batch([...])`,
 * which D1 runs all-or-nothing.
 *
 * Online and in `next dev`, Cloudflare hands the app the database. Scripts hand it in with setDatabase().
 */
let given: D1Database | null = null;
export function setDatabase(d1: D1Database) {
  given = d1;
}

const made = new WeakMap<object, Db>();
function current(): Db {
  const d1 = given ?? getCloudflareContext().env.DB;
  let d = made.get(d1);
  if (!d) {
    d = drizzle(d1, { schema });
    made.set(d1, d);
  }
  return d;
}

/**
 * Changes that must all happen or not at all (D1's stand-in for a transaction). Build the queries without
 * .run(): `await together([db.insert(a).values(x), db.update(b).set(y).where(z)])`. Returns each query's result.
 */
export async function together(queries: BatchItem<"sqlite">[]) {
  if (queries.length === 0) return [];
  return db.batch(queries as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
}

/** The database for this request (looked up on each use, because Cloudflare hands it over per request) */
export const db: Db = new Proxy({} as Db, {
  get(_, key) {
    const real = current();
    const value = Reflect.get(real, key, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});
