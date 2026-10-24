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

/**
 * Step 1 of a turn: the judge. Cold and fast (temperature 0).
 * Code picks which ideas a message might be about; the model answers one focused question per idea.
 * An explicit choice ("TRUE"/"WRONG"/"NEITHER") is much more reliable for small models than a yes/no "correct" flag.
 */
export const conceptCheckSchema = z.object({
  matches: z.enum(["TRUE", "WRONG", "NEITHER"]),
  gaveReason: z.boolean(),
});
export type ConceptCheck = z.infer<typeof conceptCheckSchema>;

export const intentSchema = z.object({ intent: z.enum(INTENTS) });

/** Step 2 of a turn: Gloam performs the beat the director picked. */
export const performSchema = z.object({
  reply: z.string().min(1).max(500),
});
export type Performance = z.infer<typeof performSchema>;
