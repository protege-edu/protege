import { getAgeStyle } from "@/lib/age-styles";
import { gameLines } from "@/lib/age-styles/game-lines";
import { directBeat, nextQuestion } from "@/lib/companion/director";
import { quickIntent } from "@/lib/companion/intent";
import type { Understanding } from "@/lib/companion/progress";
import { act, firefliesForTeaching, newPlay, openBoss, openChallenge, targetsOf, view, type GameEvent } from "@/lib/game/engine";
import { eventLines, openingLines, type Said } from "@/lib/game/say";
import type { Action, ChallengeKind, EncounterView, Play } from "@/lib/game/types";
import { judgeTargets, runTurn, speak, voice, type JudgedEvent, type TurnInput, type TurnOutput } from "./companion";
import { checkSafety } from "./safety";

export interface GameTurnInput extends TurnInput {
  /** this session's game so far (null: none yet, or the game layer is off) */
  play: Play | null;
  /** what the student did in a challenge (a typed message is "explain") */
  action?: Action;
  /** is the game layer on for this class */
  gameOn: boolean;
  /** what the rival remembers about this student from earlier lessons (null: never met) */
  rival?: RivalMemory | null;
}

export interface RivalMemory {
  met: number;
  beaten: number;
  lastTopic: string;
}

export interface GameTurnOutput extends TurnOutput {
  play: Play | null;
  fireflies: number;
  /** what the game did this turn: the encounter as the browser may see it, and who said what */
  game?: {
    event?: GameEvent;
    view: EncounterView | null;
    /** said now, in this order (the rival and the Muddle speak for themselves) */
    said: Said[];
    /** said after the big "I get it!" moment (e.g. the Muddle arriving for the boss fight) */
    after?: Said[];
  };
  /** a challenge or the boss that just ended (for the teacher's dashboard) */
  resolved?: { kind: ChallengeKind | "boss"; conceptId: string | null; outcome: "won" | "skipped"; tries: number };
  /** the rival's memory of this student, when this turn changed it (it arrived, or it lost) */
  rival?: RivalMemory;
}

/**
 * A turn with the game layer: challenges between teaching and the boss fight at the end.
 * With the game off (or for a lesson whose session never had one), it's exactly an ordinary turn.
 */
export async function playTurn(input: GameTurnInput, hooks: { onJudged?: (e: JudgedEvent) => void } = {}): Promise<GameTurnOutput> {
  const { lesson, understanding, history, message } = input;
  if (!input.gameOn) {
    const out = await runTurn(input, hooks);
    return { ...out, play: input.play, fireflies: firefliesForTeaching(out.judged, out.improved, out.clicked) };
  }
  const start = Date.now();
  const style = getAgeStyle(lesson.ageStyle, lesson.language);
  const g = gameLines(lesson.ageStyle, lesson.language);
  const gloamSaid = history.filter((m) => m.from === "gloam").map((m) => m.text);
  const lastGloam = history.findLast((m) => m.from === "gloam");
  let play: Play = input.play ?? newPlay(lesson);
  const fill = (u: Understanding) => ({ topic: lesson.topic, question: nextQuestion(lesson, u, gloamSaid).text, recent: gloamSaid.slice(-6), rival: input.rival ?? null });
  const memory = input.rival ?? { met: 0, beaten: 0, lastTopic: lesson.topic };
  const tidySaid = (said: Said[]) => said.map((s) => ({ ...s, text: voice(s.text, style) }));
  const allLit = (u: Understanding) => lesson.concepts.every((c) => u[c.id] === 3);
  const bossPending = () => play.boss !== "won";

  // ---------- an encounter is open: this move is part of it ----------
  if (play.open) {
    const enc = play.open;
    let action: Action = input.action ?? { type: "explain" };
    const quick = action.type === "explain" ? quickIntent(message) : null;
    // unsafe or rude: the ordinary turn's lines handle it, and the encounter waits
    if (action.type === "explain" && checkSafety(message, style) !== "ok") {
      const out = await runTurn(input, hooks);
      return { ...out, play, fireflies: 0, game: { view: view(enc), said: [] } };
    }
    if (quick === "skip" && enc.kind !== "boss") action = { type: "skip" };
    // "idk", "lol": nothing to judge (no AI), the encounter's own nudge
    const quality = action.type === "explain" && !quick ? await judgeTargets(lesson, targetsOf(enc), message, lastGloam?.text) : null;
    if (quality === "offline") return { ...offlineOut(understanding, start), play, fireflies: 0 };
    const res = act(enc, action, quality);
    const f = fill(understanding);
    const lines = eventLines(res.event, enc, res.open, g, f);
    play = { ...play, open: res.open };
    const conceptId = enc.kind === "boss" ? null : enc.conceptId;
    // what the student said in a challenge counts as explaining its idea (the teacher's dashboard sees it:
    // falling for the rival's claim shows up in "what the class thinks", like any wrong explanation)
    const about = enc.kind === "boss" ? (enc.rounds[enc.round]?.conceptId ?? null) : enc.conceptId;
    const judged = quality && about ? [{ id: about, quality }] : [];
    const base = { understanding, improved: [], clicked: [], judged, intent: "explaining" as const, onTopic: true, finished: false, about: null, ms: 0 };

    if (res.event === "skipped" && conceptId) {
      play = { ...play, done: { ...play.done, [conceptId]: "skipped" } };
      return {
        ...base,
        ...firstGloam(tidySaid(lines.said), lines.emotion),
        play,
        fireflies: 0,
        game: { event: res.event, view: null, said: tidySaid(lines.said) },
        resolved: { kind: enc.kind as ChallengeKind, conceptId, outcome: "skipped", tries: enc.tries },
        ms: Date.now() - start,
      };
    }

    // won a challenge: the candle lights, with Gloam's own "I get it!" (and the boss next, if it was the last one)
    if (res.event === "won" && res.light) {
      play = { ...play, done: { ...play.done, [res.light]: "won" } };
      const after: Understanding = { ...understanding, [res.light]: 3 };
      const boss = allLit(after) && bossPending();
      const beat = directBeat({
        lesson,
        style,
        before: understanding,
        progress: { understanding: after, improved: [res.light], clicked: [res.light] },
        intent: "explaining",
        judged: [{ id: res.light, quality: "clear" }],
        gloamSaid,
        bossPending: boss,
      });
      hooks.onJudged?.({ understanding: after, improved: [res.light], clicked: [res.light], emotion: "eureka" });
      const spoken = await speak({ lesson, style, history, message, gloamSaid, understanding: after, beat });
      if (spoken === "offline") return { ...offlineOut(understanding, start), play: input.play, fireflies: 0 };
      let afterSaid: Said[] | undefined;
      if (boss) {
        play = { ...play, open: openBoss(lesson) };
        afterSaid = tidySaid(openingLines(play.open!, g, fill(after)).said);
      }
      return {
        ...base,
        understanding: after,
        improved: [res.light],
        clicked: [res.light],
        judged: [{ id: res.light, quality: "clear" }],
        reply: spoken.reply,
        source: spoken.source,
        emotion: "eureka",
        finished: beat.finished,
        about: beat.about,
        ...(beat.followUp && !boss ? { followUp: { text: voice(beat.followUp.line, style), about: beat.followUp.about } } : {}),
        play,
        fireflies: res.fireflies,
        // (the rival storms off before Gloam's big line)
        game: { event: res.event, view: play.open ? view(play.open) : null, said: tidySaid(lines.said.filter((s) => s.who !== "gloam")), ...(afterSaid ? { after: afterSaid } : {}) },
        resolved: { kind: enc.kind as ChallengeKind, conceptId, outcome: "won", tries: enc.tries },
        // the rival remembers losing (to this student, about this topic)
        ...(enc.kind === "rival" ? { rival: { ...memory, beaten: memory.beaten + 1, lastTopic: lesson.topic } } : {}),
        ms: Date.now() - start,
      };
    }

    // the boss is beaten: the finale
    if (res.event === "defeated") {
      play = { ...play, boss: "won" };
      const first = lesson.concepts[0].id;
      const beat = directBeat({
        lesson,
        style,
        before: { ...understanding, [first]: 2 },
        progress: { understanding, improved: [first], clicked: [first] },
        intent: "explaining",
        judged: [],
        gloamSaid,
      });
      const spoken = await speak({ lesson, style, history, message, gloamSaid, understanding, beat });
      if (spoken === "offline") return { ...offlineOut(understanding, start), play: input.play, fireflies: 0 };
      return {
        ...base,
        // (the finale is the biggest "I get it!" moment: the browser plays the full cinematic for it)
        clicked: [lesson.concepts[lesson.concepts.length - 1].id],
        reply: spoken.reply,
        source: spoken.source,
        emotion: "eureka",
        finished: true,
        play,
        fireflies: res.fireflies,
        game: { event: res.event, view: null, said: tidySaid(lines.said) },
        resolved: { kind: "boss", conceptId: null, outcome: "won", tries: enc.tries },
        ms: Date.now() - start,
      };
    }

    // anything else: hand-written lines, instant
    return {
      ...base,
      ...firstGloam(tidySaid(lines.said), lines.emotion),
      play,
      fireflies: res.fireflies,
      game: { event: res.event, view: res.open ? view(res.open) : null, said: tidySaid(lines.said) },
      ms: Date.now() - start,
    };
  }

  // ---------- an ordinary turn, but a candle about to light needs its challenge first ----------
  const hold = (clicked: string[]) => clicked.filter((id) => play.plan[id] && !play.done[id]).slice(0, 1);
  const out = await runTurn({ ...input, hold, bossPending: bossPending() }, hooks);
  const fireflies = firefliesForTeaching(out.judged, out.improved, out.clicked);
  if (out.held?.length) {
    const id = out.held[0];
    play = { ...play, open: openChallenge(lesson, play.plan[id], id) };
    const o = openingLines(play.open!, g, fill(out.understanding));
    const said = tidySaid(o.said);
    return {
      ...out,
      ...firstGloam(said, o.emotion),
      play,
      fireflies,
      game: { view: view(play.open!), said },
      ...(play.open!.kind === "rival" ? { rival: { ...memory, met: memory.met + 1 } } : {}),
    };
  }
  // the last candle lit by ordinary teaching (its challenge was skipped): the boss comes next
  if (allLit(out.understanding) && bossPending() && out.clicked.length) {
    play = { ...play, open: openBoss(lesson) };
    return { ...out, play, fireflies, game: { view: view(play.open!), said: [], after: tidySaid(openingLines(play.open!, g, fill(out.understanding)).said) } };
  }
  return { ...out, play, fireflies };
}

/**
 * Everything said this turn, in the order it's said (and saved): the game's lines, Gloam's reply
 * if it isn't one of them, its next question, then what comes after the big moment.
 */
export function transcriptOf(out: GameTurnOutput): { who: Said["who"]; text: string; emotion?: string; about?: string | null }[] {
  const said = out.game?.said ?? [];
  const inSaid = said.some((s) => s.who === "gloam" && s.text === out.reply);
  return [
    ...said.map((s) => ({ ...s, ...(s.who === "gloam" && s.text === out.reply ? { emotion: out.emotion, about: out.about } : {}) })),
    ...(out.reply && !inSaid ? [{ who: "gloam" as const, text: out.reply, emotion: out.emotion, about: out.about }] : []),
    ...(out.followUp ? [{ who: "gloam" as const, text: out.followUp.text, emotion: "curious", about: out.followUp.about }] : []),
    ...(out.game?.after ?? []),
  ];
}

/** The reply field is Gloam's first line (the others are in game.said) */
function firstGloam(said: Said[], emotion: TurnOutput["emotion"]) {
  return { reply: said.find((s) => s.who === "gloam")?.text ?? "", source: "line" as const, emotion };
}

function offlineOut(understanding: Understanding, start: number): TurnOutput {
  return { understanding, improved: [], clicked: [], judged: [], reply: "", emotion: "confused", intent: "chatting", onTopic: true, finished: false, source: "offline", about: null, ms: Date.now() - start };
}
