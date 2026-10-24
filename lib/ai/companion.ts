import { chatJSON, type ChatMessage } from "./client";
import { gloamSystemPrompt, gloamTurnMessage } from "./prompts/gloam";
import { judgeSystemPrompt, judgeUserMessage } from "./prompts/judge";
import { checkSafety } from "./safety";
import { judgeSchema, performSchema, type Emotion, type Intent, type Judgement, type Quality } from "./schemas";
import { currentBeliefs, directBeat } from "@/lib/companion/director";
import { gradeIdeas } from "@/lib/companion/grade";
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

  // 2. Judge
  const ids = lesson.concepts.map((c) => c.id) as [string, ...string[]];
  const lastGloam = [...history].reverse().find((m) => m.from === "gloam")?.text ?? lesson.opener;
  let judgement: Judgement = { intent: "chatting", ideas: [] };
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await chatJSON({
      name: "judge",
      schema: judgeSchema(ids),
      temperature: 0,
      messages: [
        { role: "system", content: judgeSystemPrompt(lesson) },
        { role: "user", content: judgeUserMessage(lastGloam, message) },
      ],
    });
    if (res.ok) {
      judgement = res.data;
      break;
    }
    if (res.reason === "unreachable") return offline(understanding, start);
  }
  const judged = judgement.intent === "explaining" ? gradeIdeas(lesson, message, judgement.ideas) : [];

  // 3. Progress + director
  const progress = applyProgress(understanding, judged);
  const beat = directBeat({ lesson, before: understanding, progress, intent: judgement.intent, judged, turn });
  hooks.onJudged?.({ understanding: progress.understanding, improved: progress.improved, clicked: progress.clicked, emotion: beat.emotion });

  // 4. Perform
  const beliefs = currentBeliefs(lesson, progress.understanding);
  const allowed = [...history.filter((m) => m.from === "student").map((m) => m.text), message, ...beliefs, beat.fallback]
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
    reply = tidy(res.data.reply);
  }

  return {
    understanding: progress.understanding,
    improved: progress.improved,
    clicked: progress.clicked,
    judged,
    emotion: beat.emotion,
    reply: reply ?? beat.fallback,
    intent: judgement.intent,
    onTopic: judgement.intent !== "off_topic",
    finished: beat.finished,
    source: reply ? "ai" : "fallback",
    ms: Date.now() - start,
  };
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
  let text = reply
    .replace(/^gloam:\s*/i, "")
    .replace(/^["'\s.]+|["'\s]+$/g, "")
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  // Small models ramble. Keep it to the first 3 sentences.
  const sentences = text.match(/[^.!?]+[.!?]+["')]*|[^.!?]+$/g) ?? [text];
  if (sentences.length > 3) text = sentences.slice(0, 3).join("").trim();
  return text;
}
