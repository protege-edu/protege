/**
 * Gloam's level, from one number: how many ideas this student has fully taught it, across every lesson.
 * No points to buy or grind. Teaching is the only way Gloam grows, and each level makes its lantern
 * bigger and brighter (and unlocks a new idle habit), so students can see their teaching.
 */
export const LEVEL_AT = [0, 3, 8, 15, 25, 40, 60, 85, 115, 150] as const;

export interface GloamLevel {
  level: number;
  /** ideas taught so far */
  light: number;
  /** ideas needed for the next level (null at the top) */
  next: number | null;
  /** 0..1 of the way to the next level */
  progress: number;
}

export function levelFor(light: number): GloamLevel {
  let i = 0;
  while (i + 1 < LEVEL_AT.length && light >= LEVEL_AT[i + 1]) i++;
  const next = i + 1 < LEVEL_AT.length ? LEVEL_AT[i + 1] : null;
  const progress = next === null ? 1 : (light - LEVEL_AT[i]) / (next - LEVEL_AT[i]);
  return { level: i + 1, light, next, progress };
}

/** How the lantern looks at a level: a little bigger and brighter each time */
export function lanternFor(level: number) {
  const k = Math.max(0, Math.min(LEVEL_AT.length - 1, level - 1)) / (LEVEL_AT.length - 1);
  return { scale: 1 + k * 0.45, glow: 1 + k * 0.9 };
}

/** The ideas newly lit this turn, in order: they become the next checkpoints on the journey */
export function newlyLit(before: Record<string, number>, after: Record<string, number>, order: string[]): string[] {
  return order.filter((id) => (after[id] ?? 0) === 3 && (before[id] ?? 0) < 3);
}
