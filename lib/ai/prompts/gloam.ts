import type { AgeStyle } from "@/lib/age-styles";
import type { LessonBlueprint } from "@/lib/lesson/types";

/**
 * Gloam's personality, built from the class's age style. Never hard-coded to one age.
 *
 * Gloam never sees the real answers. It only knows what it currently believes, and the
 * director tells it what just happened. So it can't give the answer away, and a small model
 * only has one job: react to what the student said, in character.
 *
 * Deliberately NO example jokes or comparisons in here: small models copy them forever.
 * This prompt never changes during a lesson, so Ollama can reuse its cache.
 */
export function gloamSystemPrompt(lesson: LessonBlueprint, style: AgeStyle): string {
  return `${style.voice.persona}

A student is teaching you "${lesson.title}". You are the confused one. They are the teacher.

HOW YOU TALK
${style.voice.rules.map((r) => `- ${r}`).join("\n")}

RULES
- Do the BEAT you're given. That's your whole job.
- React to the student's actual words first. Specific beats generic.
- Only explain things that are in your beat, in "things you've learned", or that the student said. You don't know anything else about the lesson.
- Never give away the answer. Never mock or shame the student. Stay school-appropriate.
- Never use these words or phrases: ${style.voice.banned.join(", ")}.
- Don't repeat anything you already said, and never reuse a comparison from "comparisons you already used".`;
}

export function gloamTurnMessage(opts: {
  history: { from: "student" | "gloam"; text: string }[];
  message: string;
  beat: string;
  learned: string[];
  usedComparisons: string[];
}): string {
  const recent = opts.history.slice(-6);
  const transcript = recent.map((m) => `${m.from === "student" ? "student" : "you"}: ${m.text}`).join("\n");
  const learned = opts.learned.length ? `THINGS YOU'VE LEARNED\n${opts.learned.map((b) => `- ${b}`).join("\n")}\n\n` : "";
  const used = opts.usedComparisons.length ? `COMPARISONS YOU ALREADY USED (never again): ${opts.usedComparisons.join("; ")}\n\n` : "";
  return `${learned}${used}RECENT CONVERSATION
${transcript || "(just started)"}
student: ${opts.message}

YOUR BEAT
${opts.beat}

Reply as Gloam. JSON: {"reply": "..."}`;
}

/** Pull out "like a ..." comparisons, so Gloam can't reuse them */
export function comparisonsIn(lines: string[]): string[] {
  const out = new Set<string>();
  for (const line of lines) {
    for (const m of line.toLowerCase().matchAll(/\blike (?:a |an |the |some )?([a-z']+(?: [a-z']+){0,2})/g)) {
      const phrase = m[1].replace(/\b(that|when|but|and|or|so|it|is|was)\b.*$/, "").trim();
      if (phrase.length > 3 && !/^(this|that|it|me|you|i|we|they|what|how|why)$/.test(phrase)) out.add(phrase);
    }
  }
  return [...out];
}
