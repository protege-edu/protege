/**
 * The whole-class boss: the teacher starts it from the projector, and the whole class fights one Muddle together.
 * Every student's teaching hits it (in any of the class's lessons), so it's a team quest: nobody is ranked, and
 * the projector never shows who hit it. Pure rules here; lib/student/class-boss.ts stores it.
 */

/** Fireflies for every student who helped, once the class beats it */
export const CLASS_BOSS_REWARD = 15;
/** One student's turn can't land more than this (so one fast typist can't beat it alone) */
const MOST_PER_TURN = 2;
/** It stays on the projector this long after it falls (the dawn), then the jar comes back */
export const SHOW_BEATEN_MS = 10 * 60_000;

/** How many hits it takes: about two good explanations per student, so a class beats it in a lesson */
export function hitsNeeded(students: number): number {
  return Math.min(80, Math.max(8, students * 2));
}

/**
 * How hard one turn hits it: each idea the student's explanation moved forward, and a challenge won or a
 * clean hit on their own boss. Chatting, repeats and skips do nothing (like fireflies).
 */
export function hitsFromTurn(improved: string[], event: string | undefined): number {
  const big = event === "won" || event === "hit" || event === "defeated" ? 1 : 0;
  return Math.min(MOST_PER_TURN, improved.length + big);
}

/** What the browser may know about it (nothing about who hit it) */
export interface ClassBossView {
  /** how much of its fog is left, 0..1 (the projector draws it; no numbers anywhere) */
  left: number;
  beaten: boolean;
  /** still going (false: beaten or ended by the teacher) */
  on: boolean;
}

export function classBossView(b: { need: number; hits: number; endedAt: Date | null; beaten: boolean }): ClassBossView {
  return { left: Math.max(0, 1 - b.hits / Math.max(1, b.need)), beaten: b.beaten, on: !b.endedAt };
}
