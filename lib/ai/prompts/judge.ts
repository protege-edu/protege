import type { Concept, LessonBlueprint } from "@/lib/lesson/types";

/**
 * The judge never talks to the student. It answers small, focused questions,
 * because small models are much more reliable at "A or B?" than at juggling a whole lesson.
 */

/** "Which version of THIS idea does the student agree with?" One idea at a time. */
export function conceptCheckPrompt(concept: Concept): string {
  return `You check one thing: which version of an idea a grade 9 student's message agrees with.

TRUE version: ${concept.truth}
WRONG version: ${concept.misconception}

Return JSON:
- matches: "TRUE" if the message agrees with the TRUE version. Saying the WRONG version is false (like "it's NOT that") also counts as TRUE.
           "WRONG" if the message agrees with the WRONG version.
           "NEITHER" if the message isn't really about this idea, or you can't tell.
  Slang, typos and short answers can still be TRUE.
- gaveReason: true only if the message also says WHY or HOW (because, so, which means, that's why).`;
}

export function conceptCheckMessage(message: string): string {
  return `STUDENT'S MESSAGE: "${message}"`;
}

/** For messages that don't mention any idea: what is the student doing? */
export function intentPrompt(lesson: LessonBlueprint): string {
  return `A grade 9 student is chatting with a character while learning "${lesson.title}". Say what their message is doing.

- "explaining": trying to explain something about the lesson, even if wrong
- "stuck": "idk", "no idea", "i'm confused", giving up
- "asking_for_answer": wants the answer told to them ("just tell me", "what's the answer", "you explain it")
- "off_topic": not about the lesson at all (games, food, people, other subjects, random stuff)
- "chatting": greetings, "ok", "yes", "lol", short reactions, being mean`;
}

export function intentMessage(message: string): string {
  return `STUDENT'S MESSAGE: "${message}"`;
}
