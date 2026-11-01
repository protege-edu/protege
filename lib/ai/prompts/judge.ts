import type { LessonBlueprint } from "@/lib/lesson/types";

/**
 * The judge never talks to the student. It labels one message: what it's doing, and which of the
 * lesson's ideas it says something about (and which side of each idea it's on).
 * One call per message reads every idea at once. This prompt only changes when the lesson does,
 * so it's cached, and every message after the first reads it at a tenth of the price.
 */
export function judgePrompt(lesson: LessonBlueprint): string {
  const ideas = lesson.concepts.map((c) => `- id "${c.id}"\n  TRUE: ${c.truth}\n  WRONG: ${c.misconception}`).join("\n");
  return `You read one chat message from a student who is teaching a confused character the lesson "${lesson.title}". You never reply to the student. You only label their message, carefully and fairly.

THE LESSON'S IDEAS (each one has the TRUE version and a common WRONG version)
${ideas}

LABEL THE MESSAGE
intent: what the message is doing.
- "explaining": trying to explain something about the lesson, even if it's wrong
- "stuck": "idk", "i'm confused", giving up
- "asking_for_answer": wants to be told the answer ("just tell me", "you explain it")
- "skip": wants a different question ("next", "skip", "another one", "ask me something else")
- "off_topic": not about the lesson at all (games, food, people, other subjects)
- "chatting": greetings, "ok", "lol", short reactions, being rude

ideas: only the ideas the message actually says something about. Leave out every other idea: most messages are about zero or one.
- matches "TRUE" if it agrees with the TRUE version. Saying the WRONG version is false ("it's NOT because...") also counts as TRUE.
- matches "WRONG" if it agrees with the WRONG version.
- Slang, typos, short answers and other languages still count. Judge what they mean, not how well it's written.
- The student is often answering the question Gloam just asked. Judge a short answer in that context: "in ontario" answering
  "where do most people live?" says where people live.
- gaveReason: true only if the message also says WHY or HOW (because, so, which means).`;
}

/** The message, and what Gloam just said (a short answer only makes sense next to its question) */
export function judgeMessage(message: string, gloamJustSaid?: string): string {
  return `${gloamJustSaid ? `GLOAM JUST SAID: "${gloamJustSaid}"\n` : ""}STUDENT'S MESSAGE: "${message}"`;
}
