/**
 * Makes (or brings up to date) Protégé's database tables, from the migrations in drizzle/.
 *   npm run db:migrate      the local file while developing (npm run dev runs it first)
 * Online, the build runs it against Turso (vercel.json: buildCommand), with TURSO_DATABASE_URL set.
 */
import path from "node:path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { databaseUrl, ensureDataDir } from "@/lib/db/location";

export async function migrateDatabase() {
  if (!process.env.TURSO_DATABASE_URL) ensureDataDir();
  const client = createClient({ url: databaseUrl(), authToken: process.env.TURSO_AUTH_TOKEN });
  try {
    await migrate(drizzle(client), { migrationsFolder: path.join(process.cwd(), "drizzle") });
  } finally {
    client.close();
  }
}

if (process.argv[1] && /migrate/.test(path.basename(process.argv[1]))) {
  migrateDatabase().then(
    () => console.log(`Database ready (${process.env.TURSO_DATABASE_URL ? "Turso" : "this computer"}).`),
    (e) => {
      console.error("Couldn't set up the database:", e instanceof Error ? e.message : e);
      process.exit(1);
    },
  );
}
