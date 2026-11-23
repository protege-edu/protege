import type { Quality } from "@/lib/ai/schemas";
import type { Level } from "@/lib/lesson/types";

export type Understanding = Record<string, Level>;

export interface ProgressResult {
  understanding: Understanding;
  /** Concepts that went up this turn */
  improved: string[];
  /** Concepts that just reached "got it" (these trigger the big moment) */
  clicked: string[];
}

/**
 * The model only SUGGESTS how good an explanation was. These rules decide what
 * actually changes, so a small model can't jump Gloam to "I get it!" from one word.
 *
 *   clear   → +2 (one great explanation gets a candle to "almost"; a second lights it)
 *   partial → +1 (a shorter on-topic explanation; once a candle is "almost" lit, any correct one finishes it)
 *   vague / wrong → no change (Gloam never "un-learns" in Phase 1, that would feel like punishment)
 * So effort always pays off: a clear explanation then anything correct lights a candle, and even without a big
 * "why" three on-topic explanations get there. Wrong answers never count, so a candle still means real teaching.
 */
export function applyProgress(current: Understanding, judged: { id: string; quality: Quality }[]): ProgressResult {
  const next: Understanding = { ...current };
  const improved: string[] = [];
  const clicked: string[] = [];
  const seen = new Set<string>();

  for (const { id, quality } of judged) {
    if (!(id in next) || seen.has(id)) continue;
    seen.add(id);
    const level = next[id];
    let gain = 0;
    if (quality === "clear") gain = 2;
    else if (quality === "partial") gain = 1;
    if (gain === 0 || level >= 3) continue;

    const newLevel = Math.min(3, level + gain) as Level;
    next[id] = newLevel;
    improved.push(id);
    if (newLevel === 3) clicked.push(id);
  }

  return { understanding: next, improved, clicked };
}

/** 0..1, how bright Gloam's lantern is overall */
export function brightness(u: Understanding): number {
  const levels = Object.values(u);
  if (levels.length === 0) return 0;
  return levels.reduce<number>((a, b) => a + b, 0) / (levels.length * 3);
}

export function startingUnderstanding(conceptIds: string[]): Understanding {
  return Object.fromEntries(conceptIds.map((id) => [id, 0 as Level]));
}
