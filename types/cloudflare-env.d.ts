import type { D1Database, Queue } from "@cloudflare/workers-types";

// What Cloudflare hands the app (wrangler.jsonc): read with getCloudflareContext().env
declare global {
  interface CloudflareEnv {
    DB: D1Database;
    /** lessons waiting to be drafted (lib/teacher/drafting.ts) */
    DRAFTS?: Queue<{ lessonId: string }>;
  }
}

export {};
