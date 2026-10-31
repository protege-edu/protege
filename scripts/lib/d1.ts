/**
 * Scripts open the same database the app uses while developing: the local copy of Cloudflare D1 that
 * `next dev` and `npm run db:migrate` keep in .wrangler/state. Or a throwaway one in another folder (tests).
 */
import { execSync } from "node:child_process";
import path from "node:path";
import { getPlatformProxy } from "wrangler";
import { setDatabase } from "@/lib/db/client";

export async function openDatabase(opts: { folder?: string } = {}) {
  if (opts.folder) migrate(opts.folder);
  // (wrangler keeps its data in <folder>/v3)
  const proxy = await getPlatformProxy<CloudflareEnv>({ persist: opts.folder ? { path: path.join(opts.folder, "v3") } : true });
  setDatabase(proxy.env.DB);
  return { close: () => proxy.dispose() };
}

/** Make (or bring up to date) the tables of a local database, from the migrations in drizzle/ */
export function migrate(folder?: string) {
  execSync(`npx wrangler d1 migrations apply protege --local${folder ? ` --persist-to "${folder}"` : ""}`, { stdio: "ignore", env: { ...process.env, CI: "1" } });
}
