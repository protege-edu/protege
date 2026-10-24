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
 *   clear   → +2 from clueless, otherwise +1 (two great explanations = "I get it!")
 *   partial → +1, but only up to level 2 (you need a clear explanation to finish it)
 *   vague / wrong → no change (Gloam never "un-learns" in Phase 1, that would feel like punishment)
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
    if (quality === "clear") gain = level === 0 ? 2 : 1;
    else if (quality === "partial" && level < 2) gain = 1;
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
