import { chatJSON, type ChatMessage } from "./client";
import { busy } from "./queue";
import { comparisonsIn, gloamSystemPrompt, gloamTurnMessage } from "./prompts/gloam";
import { conceptCheckMessage, conceptCheckPrompt, intentMessage, intentPrompt } from "./prompts/judge";
import { checkSafety } from "./safety";
import { conceptCheckSchema, intentSchema, performSchema, type Emotion, type Intent, type Quality } from "./schemas";
import { getAgeStyle, pickLine, type AgeStyle } from "@/lib/age-styles";
import { currentBeliefs, directBeat, nextQuestion } from "@/lib/companion/director";
import { candidateConcepts, gradeCheck } from "@/lib/companion/grade";
import { looksCopied, quickIntent } from "@/lib/companion/intent";
import { applyProgress, type Understanding } from "@/lib/companion/progress";
import type { LessonBlueprint } from "@/lib/lesson/types";
import type { z } from "zod";

export interface TurnInput {
  lesson: LessonBlueprint;
  understanding: Understanding;
  history: { from: "student" | "gloam"; text: string }[];
  message: string;
  /** Most of the message was pasted into the box, not typed */
  pasted?: boolean;
  /** Test mode while developing: let copied answers teach Gloam */
  allowCopied?: boolean;
}

/** Sent as soon as the judge is done, before Gloam has finished talking */
export interface JudgedEvent {
  understanding: Understanding;
  improved: string[];
  clicked: string[];
  emotion: Emotion;
}

export interface TurnOutput extends JudgedEvent {
  reply: string;
  intent: Intent;
  judged: { id: string; quality: Quality }[];
  onTopic: boolean;
  finished: boolean;
  /** Where the reply came from. "line" = hand-written, "offline" = the model isn't running. */
  /** busy: a hand-written line because the class's AI line was long (the judging was still the AI) */
  source: "ai" | "line" | "safety" | "fallback" | "offline" | "busy";
  ms: number;
}

/**
 * One companion turn:
 *   1. safety check (plain code, no AI)
 *   2. judge: code picks which ideas the message could be about, the AI checks each one
 *   3. progress rules + director (plain code): what happens in the story
 *   4. Gloam speaks: a hand-written line from the age style, or (when the student explained
 *      something) an AI reply that reacts to their exact words, checked before it's shown
 * Never throws. Students never see a raw error.
 */
export async function runTurn(input: TurnInput, hooks: { onJudged?: (e: JudgedEvent) => void } = {}): Promise<TurnOutput> {
  const { lesson, understanding, history, message } = input;
  const style = getAgeStyle(lesson.ageStyle, lesson.language);
  const start = Date.now();
  const gloamSaid = history.filter((m) => m.from === "gloam").map((m) => m.text);
  const done = (o: Omit<TurnOutput, "ms">): TurnOutput => ({ ...o, ms: Date.now() - start });
  const unchanged = { understanding, improved: [], clicked: [], judged: [], finished: false };

  // 1. Safety
  const safety = checkSafety(message, style);
  if (safety !== "ok") {
    const fill = { topic: topicOf(lesson), question: nextQuestion(lesson, understanding, gloamSaid) };
    const reply =
      safety === "care"
        ? style.lines.care
        : pickLine(safety === "blocked" ? style.lines.blocked : style.lines.insulted, fill, gloamSaid.slice(-6));
    return done({
      ...unchanged,
      reply: voice(reply, style),
      emotion: safety === "care" ? "curious" : safety === "insulted" ? "skeptical" : "redirect",
      intent: safety === "insulted" ? "chatting" : "off_topic",
      onTopic: safety === "insulted",
      source: "safety",
    });
  }

  // 1b. Pasted from somewhere: ask for their own words (no AI, no candles)
  if (!input.allowCopied && looksCopied(message, input.pasted)) {
    const reply = pickLine(style.lines.copied, { topic: topicOf(lesson), question: nextQuestion(lesson, understanding, gloamSaid) }, gloamSaid.slice(-6));
    return done({ ...unchanged, reply: voice(reply, style), emotion: "skeptical", intent: "chatting", onTopic: true, source: "line" });
  }

  // 2. Judge (one small question per idea the message might be about, asked side by side)
  const judged: { id: string; quality: Quality }[] = [];
  const checks = await Promise.all(
    candidateConcepts(lesson, message).map(async (concept) => ({ concept, res: await ask(conceptCheckSchema, "concept_check", conceptCheckPrompt(concept), conceptCheckMessage(message)) })),
  );
  if (checks.some((c) => c.res === "offline")) return done({ ...offline(understanding) });
  for (const { concept, res } of checks) {
    const quality = res && res !== "offline" ? gradeCheck(message, res) : null;
    if (quality) judged.push({ id: concept.id, quality });
  }
  let intent: Intent = "explaining";
  if (judged.length === 0) {
    intent = quickIntent(message) ?? "chatting";
    if (quickIntent(message) === null) {
      const res = await ask(intentSchema, "intent", intentPrompt(lesson), intentMessage(message));
      if (res === "offline") return done({ ...offline(understanding) });
      intent = res?.intent ?? "chatting";
    }
    // "explaining" but it touched no idea: a vague attempt, not a lesson point
    if (intent === "explaining") intent = "chatting";
    // "the sun", "summer?" are about the lesson even if they explain nothing: never call them off topic
    if (intent === "off_topic" && mentionsLesson(lesson, message)) intent = "chatting";
  }

  // 3. Progress + director
  const progress = applyProgress(understanding, judged);
  const beat = directBeat({ lesson, style, before: understanding, progress, intent, judged, gloamSaid });
  hooks.onJudged?.({ understanding: progress.understanding, improved: progress.improved, clicked: progress.clicked, emotion: beat.emotion });
  const result = {
    understanding: progress.understanding,
    improved: progress.improved,
    clicked: progress.clicked,
    judged,
    emotion: beat.emotion,
    intent,
    onTopic: intent !== "off_topic",
    finished: beat.finished,
  };

  // 4a. Hand-written line: instant
  if (beat.kind === "line") return done({ ...result, reply: voice(beat.line, style), source: "line" });
  // 4a'. A busy class: Gloam answers with its hand-written line for this moment, so everyone gets answered sooner
  if (busy()) return done({ ...result, reply: voice(beat.line, style), source: "busy" });

  // 4b. The AI reacts to what the student actually said
  const beliefs = currentBeliefs(lesson, progress.understanding);
  const allowed = [...history.filter((m) => m.from === "student").map((m) => m.text), message, ...beliefs, beat.line, beat.direction].join(" ");
  const usedComparisons = comparisonsIn(gloamSaid);
  const messages: ChatMessage[] = [
    { role: "system", content: gloamSystemPrompt(lesson, style) },
    {
      role: "user",
      content: gloamTurnMessage({
        history,
        message,
        beat: beat.direction,
        learned: lesson.concepts.filter((c) => progress.understanding[c.id] >= 2).map((c) => c.beliefs[progress.understanding[c.id]]),
        usedComparisons,
      }),
    },
  ];

  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await chatJSON({ name: "gloam", schema: performSchema, temperature: 0.85, maxTokens: 100, messages });
    if (!res.ok) {
      if (res.reason === "unreachable") return done({ ...offline(understanding) });
      continue;
    }
    const problem = checkReply(res.data.reply, { lesson, style, understanding: progress.understanding, allowed, gloamSaid, usedComparisons });
    if (problem) {
      messages.push({ role: "assistant", content: JSON.stringify(res.data) }, { role: "user", content: problem });
      continue;
    }
    return done({ ...result, reply: voice(tidy(res.data.reply, style), style), source: "ai" });
  }
  return done({ ...result, reply: voice(beat.line, style), source: "fallback" });
}

/** Everything a reply must pass before a student sees it. Returns what to fix, or null if it's fine. */
function checkReply(
  reply: string,
  ctx: { lesson: LessonBlueprint; style: AgeStyle; understanding: Understanding; allowed: string; gloamSaid: string[]; usedComparisons: string[] },
): string | null {
  // Gloam's own words go through the same safety filter as the student's
  if (checkSafety(reply, ctx.style) !== "ok") return "Keep it school-appropriate and kind. Rewrite it.";

  const leak = findGiveaway(ctx.lesson, ctx.understanding, reply, ctx.allowed);
  if (leak) return `You said "${leak}", but you don't know that yet. The student has to teach you. Rewrite it without that.`;

  const text = plain(reply);
  const banned = ctx.style.voice.banned.find((b) => text.includes(b.toLowerCase()));
  if (banned) return `Don't say "${banned}". Rewrite it.`;

  const reused = comparisonsIn([reply]).find((c) => ctx.usedComparisons.some((u) => u === c || u.includes(c) || c.includes(u)));
  if (reused) return `You already used the comparison "${reused}". Rewrite it with no comparison, or a brand new one.`;

  if (ctx.gloamSaid.slice(-4).some((prev) => similarity(prev, reply) > 0.55)) return "You already said almost exactly that. Say something new.";
  return null;
}

/** One small judge question. Returns null if the model gave nonsense twice, "offline" if it isn't running. */
async function ask<T>(schema: z.ZodType<T>, name: string, system: string, user: string): Promise<T | null | "offline"> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await chatJSON({ name, schema, temperature: 0, maxTokens: 40, messages: [{ role: "system", content: system }, { role: "user", content: user }] });
    if (res.ok) return res.data;
    if (res.reason === "unreachable") return "offline";
  }
  return null;
}

function offline(understanding: Understanding): Omit<TurnOutput, "ms"> {
  return { understanding, improved: [], clicked: [], judged: [], reply: "", emotion: "confused", intent: "chatting", onTopic: true, finished: false, source: "offline" };
}

const topicOf = (lesson: LessonBlueprint) => lesson.topic;

/** Does the message use any of the lesson's words (title, topic words, or any idea's evidence words)? */
function mentionsLesson(lesson: LessonBlueprint, message: string): boolean {
  const words = new Set(
    [lesson.title, lesson.topic, ...lesson.topicWords, ...lesson.concepts.flatMap((c) => c.evidence)]
      .join(" ")
      .toLowerCase()
      .match(/[a-z]{3,}/g) ?? [],
  );
  return (message.toLowerCase().match(/[a-z]{3,}/g) ?? []).some((w) => words.has(w));
}

// Models write curly apostrophes (doesn’t). Compare plain text to plain text.
const plain = (s: string) => s.toLowerCase().replace(/[‘’ʼ]/g, "'");

/**
 * Did Gloam use an "answer word" for an idea it hasn't learned, that nobody has said yet?
 * Returns the word if so.
 */
export function findGiveaway(lesson: LessonBlueprint, understanding: Understanding, reply: string, allowedText: string): string | null {
  const text = plain(reply);
  const allowed = plain(allowedText);
  for (const c of lesson.concepts) {
    if ((understanding[c.id] ?? 0) >= 3) continue;
    for (const word of c.giveaways) {
      // Word-boundary match, so "lean" doesn't fire on "clean"
      const re = new RegExp(`\\b${word.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);
      if (re.test(text) && !re.test(allowed)) return word;
    }
  }
  return null;
}

/** Make any line sound like this age style: lowercase for high school, keeping SHOUTED words. */
export function voice(text: string, style: AgeStyle): string {
  let out = text.replace(/!{2,}/g, "!").replace(/\?{2,}/g, "?");
  if (style.voice.lowercase) out = out.replace(/\b[A-Za-z][a-z'’]*\b|\bI\b/g, (w) => w.toLowerCase());
  return out;
}

function tidy(reply: string, style: AgeStyle): string {
  const text = reply
    .replace(/^gloam:\s*/i, "")
    .replace(/[*_]{1,2}([^*_]+)[*_]{1,2}/g, "$1") // no markdown *emphasis*
    .replace(/^["'\s.]+|["'\s]+$/g, "")
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  // "vs." and "e.g." aren't the end of a sentence: swap their dots for a look-alike so the splitter ignores them
  const safe = text.replace(/\b(vs|e\.g|i\.e|etc)\./gi, (m) => m.replace(/\./g, "․"));
  let sentences: string[] = safe.match(/[^.!?…]+[.!?…]+["')]*|[^.!?…]+$/g) ?? [safe];
  // Small models ramble: keep it under the age style's word limit (always at least one sentence)
  const count = (xs: string[]) => xs.join(" ").split(/\s+/).filter(Boolean).length;
  while (sentences.length > 1 && count(sentences) > style.voice.maxWords) sentences = sentences.slice(0, -1);
  // Drop a dangling "So…" fragment at the end
  const dangling = (s: string) => s.trim().split(/\s+/).length <= 2 && !/[!?]["')]*$/.test(s.trim()) && /(\.\.\.|…|[^.!?…"')])$/.test(s.trim());
  while (sentences.length > 1 && dangling(sentences[sentences.length - 1])) sentences.pop();
  return sentences.join("").trim();
}

/** How much two lines overlap, 0..1 (shared words / words in the shorter line) */
function similarity(a: string, b: string): number {
  const words = (s: string) => new Set(s.toLowerCase().match(/[a-z']+/g) ?? []);
  const A = words(a);
  const B = words(b);
  if (A.size < 3 || B.size < 3) return 0;
  let shared = 0;
  for (const w of A) if (B.has(w)) shared++;
  return shared / Math.min(A.size, B.size);
}
