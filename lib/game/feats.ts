import type { ChallengeKind } from "./types";

/**
 * Feats: little stamps for how a student played a lesson, given at the end. Only good things, never
 * a ranking or a score, and never anything that compares students. Worked out from what was played
 * (the session's ended challenges and the boss fight), so nothing extra is stored.
 */
export const FEATS = ["untouchable", "rivalFirstTry", "sharpEye", "sawItComing", "chain", "objection", "noShortcuts", "bossBeaten"] as const;
export type Feat = (typeof FEATS)[number];

export interface Played {
  kind: ChallengeKind | "boss";
  outcome: "won" | "skipped";
  tries: number;
}

export function featsFor(played: Played[]): Feat[] {
  const won = (kind: Played["kind"]) => played.filter((p) => p.kind === kind && p.outcome === "won");
  const out: Feat[] = [];
  const boss = won("boss")[0];
  if (boss && boss.tries === 0) out.push("untouchable");
  else if (boss) out.push("bossBeaten");
  if (won("rival").some((p) => p.tries === 0)) out.push("rivalFirstTry");
  if (won("notebook").some((p) => p.tries === 0)) out.push("sharpEye");
  if (won("whatif").some((p) => p.tries === 0)) out.push("sawItComing");
  if (won("order").some((p) => p.tries === 0)) out.push("chain");
  if (won("recital").some((p) => p.tries === 0)) out.push("objection");
  const challenges = played.filter((p) => p.kind !== "boss");
  if (challenges.length >= 2 && challenges.every((p) => p.outcome === "won")) out.push("noShortcuts");
  return out;
}
