import { chatJSON, type ChatMessage } from "./client";
import { gloamSystemPrompt, gloamTurnMessage } from "./prompts/gloam";
import { conceptCheckMessage, conceptCheckPrompt, intentMessage, intentPrompt } from "./prompts/judge";
import { checkSafety } from "./safety";
import { conceptCheckSchema, intentSchema, performSchema, type Emotion, type Intent, type Quality } from "./schemas";
import { currentBeliefs, directBeat } from "@/lib/companion/director";
import { candidateConcepts, gradeCheck } from "@/lib/companion/grade";
import type { z } from "zod";
import { applyProgress, type Understanding } from "@/lib/companion/progress";
import type { LessonBlueprint } from "@/lib/lesson/types";

export interface TurnInput {
  lesson: LessonBlueprint;
  understanding: Understanding;
  history: { from: "student" | "gloam"; text: string }[];
  message: string;
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
  /** Where the reply came from. "offline" means the model isn't running. */
  source: "ai" | "safety" | "fallback" | "offline";
  ms: number;
}

/**
 * One companion turn:
 *   1. safety check (no model)
 *   2. judge: what did the student explain, and how well?
 *   3. progress rules + director (plain code): what happens in the story
 *   4. perform: Gloam says it, in character
 * Never throws. Students never see a raw error.
 */
export async function runTurn(input: TurnInput, hooks: { onJudged?: (e: JudgedEvent) => void } = {}): Promise<TurnOutput> {
  const { lesson, understanding, history, message } = input;
  const start = Date.now();
  const turn = history.filter((m) => m.from === "student").length;

  const safety = checkSafety(message, lesson.title);
  if (safety.kind !== "ok") {
    return {
      understanding,
      improved: [],
      clicked: [],
      judged: [],
      reply: safety.reply,
      emotion: safety.kind === "care" ? "curious" : "redirect",
      intent: "off_topic",
      onTopic: false,
      finished: false,
      source: "safety",
      ms: Date.now() - start,
    };
  }

  // 2. Judge: code picks the ideas this message could be about, the model checks each one
  const judged: { id: string; quality: Quality }[] = [];
  for (const concept of candidateConcepts(lesson, message)) {
    const res = await ask(conceptCheckSchema, "concept_check", conceptCheckPrompt(concept), conceptCheckMessage(message));
    if (res === "offline") return offline(understanding, start);
    const quality = res ? gradeCheck(message, res) : null;
    if (quality) judged.push({ id: concept.id, quality });
  }
  let intent: Intent = "explaining";
  if (judged.length === 0) {
    const res = await ask(intentSchema, "intent", intentPrompt(lesson), intentMessage(message));
    if (res === "offline") return offline(understanding, start);
    intent = res?.intent ?? "chatting";
    // It says "explaining" but nothing matched an idea: treat it as a vague attempt, not a lesson point
    if (intent === "explaining") intent = "chatting";
  }

  // 3. Progress + director
  const progress = applyProgress(understanding, judged);
  const beat = directBeat({ lesson, before: understanding, progress, intent, judged, turn });
  hooks.onJudged?.({ understanding: progress.understanding, improved: progress.improved, clicked: progress.clicked, emotion: beat.emotion });

  // 4. Perform
  const beliefs = currentBeliefs(lesson, progress.understanding);
  const allowed = [...history.filter((m) => m.from === "student").map((m) => m.text), message, ...beliefs, beat.fallback, beat.direction]
    .join(" ")
    .toLowerCase();
  const messages: ChatMessage[] = [
    { role: "system", content: gloamSystemPrompt(lesson) },
    {
      role: "user",
      content: gloamTurnMessage({
        history,
        message,
        beat: beat.direction,
        learned: lesson.concepts
          .filter((c) => progress.understanding[c.id] >= 2)
          .map((c) => c.beliefs[progress.understanding[c.id]]),
      }),
    },
  ];

  let reply: string | null = null;
  for (let attempt = 0; attempt < 3 && reply === null; attempt++) {
    const res = await chatJSON({ name: "gloam", schema: performSchema, temperature: 0.9, maxTokens: 120, messages });
    if (!res.ok) {
      if (res.reason === "unreachable") return offline(understanding, start);
      continue;
    }
    const leak = findGiveaway(lesson, progress.understanding, res.data.reply, allowed);
    if (leak) {
      messages.push(
        { role: "assistant", content: JSON.stringify(res.data) },
        { role: "user", content: `You said "${leak}", but you don't know that yet! The student has to teach you. Rewrite it without that.` },
      );
      continue;
    }
    const recentGloam = history.filter((m) => m.from === "gloam").slice(-3).map((m) => m.text);
    if (recentGloam.some((prev) => similarity(prev, res.data.reply) > 0.6)) {
      messages.push(
        { role: "assistant", content: JSON.stringify(res.data) },
        { role: "user", content: "You already said almost exactly that. Say something new, in different words." },
      );
      continue;
    }
    reply = tidy(res.data.reply);
  }

  return {
    understanding: progress.understanding,
    improved: progress.improved,
    clicked: progress.clicked,
    judged,
    emotion: beat.emotion,
    reply: reply ?? beat.fallback,
    intent,
    onTopic: intent !== "off_topic",
    finished: beat.finished,
    source: reply ? "ai" : "fallback",
    ms: Date.now() - start,
  };
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

function offline(understanding: Understanding, start: number): TurnOutput {
  return {
    understanding,
    improved: [],
    clicked: [],
    judged: [],
    reply: "",
    emotion: "confused",
    intent: "chatting",
    onTopic: true,
    finished: false,
    source: "offline",
    ms: Date.now() - start,
  };
}

/**
 * Did Gloam use an "answer word" for an idea it hasn't learned, that nobody has said yet?
 * Returns the word if so.
 */
export function findGiveaway(lesson: LessonBlueprint, understanding: Understanding, reply: string, allowed: string): string | null {
  const text = reply.toLowerCase();
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

function tidy(reply: string): string {
  const text = reply
    .replace(/^gloam:\s*/i, "")
    .replace(/^["'\s.]+|["'\s]+$/g, "")
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  // Small models ramble. Keep it to the first 3 sentences, and drop a dangling "So…" at the end.
  // "vs." and "e.g." are not the end of a sentence
  // (swap their dots for a look-alike "one dot leader" character so the splitter ignores them)
  const safe = text.replace(/\b(vs|e\.g|i\.e|etc)\./gi, (m) => m.replace(/\./g, "․"));
  let sentences: string[] = safe.match(/[^.!?…]+[.!?…]+["')]*|[^.!?…]+$/g) ?? [safe];
  if (sentences.length > 3) sentences = sentences.slice(0, 3);
  const dangling = (s: string) => s.trim().split(/\s+/).length <= 2 && !/[!?]["')]*$/.test(s.trim()) && /(\.\.\.|…|[^.!?…"')])$/.test(s.trim());
  while (sentences.length > 1 && dangling(sentences[sentences.length - 1])) sentences.pop();
  return sentences.join("").trim();
}

/** How much two lines overlap, 0..1 (shared words / words in the shorter line) */
function similarity(a: string, b: string): number {
  const words = (s: string) => new Set(s.toLowerCase().match(/[a-z']+/g) ?? []);
  const A = words(a);
  const B = words(b);
  if (A.size === 0 || B.size === 0) return 0;
  let shared = 0;
  for (const w of A) if (B.has(w)) shared++;
  return shared / Math.min(A.size, B.size);
}
