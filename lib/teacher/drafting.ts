import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { lessons } from "@/lib/db/schema";
import { runDraft } from "./lessons";
import { draftNext } from "./units";

/**
 * Who drafts lessons, and when.
 *
 * Drafting a lesson takes Claude about 40 seconds: longer than Cloudflare lets work carry on after a page
 * has its answer. So online, a lesson to draft goes into a Cloudflare Queue (wrangler.jsonc: DRAFTS), and
 * the queue hands it back to the app as an internal request (worker.ts -> app/api/internal/draft), which
 * may take up to 15 minutes. While developing (`next dev`, no queue), it's drafted in the background.
 *
 * Everything about a draft lives in the database (status, progress), never in one server's memory,
 * because online every request can land on a different copy of the server.
 */

/** The lesson's row already says "drafting": get it drafted */
export async function draftLater(lessonId: string) {
  const queue = process.env.NODE_ENV === "production" ? getCloudflareContext().env.DRAFTS : undefined;
  if (queue) {
    await queue.send({ lessonId });
    return;
  }
  inBackground(() => draftNow(lessonId));
}

/** Draft it now (the queue's internal request, or the background while developing). Resolves when done, either way. */
export async function draftNow(lessonId: string) {
  const row = await db.select().from(lessons).where(eq(lessons.id, lessonId)).get();
  // deleted, or already done (a queue can deliver a message twice)
  if (!row?.sourceText || row.status !== "drafting") return;
  // the title is a hint for Gloam unless it's just the file's name (lib/teacher/lessons.ts startDraft)
  const hinted = row.ownTitle || row.unitId || (row.title !== row.sourceName && row.title !== "New lesson");
  await runDraft(lessonId, { source: row.sourceText, grade: row.grade, titleHint: hinted ? row.title : undefined, ownTitle: !!row.ownTitle });
  // a unit's lessons are drafted one at a time: this one's done, so the next one starts
  if (row.unitId) await draftNext();
}

/** Keep `job` running after the response is sent (Cloudflare allows ~30 s: use the queue for anything longer) */
export function inBackground(job: () => Promise<unknown>) {
  const running = job().catch((err) => console.error("[background]", err));
  try {
    getCloudflareContext().ctx.waitUntil(running);
  } catch {
    // (outside a request, e.g. a script: it just runs)
  }
}
