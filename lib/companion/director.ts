import type { Emotion, Intent, Quality } from "@/lib/ai/schemas";
import type { Concept, LessonBlueprint } from "@/lib/lesson/types";
import type { ProgressResult, Understanding } from "./progress";

export interface Beat {
  emotion: Emotion;
  /** Stage directions for Gloam (the model performs these) */
  direction: string;
  /** A line we can use word-for-word if the model fails */
  fallback: string;
  /** Every candle is lit */
  finished: boolean;
}

/**
 * The director decides WHAT happens this turn. The model only decides HOW Gloam says it.
 * Keeping story logic in plain code means it's predictable, testable and fair to every student.
 */
export function directBeat(opts: {
  lesson: LessonBlueprint;
  before: Understanding;
  progress: ProgressResult;
  intent: Intent;
  judged: { id: string; quality: Quality }[];
  turn: number;
}): Beat {
  const { lesson, before, progress, intent, judged, turn } = opts;
  const u = progress.understanding;
  const byId = (id: string) => lesson.concepts.find((c) => c.id === id)!;
  const finished = lesson.concepts.every((c) => u[c.id] === 3);
  const next = nextConcept(lesson, u);
  const question = next ? next.questions[turn % next.questions.length] : "";
  const beat = (emotion: Emotion, direction: string, fallback: string): Beat => ({ emotion, direction, fallback, finished });

  if (finished && progress.clicked.length) {
    return beat(
      "eureka",
      `THE BIGGEST MOMENT. You finally understand the WHOLE lesson. Start with a huge "OHHHHHH". Say, in your own words: "${byId(progress.clicked[0]).beliefs[3]}" Then tell the student, sincerely and a bit dramatically, that they're a really good teacher.`,
      `OHHHHHH. ${byId(progress.clicked[0]).beliefs[3]} You're honestly a really good teacher.`,
    );
  }

  // Already finished earlier: a victory lap. Gloam knows it all now, so no more "I'm confused" questions.
  if (finished) {
    if (intent === "off_topic") {
      return beat("proud", `You already understand all of "${lesson.title}". The student changed the subject. Answer in one fun line, then brag a tiny bit about what they taught you.`, "Ha! Honestly, I'm still glowing from everything you taught me.");
    }
    return beat(
      "proud",
      `You now understand ALL of "${lesson.title}" because of this student. React happily to what they said. If it's about the lesson, agree or gently add something you learned. Thank them like a friend would. Don't ask about the lesson anymore.`,
      "Look at this lantern. LOOK AT IT. That's all you.",
    );
  }

  if (progress.clicked.length) {
    const c = byId(progress.clicked[0]);
    return beat(
      "eureka",
      `HUGE MOMENT. It finally clicks about "${c.name}". Start with a big "OHHHH" or "WAIT. WAIT." Then say this in your own words, amazed: "${c.beliefs[3]}" Keep it short and joyful. Don't ask a question this time.`,
      `OHHHH. WAIT. ${c.beliefs[3]}`,
    );
  }

  if (intent === "off_topic") {
    return beat(
      "redirect",
      `The student went off topic. Don't answer it seriously. Make one quick joke tying what they said to how confused you are about "${lesson.title}", then pull them back by asking: "${question}"`,
      `Ha, okay, but my lantern only runs on "${lesson.title}" right now. ${question}`,
    );
  }

  if (intent === "asking_for_answer") {
    return beat(
      "sheepish",
      `The student wants you to just give them the answer. You genuinely CAN'T, you don't know it, that's the whole problem. Say that dramatically and a little pathetically, then ask them a smaller question: "${question}"`,
      `I would LOVE to tell you, but my brain is a dim little lantern on this. That's why I need you. ${question}`,
    );
  }

  if (progress.improved.length) {
    const c = byId(progress.improved[0]);
    const level = u[c.id];
    const believe = c.beliefs[level];
    if (level === 1) {
      return beat(
        "sheepish",
        `The student just made you doubt your old idea about "${c.name}". You used to think: "${c.beliefs[0]}". Now you're wondering: "${believe}" React like your whole world is shaking a little, then ask them to explain WHY.`,
        `Hold on. ${believe} Okay but WHY?`,
      );
    }
    return beat(
      "excited",
      `Something is clicking about "${c.name}". You now think: "${believe}" Say it back in your own goofy words, excited but not 100% sure yet, then ask ONE question about the last missing piece.`,
      `Ooh. ${believe} I'm SO close. What am I still missing?`,
    );
  }

  const wrong = judged.find((j) => j.quality === "wrong");
  if (wrong) {
    const c = byId(wrong.id);
    const level = before[c.id];
    return beat(
      "skeptical",
      level === 0
        ? `What the student said agrees with your OWN wrong belief ("${c.beliefs[0]}"). Be smug and delighted that they agree with you for a second, then get a nagging doubt and ask: "${c.questions[turn % c.questions.length]}" Do NOT tell them they're wrong.`
        : `What the student said doesn't match what you've been learning, and it confuses you. Don't say they're wrong. Puzzle over it out loud, then ask: "${c.questions[turn % c.questions.length]}"`,
      `Hmm. Wait. ${c.questions[turn % c.questions.length]}`,
    );
  }

  const fuzzy = judged.find((j) => j.quality === "vague" || j.quality === "partial");
  if (fuzzy) {
    const c = byId(fuzzy.id);
    return beat(
      "curious",
      `The student mentioned "${c.name}" but didn't explain the WHY. You still believe: "${c.beliefs[u[c.id]]}". Ask them, in a funny specific way, to explain how that actually works.`,
      `Okay but HOW does that work? Walk me through it like I'm a lantern. Because I am.`,
    );
  }

  if (intent === "stuck") {
    return beat(
      "curious",
      `The student is stuck. Be warm and chill: you're confused too, you're in this together. No pressure. Ask a smaller, easier question: "${question}"`,
      `Honestly same, I'm lost too. Let's go smaller. ${question}`,
    );
  }

  return beat(
    "curious",
    `Respond to what the student said in one short line, then ask: "${question}"`,
    question || "Teach me something. Anything. I'm a sponge.",
  );
}

/** The concept Gloam should ask about next: the one it understands least. */
export function nextConcept(lesson: LessonBlueprint, u: Understanding): Concept | undefined {
  return [...lesson.concepts].filter((c) => u[c.id] < 3).sort((a, b) => u[a.id] - u[b.id])[0];
}

/** What Gloam currently believes about everything, used by the performer and the candles. */
export function currentBeliefs(lesson: LessonBlueprint, u: Understanding): string[] {
  return lesson.concepts.map((c) => c.beliefs[u[c.id] ?? 0]);
}
