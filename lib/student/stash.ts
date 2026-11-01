import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { gloams } from "@/lib/db/schema";
import { canBuy, MAX_OUT, stashItem } from "@/lib/game/stash";

export interface StashState {
  /** fireflies in the jar right now (caught minus spent) */
  jar: number;
  owned: string[];
  /** the ones standing around Gloam's home */
  placed: string[];
}

export async function stashOf(studentId: string): Promise<StashState> {
  const g = await db.select().from(gloams).where(eq(gloams.studentId, studentId)).get();
  return { jar: Math.max(0, (g?.fireflies ?? 0) - (g?.spent ?? 0)), owned: g?.owned ?? [], placed: g?.wearing ?? [] };
}

/**
 * Buy something for Gloam's home with fireflies. The jar is checked and spent in one step (two clicks
 * at once can't spend the same fireflies twice), and a bought thing goes straight next to Gloam (if
 * there's room: MAX_OUT at once).
 */
export async function buy(studentId: string, id: string): Promise<{ ok: true; stash: StashState } | { ok: false; error: string }> {
  const item = stashItem(id);
  const now = await stashOf(studentId);
  const why = canBuy(id, now.jar, now.owned);
  if (!item || why === "unknown") return { ok: false, error: "That isn't in Gloam's stash." };
  if (why === "owned") return { ok: false, error: "Gloam already has that one." };
  if (why === "short") return { ok: false, error: `That needs ${item.price - now.jar} more fireflies. Teach Gloam to catch some!` };
  const res = await db
    .update(gloams)
    .set({ spent: sql`${gloams.spent} + ${item.price}`, owned: [...now.owned, id], wearing: now.placed.length < MAX_OUT ? [...now.placed, id] : now.placed, updatedAt: new Date() })
    // (only if nothing changed since we looked, and the jar still has enough)
    .where(and(eq(gloams.studentId, studentId), sql`${gloams.fireflies} - ${gloams.spent} >= ${item.price}`, eq(gloams.owned, now.owned)))
    .run();
  if (res.rowsAffected !== 1) return { ok: false, error: "Something changed at the same time. Try again." };
  return { ok: true, stash: await stashOf(studentId) };
}

/** Put something they own next to Gloam, or put it away */
export async function place(studentId: string, id: string, on: boolean): Promise<StashState> {
  const now = await stashOf(studentId);
  if (!now.owned.includes(id) || (on && !now.placed.includes(id) && now.placed.length >= MAX_OUT)) return now;
  const placed = on ? [...new Set([...now.placed, id])] : now.placed.filter((x) => x !== id);
  await db.update(gloams).set({ wearing: placed, updatedAt: new Date() }).where(eq(gloams.studentId, studentId)).run();
  return { ...now, placed };
}
