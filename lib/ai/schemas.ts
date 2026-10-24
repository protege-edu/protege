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
 * Step 1 of a turn: the judge. Cold, fast, temperature 0.
 * It has to QUOTE the student's words for every idea it credits. Code then checks
 * the quote is real, so a small model can't hallucinate progress.
 */
export function judgeSchema(conceptIds: readonly [string, ...string[]]) {
  return z.object({
    intent: z.enum(INTENTS),
    ideas: z
      .array(
        z.object({
          id: z.enum(conceptIds),
          quote: z.string().max(300),
          correct: z.boolean(),
          gaveReason: z.boolean(),
        }),
      )
      .max(conceptIds.length),
  });
}
export type Judgement = z.infer<ReturnType<typeof judgeSchema>>;

/** Step 2 of a turn: Gloam performs the beat the director picked. */
export const performSchema = z.object({
  reply: z.string().min(1).max(500),
});
export type Performance = z.infer<typeof performSchema>;
