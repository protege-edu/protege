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
  /** The idea Gloam's question is about (so a short answer to it is judged against that idea) */
  about: string | null;
  /** Said straight after a candle lights: the next thing Gloam is confused about (no waiting) */
  followUp?: { line: string; about: string };
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
  /** The idea Gloam's last question was about */
  asked?: string | null;
  seed?: number;
}

/** A question for the student, and the idea it's about. `stale`: every question was asked recently */
export interface Asked {
  text: string;
  about: string | null;
  stale: boolean;
}

/** How far back a question counts as "just asked" */
const RECENT = 6;

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
  // "next": a question about something else (the idea they skipped comes back later)
  const asked = nextQuestion(lesson, u, gloamSaid, seed, intent === "skip" ? opts.asked : null);
  const topic = lesson.topic;
  const line = (lines: string[], q = asked) => pickLine(lines, { topic, question: q.text }, gloamSaid.slice(-RECENT), seed);
  const said = (emotion: Emotion, text: string, about: string | null = null): Beat => ({ emotion, kind: "line", direction: "", line: text, finished, about });
  const perform = (emotion: Emotion, direction: string, fallback: string, about: string | null = null): Beat => ({ emotion, kind: "perform", direction, line: fallback, finished, about });
  /**
   * A hand-written line with Gloam's next question in it. If every question has been asked lately,
   * the AI asks about the same idea in brand new words instead (the line is only the fallback).
   */
  const asking = (emotion: Emotion, lines: string[]): Beat => {
    const text = line(lines);
    const hasQuestion = !!asked.text && text.includes(asked.text);
    if (!hasQuestion) return said(emotion, text);
    if (!asked.stale || !asked.about) return said(emotion, text, asked.about);
    const c = byId(asked.about);
    return perform(
      emotion,
      `React to what they said in a few words, then ask ONE new question about "${c.name}", from an angle you haven't tried. You still believe: "${c.beliefs[u[c.id]]}". Don't hint at the answer, and don't repeat any question you already asked.`,
      text,
      asked.about,
    );
  };

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

  // A full "I get it" moment. Straight after it, Gloam asks about the next thing it's confused about.
  if (progress.clicked.length) {
    const c = byId(progress.clicked[0]);
    const beat = perform(
      "eureka",
      `It finally clicks about "${c.name}". React in your style (it's a big moment for you). Then say this in your own words: "${c.beliefs[3]}". Don't ask a question.`,
      c.beliefs[3],
    );
    return asked.about ? { ...beat, followUp: { line: line(style.lines.nextIdea), about: asked.about } } : beat;
  }

  // Not explaining anything: hand-written lines, instant, always in character
  if (judged.length === 0) {
    if (intent === "off_topic") return asking("redirect", style.lines.offTopic);
    if (intent === "asking_for_answer") return asking("sheepish", style.lines.askedForAnswer);
    if (intent === "stuck") return asking("curious", style.lines.stuck);
    if (intent === "skip") return asking("curious", style.lines.skip);
    return asking("curious", style.lines.nudge);
  }

  // Something improved
  if (progress.improved.length) {
    const c = byId(progress.improved[0]);
    const level = u[c.id];
    if (level === 1) {
      return perform(
        "sheepish",
        `The student just made you doubt your old idea about "${c.name}". You used to think: "${c.beliefs[0]}". Now you're wondering: "${c.beliefs[1]}". React to what they said, then ask them WHY, in your style.`,
        `${c.beliefs[1]} ${style.lines.followUps.why}`,
        c.id,
      );
    }
    return perform(
      "excited",
      `Something is clicking about "${c.name}". You now think: "${c.beliefs[level]}". Say that back in your own words, not fully sure yet, then ask ONE question about the missing piece.`,
      `${c.beliefs[level]} ${style.lines.followUps.missing}`,
      c.id,
    );
  }

  // They said something wrong. Never tell them they're wrong: get curious instead.
  const wrong = judged.find((j) => j.quality === "wrong");
  if (wrong) {
    const c = byId(wrong.id);
    const q = bare(questionFor(c, u[c.id], gloamSaid, seed).text);
    return perform(
      "skeptical",
      before[c.id] === 0
        ? `What the student said agrees with your OWN wrong idea ("${c.beliefs[0]}"). Be smug about it for a second, then get a nagging doubt and ask: "${q}". Do NOT tell them they're wrong.`
        : `What they said doesn't fit what you've been learning, and it confuses you. Don't say they're wrong. Puzzle over it, then ask: "${q}"`,
      `${style.lines.followUps.hm} ${q}`,
      c.id,
    );
  }

  // Mentioned the idea but didn't explain why
  const c = byId(judged[0].id);
  return perform(
    "curious",
    `The student mentioned "${c.name}" but didn't explain HOW or WHY. You still believe: "${c.beliefs[u[c.id]]}". React to what they said, then ask them to explain how it actually works.`,
    style.lines.followUps.how,
    c.id,
  );
}

/**
 * A drafted question without its "Gloam wonders," lead-in (younger Gloams talk about themselves), so it reads
 * right after any line ("But I still wonder: where do…", not "But I still wonder: Gloam is curious, where do…")
 */
const bare = (q: string) => {
  const s = q.replace(/^(gloam|je|i)\s+(wonders|asks|is curious|is wondering|se demande|demande|est curieux)\s*[,:]?\s*/i, "").trim();
  return s ? s[0].toUpperCase() + s.slice(1) : q;
};

/** Lower case, first 30 letters: how a question is recognised in what Gloam said */
const key = (q: string) => bare(q).toLowerCase().slice(0, 30);

/**
 * Gloam's next question: about an idea it understands least, never one it asked in its last few lines.
 * It goes through every idea Gloam is still confused about before asking anything again, so a lesson
 * with two ideas doesn't bounce between the same two questions. `avoid`: the idea the student just skipped.
 * `stale` means every question was asked lately: the director has the AI ask it in new words instead.
 */
export function nextQuestion(lesson: LessonBlueprint, u: Understanding, gloamSaid: string[], seed = 0, avoid?: string | null): Asked {
  let open = lesson.concepts.filter((c) => u[c.id] < 3);
  if (avoid && open.some((c) => c.id !== avoid)) open = open.filter((c) => c.id !== avoid);
  if (!open.length) return { text: "", about: null, stale: false };
  // least understood first: the ideas Gloam is most stuck on
  const levels = [...new Set(open.map((c) => u[c.id]))].sort((a, b) => a - b);
  for (const level of levels) {
    const group = open.filter((c) => u[c.id] === level).map((c) => ({ c, q: questionFor(c, level, gloamSaid, seed) }));
    const fresh = group.filter((g) => !g.q.stale);
    if (fresh.length) {
      const pick = fresh[Math.floor(seed * fresh.length) % fresh.length];
      return { text: bare(pick.q.text), about: pick.c.id, stale: false };
    }
  }
  // Every gentle question was asked lately: a more specific one beats asking the same thing again
  // (none of them give the answer away: drafting checks that)
  const recent = gloamSaid.slice(-RECENT).join(" ").toLowerCase();
  for (const level of levels) {
    const unused = open.filter((c) => u[c.id] === level).flatMap((c) => c.questions.filter((q) => !recent.includes(key(q))).map((q) => ({ c, q })));
    if (unused.length) {
      const pick = unused[Math.floor(seed * unused.length) % unused.length];
      return { text: bare(pick.q), about: pick.c.id, stale: false };
    }
  }
  const stuck = open.filter((c) => u[c.id] === levels[0]);
  const c = stuck[Math.floor(seed * stuck.length) % stuck.length];
  return { text: bare(questionFor(c, u[c.id], gloamSaid, seed).text), about: c.id, stale: true };
}

/**
 * Questions are ordered from neutral to specific. The first two never mention the answer, so Gloam can ask
 * either before it has a clue; the specific ones only once the student has taught it something.
 * Never one from Gloam's last few lines: if they all were, the one asked longest ago (and `stale`).
 */
function questionFor(c: Concept, level: number, gloamSaid: string[], seed: number): { text: string; stale: boolean } {
  const allowed = c.questions.slice(0, Math.min(c.questions.length, Math.max(2, level + 1)));
  const recent = gloamSaid.slice(-RECENT).join(" ").toLowerCase();
  const ever = gloamSaid.join(" ").toLowerCase();
  const fresh = allowed.filter((q) => !recent.includes(key(q)));
  if (fresh.length) {
    const unasked = fresh.filter((q) => !ever.includes(key(q)));
    const pool = unasked.length ? unasked : fresh;
    return { text: pool[Math.floor(seed * pool.length) % pool.length], stale: false };
  }
  // the one Gloam asked longest ago
  const lastAsked = (q: string) => gloamSaid.findLastIndex((s) => s.toLowerCase().includes(key(q)));
  return { text: [...allowed].sort((a, b) => lastAsked(a) - lastAsked(b))[0], stale: true };
}

/** What Gloam currently believes about everything, used by the performer and the candles. */
export function currentBeliefs(lesson: LessonBlueprint, u: Understanding): string[] {
  return lesson.concepts.map((c) => c.beliefs[u[c.id] ?? 0]);
}
