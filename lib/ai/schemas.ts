import { z } from "zod";

/** Every feeling Gloam can show. Each one has its own pose in components/gloam/poses.ts */
export const EMOTIONS = [
  "confused",
  "curious",
  "skeptical",
  "excited",
  "sheepish",
  "proud",
  "eureka",
  "redirect",
] as const;
export type Emotion = (typeof EMOTIONS)[number];

/** How well the student's last message explained a concept */
export const QUALITIES = ["wrong", "vague", "partial", "clear"] as const;
export type Quality = (typeof QUALITIES)[number];

/** What the student is doing with their message */
export const INTENTS = ["explaining", "stuck", "asking_for_answer", "off_topic", "chatting"] as const;
export type Intent = (typeof INTENTS)[number];

/** How the judge sees one idea in a message. NEITHER: the message isn't about it. */
export interface ConceptCheck {
  matches: "TRUE" | "WRONG" | "NEITHER";
  gaveReason: boolean;
}

/**
 * Step 1 of a turn: the judge. One call labels the message against every idea in the lesson.
 * An explicit side ("TRUE"/"WRONG") is more reliable than a yes/no "correct" flag. Ideas it leaves out are NEITHER.
 */
export const judgeSchema = (ids: [string, ...string[]]) =>
  z.object({
    intent: z.enum(INTENTS),
    ideas: z.array(z.object({ id: z.enum(ids), matches: z.enum(["TRUE", "WRONG"]), gaveReason: z.boolean() })),
  });

/** Step 2 of a turn: Gloam performs the beat the director picked. */
export const performSchema = z.object({
  reply: z.string().min(1).max(500),
});
export type Performance = z.infer<typeof performSchema>;
