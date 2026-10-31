/**
 * The Worker Cloudflare runs (wrangler.jsonc: main): the Next.js app, built by OpenNext into .open-next/,
 * plus two jobs that don't come from a browser:
 *   queue      lessons waiting to be drafted (lib/teacher/drafting.ts), up to 15 minutes each
 *   scheduled  the daily clean-up of classes past their delete date (lib/privacy/sweep.ts)
 * Both are handed to the app as internal requests (app/api/internal/*), so Protégé's code always runs
 * the same way. Only this Worker can make them: they carry the app's own secret, read from its database.
 * (Bundled by wrangler, not Next.js: `npm run cf:build` builds the app first.)
 */
import type { D1Database, ExecutionContext, ExportedHandler, MessageBatch, ScheduledController } from "@cloudflare/workers-types";
// @ts-expect-error: made by `opennextjs-cloudflare build`
import app from "./.open-next/worker.js";

interface Env {
  DB: D1Database;
}

const next = app as Required<Pick<ExportedHandler<Env>, "fetch">>;

async function internal(path: string, body: unknown, env: Env, ctx: ExecutionContext): Promise<boolean> {
  const row = await env.DB.prepare("SELECT value FROM settings WHERE key = 'cookie_secret'").first<{ value: string }>();
  // (no secret yet: nobody has ever signed in, so there's nothing to draft or clean up)
  if (!row) return true;
  const request = new Request(`https://protege.internal${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-protege-internal": row.value },
    body: JSON.stringify(body),
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await next.fetch(request as any, env, ctx);
  return res.ok;
}

const worker = {
  fetch: next.fetch,

  async queue(batch: MessageBatch<{ lessonId: string }>, env: Env, ctx: ExecutionContext) {
    for (const message of batch.messages) {
      if (await internal("/api/internal/draft", message.body, env, ctx)) message.ack();
      else message.retry();
    }
  },

  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(internal("/api/internal/sweep", {}, env, ctx));
  },
};

export default worker;
