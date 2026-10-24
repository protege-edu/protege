import type { LessonBlueprint } from "@/lib/lesson/types";

/**
 * The judge reads ONE student message and reports what it explained.
 * It never talks to the student. This prompt never changes during a lesson,
 * so Ollama can reuse its cache and answer faster.
 */
export function judgeSystemPrompt(lesson: LessonBlueprint): string {
  const concepts = lesson.concepts
    .map((c) => `- "${c.id}"\n  TRUE: ${c.truth}\n  COMMON WRONG IDEA: ${c.misconception}`)
    .join("\n");
  return `You check what a grade 9 student explained in ONE message, for the lesson "${lesson.title}".

THE IDEAS
${concepts}

Return JSON with:

intent (pick one):
- "explaining": trying to explain something about the lesson, even if wrong
- "stuck": "idk", "no idea", "i'm confused", giving up
- "asking_for_answer": wants the answer told to them
- "off_topic": not about the lesson at all
- "chatting": greetings, "ok", "yes", "lol", short reactions

ideas: one entry for each idea the message actually talks about (usually 0 or 1, sometimes 2).
- quote: copy the student's EXACT words about that idea
- correct: true if it matches TRUE, false if the student BELIEVES the COMMON WRONG IDEA.
  Careful: saying the wrong idea is false ("it's NOT distance", "it's not because we're closer") is CORRECT.
  Slang, typos and short answers can still be correct.
- gaveReason: true only if they also said WHY or HOW (words like because, so, which means, that's why)
If intent isn't "explaining", ideas must be [].

EXAMPLES
"tilt" → {"intent":"explaining","ideas":[{"id":"tilt","quote":"tilt","correct":true,"gaveReason":false}]}
"its cuz earth is tilted so one half faces the sun more" → {"intent":"explaining","ideas":[{"id":"tilt","quote":"earth is tilted so one half faces the sun more","correct":true,"gaveReason":true}]}
"summer is when we're closer to the sun" → {"intent":"explaining","ideas":[{"id":"distance","quote":"summer is when we're closer to the sun","correct":false,"gaveReason":false}]}
"it's not distance, we're actually closest to the sun in january" → {"intent":"explaining","ideas":[{"id":"distance","quote":"it's not distance, we're actually closest to the sun in january","correct":true,"gaveReason":true}]}
"yes" → {"intent":"chatting","ideas":[]}
"just tell me" → {"intent":"asking_for_answer","ideas":[]}`;
}

export function judgeUserMessage(lastGloamLine: string, message: string): string {
  return `(Gloam just said: "${lastGloamLine}")\n\nSTUDENT'S MESSAGE: "${message}"`;
}
