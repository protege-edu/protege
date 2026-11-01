import type { Quality } from "@/lib/ai/schemas";
import type { LessonBlueprint } from "@/lib/lesson/types";
import type { Action, ChallengeKind, Encounter, EncounterView, Play } from "./types";

/**
 * The game's rules, as plain code (no AI). The AI only judges what a student writes, the same way it
 * judges any explanation; everything that HAPPENS is decided here, so it's fair and predictable:
 *   - every idea ends with a challenge; winning it lights the candle (a skip just goes back to teaching)
 *   - once every candle is lit, the boss fight; beating it is the finale
 *   - you can't lose anything: a miss only means another try, with a hint
 *   - fireflies only come from teaching well (never for chatting, repeating, or skipping)
 */

/** How many fireflies each teaching move is worth */
export const FIREFLIES = { clear: 3, partial: 1, eureka: 10, spotted: 5, ordered: 5, won: 5, hit: 5, defeated: 20 } as const;

/** Which challenges an idea can have (the rival and the recital work for any lesson, even an old one) */
function kindsFor(lesson: LessonBlueprint, conceptId: string): ChallengeKind[] {
  const c = lesson.concepts.find((x) => x.id === conceptId);
  if (!c) return [];
  return [
    ...(lesson.sequence?.conceptId === conceptId && lesson.sequence.cards.length >= 3 ? (["order"] as const) : []),
    ...(c.notebook ? (["notebook"] as const) : []),
    "rival" as const,
    ...(c.whatIf ? (["whatif"] as const) : []),
    "recital" as const,
  ];
}

/** When two kinds have been used equally, this order breaks the tie (the rival first: it's the most fun) */
const ROTATION: ChallengeKind[] = ["rival", "notebook", "whatif", "recital"];

/**
 * Each idea's challenge, decided once when a session starts: always the kind used least so far, and never
 * the same as the chapter before, so a lesson feels different every chapter. "Put it in order" goes to its idea.
 */
export function planChallenges(lesson: LessonBlueprint): Play["plan"] {
  const plan: Play["plan"] = {};
  const used = new Map<ChallengeKind, number>();
  let prev: ChallengeKind | null = null;
  for (const c of lesson.concepts) {
    const kinds = kindsFor(lesson, c.id);
    const options = kinds.includes("order") ? (["order"] as ChallengeKind[]) : ROTATION.filter((k) => kinds.includes(k));
    const fresh = options.filter((k) => k !== prev);
    const pool = fresh.length ? fresh : options;
    const pick = [...pool].sort((a, b) => (used.get(a) ?? 0) - (used.get(b) ?? 0) || ROTATION.indexOf(a) - ROTATION.indexOf(b))[0] ?? "rival";
    plan[c.id] = pick;
    used.set(pick, (used.get(pick) ?? 0) + 1);
    prev = pick;
  }
  return plan;
}

export function newPlay(lesson: LessonBlueprint): Play {
  return { plan: planChallenges(lesson), done: {}, open: null, boss: null };
}

/** A seeded shuffle that never leaves things in their original order (so there's always something to fix) */
function shuffled<T>(xs: T[], seed: number): number[] {
  const idx = xs.map((_, i) => i);
  let s = Math.floor(seed * 2 ** 31) || 1;
  const rand = () => ((s = (s * 48271) % 2147483647) / 2147483647);
  for (let k = 0; k < 6; k++) {
    for (let i = idx.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }
    if (idx.some((v, i) => v !== i)) break;
  }
  if (idx.every((v, i) => v === i)) idx.reverse();
  return idx;
}

/** Start an idea's challenge (its candle waits at "almost" until it's won) */
export function openChallenge(lesson: LessonBlueprint, kind: ChallengeKind, conceptId: string, seed = Math.random()): Encounter {
  const c = lesson.concepts.find((x) => x.id === conceptId)!;
  switch (kind) {
    case "notebook": {
      const lines = [c.notebook!.right[0], c.notebook!.wrong, c.notebook!.right[1]];
      const order = shuffled(lines, seed);
      return { kind, conceptId, lines: order.map((i) => lines[i]), wrong: order.indexOf(1), phase: "spot", tries: 0 };
    }
    case "order": {
      const cards = lesson.sequence!.cards;
      const order = shuffled(cards, seed);
      // answer[k] = where the k-th card (in the right order) is on screen
      return { kind, conceptId, cards: order.map((i) => cards[i]), answer: cards.map((_, k) => order.indexOf(k)), phase: "order", tries: 0 };
    }
    case "whatif":
      return { kind, conceptId, scenario: c.whatIf!.scenario, phase: "predict", tries: 0 };
    case "recital":
      // Gloam explains it to the rival, with what it believes right now: almost right, missing the why
      return { kind, conceptId, speech: c.beliefs[2], phase: "listen", tries: 0 };
    default:
      return { kind: "rival", conceptId, claim: c.misconception, phase: "argue", tries: 0 };
  }
}

/** The boss: the Muddle says every idea's wrong version, one round each, then a mash-up of two */
export function openBoss(lesson: LessonBlueprint): Encounter {
  const rounds: { conceptId: string; claim: string; mash?: string }[] = lesson.concepts.slice(0, 4).map((c) => ({ conceptId: c.id, claim: c.misconception }));
  if (lesson.concepts.length >= 3) {
    const [a, b] = [lesson.concepts[0], lesson.concepts[lesson.concepts.length - 1]];
    rounds.push({ conceptId: b.id, claim: a.misconception, mash: b.misconception });
  }
  return { kind: "boss", rounds, round: 0, combo: 0, glances: 0, tries: 0 };
}

/** The ideas (or judge items) a message in this encounter is judged against */
export function targetsOf(e: Encounter): string[] {
  if (e.kind === "boss") {
    const r = e.rounds[e.round];
    if (!r) return [];
    // a mash-up round counts for either idea it mixed up
    const first = e.rounds.find((x) => x.claim === r.claim && !x.mash);
    return r.mash && first ? [r.conceptId, first.conceptId] : [r.conceptId];
  }
  if (e.kind === "whatif") return [whatIfId(e.conceptId)];
  if (e.kind === "order") return [ORDER_ID];
  return [e.conceptId];
}

/** Judge items that aren't ideas: an idea's "what if?", and the order challenge's "why" */
export const whatIfId = (conceptId: string) => `whatif-${conceptId}`;
export const ORDER_ID = "order-why";

/** What happened, so the right hand-written line plays (and the browser can animate it) */
export type GameEvent =
  | "spotted" // found the wrong line in Gloam's notebook
  | "wrongPick" // picked a line that was fine
  | "ordered" // put the cards in the right order
  | "misordered"
  | "stopped" // stopped Gloam's recital
  | "won" // won the challenge: the candle lights
  | "glance" // a good start, but not the why
  | "miss" // the wrong idea won that exchange (no harm done)
  | "nothing" // didn't say anything about it
  | "skipped"
  | "hit" // a clean hit on the boss
  | "defeated"; // the boss is beaten: the finale

export interface Resolution {
  /** the encounter after this move (null: it's over) */
  open: Encounter | null;
  event: GameEvent;
  /** the idea whose candle lights now */
  light?: string;
  fireflies: number;
}

/**
 * One move inside an encounter. `quality`: how the judge rated the student's explanation of this
 * encounter's target (null when there was nothing to judge).
 */
export function act(e: Encounter, action: Action, quality: Quality | null): Resolution {
  if (action.type === "skip") return { open: null, event: "skipped", fireflies: 0 };

  if (e.kind === "boss") {
    if (action.type !== "explain") return { open: e, event: "nothing", fireflies: 0 };
    const landed = quality === "clear" || (quality === "partial" && e.glances >= 1);
    if (landed) {
      const round = e.round + 1;
      if (round >= e.rounds.length) return { open: null, event: "defeated", fireflies: FIREFLIES.hit + FIREFLIES.defeated };
      return { open: { ...e, round, combo: e.combo + 1, glances: 0, tries: 0 }, event: "hit", fireflies: FIREFLIES.hit };
    }
    if (quality === "partial") return { open: { ...e, glances: e.glances + 1 }, event: "glance", fireflies: FIREFLIES.partial };
    if (quality === "wrong") return { open: { ...e, combo: 0, tries: e.tries + 1 }, event: "miss", fireflies: 0 };
    return { open: e, event: "nothing", fireflies: 0 };
  }

  if (action.type === "pick" && e.kind === "notebook" && e.phase === "spot") {
    if (action.value === e.wrong) return { open: { ...e, phase: "fix" }, event: "spotted", fireflies: FIREFLIES.spotted };
    return { open: { ...e, tries: e.tries + 1 }, event: "wrongPick", fireflies: 0 };
  }
  if (action.type === "order" && e.kind === "order" && e.phase === "order") {
    const right = action.value.length === e.answer.length && action.value.every((v, i) => v === e.answer[i]);
    // after three tries the cards settle into place on their own: then it's about the why
    if (right || e.tries >= 2) return { open: { ...e, phase: "link" }, event: "ordered", fireflies: right ? FIREFLIES.ordered : 0 };
    return { open: { ...e, tries: e.tries + 1 }, event: "misordered", fireflies: 0 };
  }
  if (action.type === "stop" && e.kind === "recital" && e.phase === "listen") return { open: { ...e, phase: "fix" }, event: "stopped", fireflies: 0 };
  if (action.type !== "explain") return { open: e, event: "nothing", fireflies: 0 };

  // An explanation: a clear one wins; a good start wins on the second go (it's teaching, not a test)
  if (quality === "clear" || (quality === "partial" && e.tries >= 1)) return { open: null, event: "won", light: e.conceptId, fireflies: FIREFLIES.won + FIREFLIES.eureka };
  if (quality === "partial") return { open: { ...e, tries: e.tries + 1 }, event: "glance", fireflies: FIREFLIES.partial };
  if (quality === "wrong") return { open: { ...e, tries: e.tries + 1 }, event: "miss", fireflies: 0 };
  return { open: e, event: "nothing", fireflies: 0 };
}

/** What the browser may see of an encounter (no answers) */
export function view(e: Encounter): EncounterView {
  switch (e.kind) {
    case "notebook":
      return { kind: e.kind, conceptId: e.conceptId, lines: e.lines, phase: e.phase, ...(e.phase === "fix" ? { picked: e.wrong } : {}), tries: e.tries };
    case "order":
      // once the order is settled, the cards are shown in the right order
      return { kind: e.kind, conceptId: e.conceptId, cards: e.phase === "link" ? e.answer.map((i) => e.cards[i]) : e.cards, phase: e.phase, tries: e.tries };
    case "rival":
      return { kind: e.kind, conceptId: e.conceptId, claim: e.claim, tries: e.tries };
    case "whatif":
      return { kind: e.kind, conceptId: e.conceptId, scenario: e.scenario, tries: e.tries };
    case "recital":
      return { kind: e.kind, conceptId: e.conceptId, speech: e.speech, phase: e.phase, tries: e.tries };
    case "boss": {
      const r = e.rounds[e.round];
      return { kind: e.kind, rounds: e.rounds.length, round: e.round, claim: r ? (r.mash ? `${r.claim} ${r.mash}` : r.claim) : "", combo: e.combo, glances: e.glances, tries: e.tries };
    }
  }
}

/** Fireflies for ordinary teaching (only when the candles actually moved) */
export function firefliesForTeaching(judged: { id: string; quality: Quality }[], improved: string[], clicked: string[]): number {
  let n = 0;
  for (const j of judged) if (improved.includes(j.id)) n += j.quality === "clear" ? FIREFLIES.clear : j.quality === "partial" ? FIREFLIES.partial : 0;
  return n + clicked.length * FIREFLIES.eureka;
}
