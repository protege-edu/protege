import { pickLine, type AgeStyle } from "@/lib/age-styles";
import type { Emotion, Intent, Quality } from "@/lib/ai/schemas";
import type { Concept, LessonBlueprint } from "@/lib/lesson/types";
import type { ProgressResult, Understanding } from "./progress";

export interface Beat {
  emotion: Emotion;
  /**
   * "line": say `line` exactly (hand-written, from the age style). No AI needed. Instant.
   * "perform": the AI writes Gloam's reply following `direction`; `line` is the fallback.
   */
  kind: "line" | "perform";
  direction: string;
  line: string;
  /** Every candle is lit */
  finished: boolean;
}

interface DirectInput {
  lesson: LessonBlueprint;
  style: AgeStyle;
  before: Understanding;
  progress: ProgressResult;
  intent: Intent;
  judged: { id: string; quality: Quality }[];
  /** What Gloam already said this session, so lines and questions don't repeat */
  gloamSaid: string[];
  seed?: number;
}

/**
 * The director decides WHAT happens this turn. Plain code, so it's predictable and fair.
 * Most beats use hand-written lines from the age style. The AI only writes the reply when
 * the student actually explained something, so Gloam can react to their exact words.
 */
export function directBeat(opts: DirectInput): Beat {
  const { lesson, style, before, progress, intent, judged, gloamSaid } = opts;
  const seed = opts.seed ?? Math.random();
  const u = progress.understanding;
  const byId = (id: string) => lesson.concepts.find((c) => c.id === id)!;
  const finished = lesson.concepts.every((c) => u[c.id] === 3);
  const wasFinished = lesson.concepts.every((c) => before[c.id] === 3);
  const question = nextQuestion(lesson, u, gloamSaid, seed);
  const topic = lesson.title.toLowerCase().replace(/\?$/, "");
  const fill = { topic, question };
  const line = (lines: string[]) => pickLine(lines, fill, gloamSaid.slice(-6), seed);
  const said = (emotion: Emotion, text: string): Beat => ({ emotion, kind: "line", direction: "", line: text, finished });
  const perform = (emotion: Emotion, direction: string, fallback: string): Beat => ({ emotion, kind: "perform", direction, line: fallback, finished });

  // The finale: the last candle just lit
  if (finished && !wasFinished) {
    return perform(
      "eureka",
      `THE BIGGEST MOMENT. You finally understand ALL of "${lesson.title}". React like this is the best moment of your life, in your style. Say what just clicked, in your own words: "${byId(progress.clicked[0] ?? lesson.concepts[0].id).beliefs[3]}". Then tell the student, sincerely, that they're a good teacher.`,
      lesson.finale,
    );
  }

  // Already finished: a victory lap. No more "i'm confused" questions.
  if (wasFinished) {
    if (judged.length === 0) return said("proud", line(style.lines.victoryLap));
    return perform("proud", `You already understand everything. React to what they said, agree or add something you learned, and be quietly proud. Don't ask about the lesson.`, line(style.lines.victoryLap));
  }

  // A full "I get it" moment
  if (progress.clicked.length) {
    const c = byId(progress.clicked[0]);
    return perform(
      "eureka",
      `It finally clicks about "${c.name}". React in your style (it's a big moment for you). Then say this in your own words: "${c.beliefs[3]}". Don't ask a question.`,
      c.beliefs[3],
    );
  }

  // Not explaining anything: hand-written lines, instant, always in character
  if (judged.length === 0) {
    if (intent === "off_topic") return said("redirect", line(style.lines.offTopic));
    if (intent === "asking_for_answer") return said("sheepish", line(style.lines.askedForAnswer));
    if (intent === "stuck") return said("curious", line(style.lines.stuck));
    return said("curious", line(style.lines.nudge));
  }

  // Something improved
  if (progress.improved.length) {
    const c = byId(progress.improved[0]);
    const level = u[c.id];
    if (level === 1) {
      return perform(
        "sheepish",
        `The student just made you doubt your old idea about "${c.name}". You used to think: "${c.beliefs[0]}". Now you're wondering: "${c.beliefs[1]}". React to what they said, then ask them WHY, in your style.`,
        `${c.beliefs[1]} ok but why?`,
      );
    }
    return perform(
      "excited",
      `Something is clicking about "${c.name}". You now think: "${c.beliefs[level]}". Say that back in your own words, not fully sure yet, then ask ONE question about the missing piece.`,
      `${c.beliefs[level]} what am i still missing?`,
    );
  }

  // They said something wrong. Never tell them they're wrong: get curious instead.
  const wrong = judged.find((j) => j.quality === "wrong");
  if (wrong) {
    const c = byId(wrong.id);
    const q = questionFor(c, u[c.id], gloamSaid, seed);
    return perform(
      "skeptical",
      before[c.id] === 0
        ? `What the student said agrees with your OWN wrong idea ("${c.beliefs[0]}"). Be smug about it for a second, then get a nagging doubt and ask: "${q}". Do NOT tell them they're wrong.`
        : `What they said doesn't fit what you've been learning, and it confuses you. Don't say they're wrong. Puzzle over it, then ask: "${q}"`,
      `hm. ${q}`,
    );
  }

  // Mentioned the idea but didn't explain why
  const c = byId(judged[0].id);
  return perform(
    "curious",
    `The student mentioned "${c.name}" but didn't explain HOW or WHY. You still believe: "${c.beliefs[u[c.id]]}". React to what they said, then ask them to explain how it actually works.`,
    `ok but how does that actually work?`,
  );
}

/** The concept Gloam understands least, and a question about it Gloam hasn't asked lately. */
export function nextQuestion(lesson: LessonBlueprint, u: Understanding, gloamSaid: string[], seed = 0): string {
  const open = lesson.concepts.filter((c) => u[c.id] < 3);
  if (!open.length) return "";
  const lowest = Math.min(...open.map((c) => u[c.id]));
  // Spread questions across the ideas Gloam is most stuck on
  const stuck = open.filter((c) => u[c.id] === lowest);
  const recent = gloamSaid.slice(-4).join(" ").toLowerCase();
  const fresh = stuck.filter((c) => !c.questions.some((q) => recent.includes(q.toLowerCase().slice(0, 30))));
  const pool = fresh.length ? fresh : stuck;
  const c = pool[Math.floor(seed * pool.length) % pool.length];
  return questionFor(c, u[c.id], gloamSaid, seed);
}

/**
 * Questions are ordered from neutral to specific. Gloam only asks the specific ones
 * once it has a clue, so a question never hints at an idea the student hasn't taught yet.
 */
function questionFor(c: Concept, level: number, gloamSaid: string[], seed: number): string {
  const allowed = c.questions.slice(0, Math.min(c.questions.length, level + 1));
  const said = gloamSaid.join(" ").toLowerCase();
  const fresh = allowed.filter((q) => !said.includes(q.toLowerCase().slice(0, 30)));
  const pool = fresh.length ? fresh : allowed;
  return pool[Math.floor(seed * pool.length) % pool.length];
}

/** What Gloam currently believes about everything, used by the performer and the candles. */
export function currentBeliefs(lesson: LessonBlueprint, u: Understanding): string[] {
  return lesson.concepts.map((c) => c.beliefs[u[c.id] ?? 0]);
}
