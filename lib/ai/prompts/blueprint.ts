import type { AgeStyle, Language } from "@/lib/age-styles";

/** Students read and answer in the lesson's language, so every word the AI writes for them has to be in it */
const writeIn = (language: Language | undefined) =>
  language === "fr"
    ? `
Write every text value in French (Canadian French is welcome). No English.`
    : "";

/** The age style's voice rules, minus their example quotes (small models copy examples word for word) */
const voiceRules = (style: AgeStyle) =>
  style.voice.rules
    .map((r) => r.replace(/\([^)]*\)/g, "").replace(/"[^"]*"/g, "").replace(/\s{2,}/g, " ").trim())
    .join(" ");

/**
 * Prompts that turn a teacher's material into a lesson blueprint, in small steps a laptop model can do well.
 * The teacher reviews and edits everything before students see it.
 */

// No example values anywhere in these prompts: small models copy examples word for word
// (an early French lesson came back with an idea called "The tilt", from a seasons example).
export function outlinePrompt(opts: { source: string; grade: number; titleHint?: string; language?: Language }) {
  return [
    {
      role: "system" as const,
      content: `You help a teacher turn their lesson notes into a teaching game for grade ${opts.grade === 0 ? "K" : opts.grade} students.
Students will TEACH a confused character, so we need the key ideas and the realistic wrong ideas students (and the character) start with.

Return JSON:
- title: a short question a student might wonder about, answered by these notes
- topic: 1 to 3 lowercase words naming what the notes are about
- subject: the grade and the school subject of these notes
- concepts: 3 to 5 key ideas from the notes, in teaching order. For each:
  - name: 2 to 4 plain words a student would use to name this idea, taken from these notes
  - truth: the correct idea in 1 or 2 plain sentences, including WHY. Only facts that are in the notes or are standard for this grade.
  - misconception: the most common realistic WRONG idea students have about it, in one plain sentence.
    If the notes list common mistakes or traps, use those first: they're what this class actually gets wrong.
    It must be FALSE. Double-check: if an expert would agree with it, it is not a misconception.

Only use ideas that are actually in the teacher's notes. No made-up facts.${writeIn(opts.language)}`,
    },
    {
      role: "user" as const,
      content: `${opts.titleHint ? `The teacher called this lesson: "${opts.titleHint}"\n\n` : ""}TEACHER'S NOTES:\n${opts.source}`,
    },
  ];
}

export function conceptPrompt(opts: {
  style: AgeStyle;
  lessonTitle: string;
  name: string;
  truth: string;
  misconception: string;
  otherIdeas: string[];
}) {
  const { style } = opts;
  return [
    {
      role: "system" as const,
      content: `You write lines for Gloam, a character who is CONFUSED about a lesson and gets taught by a student.
${style.voice.persona}
Gloam's voice: ${voiceRules(style)}

For ONE idea in the lesson "${opts.lessonTitle}", return JSON:
- beliefs: what Gloam believes as it slowly learns, in Gloam's voice, school-appropriate:
   wrong: confidently believes the WRONG idea (no hint of the truth at all)
   doubting: starting to doubt the wrong idea, a vague hint of the truth
   almost: almost there, has the TRUE idea but is missing the reason why
   gotIt: fully gets the TRUE idea, in its own words. This one must be CORRECT.
- questions: exactly 3 questions Gloam asks to get the student explaining, in Gloam's voice, ordered from
   [0] neutral (does NOT mention the answer at all) to [2] more specific. Never answer them.
   Gloam asks them while it STILL believes the wrong idea. A question must never contain the answer,
   and never say or hint that Gloam's idea is wrong (so never "why is it NOT ...?").
- giveaways: 3 to 6 key phrases of 1 to 4 words each (lowercase) that only someone who already KNOWS the true idea would say,
   like the key result, the key number, or the rule itself. Never a full sentence. NOT everyday topic words Gloam needs just to talk
   about this idea, and nothing from the idea's name or the wrong idea.
- evidence: 5 to 12 short lowercase word stems a student would almost certainly use when explaining this idea, right OR wrong (words from this idea and these notes)
- recap: the correct idea in 1 or 2 plain, friendly sentences for students (not in Gloam's voice)

Other ideas in this lesson (don't mix them in): ${opts.otherIdeas.join("; ") || "none"}${writeIn(style.language)}`,
    },
    {
      role: "user" as const,
      content: `IDEA: ${opts.name}\nTRUE: ${opts.truth}\nWRONG IDEA: ${opts.misconception}`,
    },
  ];
}

export function storyPrompt(opts: { style: AgeStyle; lessonTitle: string; topic: string; misconceptions: string[]; truths: string[] }) {
  const { style } = opts;
  return [
    {
      role: "system" as const,
      content: `You write lines for Gloam, a small creature with a lantern on its head that lights up as it understands things.
${style.voice.persona}
Gloam's voice: ${voiceRules(style)}

For the lesson "${opts.lessonTitle}", return JSON:
- opener: Gloam's first line. It proudly explains ONE wrong theory, based on this wrong idea: ${opts.misconceptions[0] ?? ""}. Never mention the true ideas. 1 to 3 short sentences.
- storyBeats: exactly 5 short lines of quiet narration as the valley lights up, from dark [0] to fully lit [4]. In the same style. No mention of the lesson content.
   (Gloam has ONE lantern. Each idea it learns lights a candle. Describe the place getting brighter; don't count lanterns or candles.
   [4] is the warmest, happiest moment of the whole lesson.)
- finale: Gloam's line when it finally understands everything. It sums up the true ideas briefly in its own words and thanks the student in its style.
- topicWords: 8 to 16 everyday lowercase words that mean a message is about this topic, even if it explains nothing

True ideas (for the finale only): ${opts.truths.join(" ")}${writeIn(style.language)}`,
    },
    { role: "user" as const, content: `Write it for the topic "${opts.topic}".` },
  ];
}

/** Rewrite one question that gives too much away. `problem` says what's wrong with it, in plain words. */
export function fixQuestionPrompt(opts: { style: AgeStyle; question: string; problem: string; name: string; misconception: string }) {
  return [
    {
      role: "system" as const,
      content: `${opts.style.voice.persona}
Gloam still believes this WRONG idea: ${opts.misconception}
This question about "${opts.name}" ${opts.problem}. Rewrite it so Gloam, still believing its wrong idea, gets the student explaining, WITHOUT giving away the answer or saying its own idea is wrong. Keep Gloam's voice: ${voiceRules(opts.style)}
Return JSON: {"question": "..."}`,
    },
    { role: "user" as const, content: opts.question },
  ];
}

/** Which of Gloam's questions give the answer away, or tell the student Gloam's idea is wrong? */
export function questionCheckPrompt(opts: { truth: string; misconception: string; questions: string[] }) {
  return [
    {
      role: "system" as const,
      content: `A confused character asks a student questions so the student will explain an idea. The character must NOT give the answer away.
For each question, in order, return revealsAnswer: true if the question states or strongly hints the TRUE idea, or says the WRONG idea is wrong. Otherwise false.
Return JSON: {"checks": [{"revealsAnswer": true or false}, ...]} with exactly ${opts.questions.length} items.`,
    },
    {
      role: "user" as const,
      content: `TRUE: ${opts.truth}
WRONG: ${opts.misconception}

QUESTIONS:
${opts.questions.map((q, i) => `${i + 1}. ${q}`).join("\n")}`,
    },
  ];
}

/** Are Gloam's first and last beliefs the right way round? (Small models sometimes shuffle the stages.) */
export function beliefCheckPrompt(opts: { truth: string; misconception: string; wrong: string; gotIt: string }) {
  return [
    {
      role: "system" as const,
      content: `You check two lines a character says while learning an idea.
Return JSON:
- startIsWrong: true if START says the same thing as WRONG (the mistaken idea)
- endIsTrue: true if END says the same thing as TRUE and contains nothing incorrect`,
    },
    { role: "user" as const, content: `TRUE: ${opts.truth}\nWRONG: ${opts.misconception}\n\nSTART: ${opts.wrong}\nEND: ${opts.gotIt}` },
  ];
}

/** A second look: is each idea really in the notes, really true, and is its "wrong idea" really wrong? */
export function factCheckPrompt(opts: { source: string; name: string; truth: string; misconception: string }) {
  return [
    {
      role: "system" as const,
      content: `You fact-check one idea for a school lesson, using the teacher's notes and standard school knowledge.
Return JSON:
- inNotes: true if the teacher's notes actually cover this idea
- truthIsCorrect: true if TRUE is accurate
- wrongIsActuallyWrong: true if WRONG is genuinely incorrect (a misconception), false if it is actually true
- note: if anything is false, one short plain sentence for the teacher explaining what to fix. Otherwise ""`,
    },
    { role: "user" as const, content: `TEACHER'S NOTES:
${opts.source}

IDEA: ${opts.name}
TRUE: ${opts.truth}
WRONG: ${opts.misconception}` },
  ];
}
