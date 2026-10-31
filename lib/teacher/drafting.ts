import "server-only";
import { after } from "next/server";
import { eq } from "drizzle-orm";
import { secret } from "@/lib/auth/crypto";
import { db } from "@/lib/db/client";
import { lessons } from "@/lib/db/schema";
import { appUrl } from "@/lib/hosting/app";
import { runDraft } from "./lessons";
import { draftNext } from "./units";

/**
 * Who drafts lessons, and when.
 *
 * Drafting a lesson takes Claude about 40 seconds. Online (Vercel), each lesson is drafted in its OWN
 * request to app/api/internal/draft, which answers straight away and keeps working afterwards (up to
 * 5 minutes): so a long unit, drafted one lesson after another, never runs out of time. On this computer
 * (`next dev`), it's drafted in the background of the request that asked.
 *
 * Everything about a draft lives in the database (status, progress), never in one server's memory,
 * because online every request can land on a different copy of the server.
 */

/** The lesson's row already says "drafting": get it drafted */
export async function draftLater(lessonId: string) {
  const online = appUrl();
  if (online) {
    try {
      const res = await fetch(`${online}/api/internal/draft`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-protege-internal": await secret() },
        body: JSON.stringify({ lessonId }),
        signal: AbortSignal.timeout(15_000),
      });
      if (res.ok) return;
    } catch {
      // (couldn't reach ourselves: draft it right here instead)
    }
  }
  inBackground(() => draftNow(lessonId));
}

/** Draft it now. Resolves when done, either way. */
export async function draftNow(lessonId: string) {
  const row = await db.select().from(lessons).where(eq(lessons.id, lessonId)).get();
  // deleted, or already done
  if (!row?.sourceText || row.status !== "drafting") return;
  // the title is a hint for Gloam unless it's just the file's name (lib/teacher/lessons.ts startDraft)
  const hinted = row.ownTitle || row.unitId || (row.title !== row.sourceName && row.title !== "New lesson");
  await runDraft(lessonId, { source: row.sourceText, grade: row.grade, titleHint: hinted ? row.title : undefined, ownTitle: !!row.ownTitle });
  // a unit's lessons are drafted one at a time: this one's done, so the next one starts
  if (row.unitId) await draftNext();
}

/** Keep `job` running after the response is sent */
export function inBackground(job: () => Promise<unknown>) {
  const run = () => job().catch((err) => console.error("[background]", err));
  try {
    after(run);
  } catch {
    // (outside a request, e.g. a script, or already inside an after(): it just runs)
    void run();
  }
}
