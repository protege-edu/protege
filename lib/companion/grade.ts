import type { Judgement, Quality } from "@/lib/ai/schemas";
import type { LessonBlueprint } from "@/lib/lesson/types";

// Words that usually mean the student explained WHY, not just WHAT
const REASON = /\b(because|cuz|cause|since|so|which means|that means|means|that's why|thats why|makes|causes|so that)\b/;

const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9\s.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Turns the judge's report into fair grades, with checks a small model can't fool:
 *   1. The quote has to actually be in the student's message (mostly, typos are fine).
 *   2. The message has to contain a real "evidence" word for that idea.
 * Then: wrong → "wrong", correct + reason → "clear", correct without reason → "partial".
 */
export function gradeIdeas(lesson: LessonBlueprint, message: string, ideas: Judgement["ideas"]): { id: string; quality: Quality }[] {
  const msg = normalize(message);
  const msgWords = new Set(msg.split(" "));
  const out: { id: string; quality: Quality }[] = [];

  for (const idea of ideas) {
    const concept = lesson.concepts.find((c) => c.id === idea.id);
    if (!concept || out.some((o) => o.id === idea.id)) continue;

    const quoteWords = normalize(idea.quote).split(" ").filter(Boolean);
    if (quoteWords.length === 0) continue;
    const found = quoteWords.filter((w) => msgWords.has(w)).length / quoteWords.length;
    if (found < 0.6) continue; // the judge made the quote up

    if (!concept.evidence.some((e) => msg.includes(e.toLowerCase()))) continue;

    let quality: Quality;
    if (!idea.correct) quality = "wrong";
    else if ((idea.gaveReason || REASON.test(msg)) && msgWords.size >= 6) quality = "clear";
    else quality = "partial";
    out.push({ id: idea.id, quality });
  }
  return out;
}
