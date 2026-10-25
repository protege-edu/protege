import { findGiveaway } from "@/lib/ai/companion";
import type { Concept, LessonBlueprint } from "@/lib/lesson/types";

/**
 * Plain-code checks on a lesson blueprint. Used twice:
 *   1. while the AI drafts it (anything that fails gets regenerated)
 *   2. on the teacher's review screen, so they can see and fix problems before approving
 */
export interface BlueprintProblem {
  conceptId?: string;
  field: string;
  message: string;
}

export function checkBlueprint(bp: LessonBlueprint): BlueprintProblem[] {
  const out: BlueprintProblem[] = [];
  const nothing = Object.fromEntries(bp.concepts.map((c) => [c.id, 0 as const]));
  if (bp.concepts.length < 2) out.push({ field: "concepts", message: "A lesson needs at least 2 ideas for Gloam to learn." });
  if (bp.concepts.length > 6) out.push({ field: "concepts", message: "More than 6 ideas is a lot for one lesson. Try removing some." });

  const ids = new Set<string>();
  for (const c of bp.concepts) {
    if (ids.has(c.id)) out.push({ conceptId: c.id, field: "id", message: `Two ideas share the name "${c.name}".` });
    ids.add(c.id);
    out.push(...checkConcept(c, bp, nothing));
  }

  const openerLeak = findGiveaway(bp, nothing, bp.opener, "");
  if (openerLeak) out.push({ field: "opener", message: `Gloam's first line gives away "${openerLeak}" before anyone teaches it.` });
  if (bp.storyBeats.length !== 5) out.push({ field: "storyBeats", message: "There should be 5 story beats, from dark to fully lit." });
  return out;
}

export function checkConcept(c: Concept, bp: LessonBlueprint, nothing: Record<string, 0> = {}): BlueprintProblem[] {
  const out: BlueprintProblem[] = [];
  const at = (field: string, message: string) => out.push({ conceptId: c.id, field, message });
  if (!c.truth.trim()) at("truth", `"${c.name}" needs the correct idea written out.`);
  if (!c.misconception.trim()) at("misconception", `"${c.name}" needs a wrong idea for Gloam to start with.`);
  if (c.beliefs.length !== 4 || c.beliefs.some((b) => !b.trim())) at("beliefs", `"${c.name}" needs all 4 of Gloam's belief stages.`);
  if (c.questions.length === 0) at("questions", `"${c.name}" needs at least one question for Gloam to ask.`);
  if (c.evidence.length < 3) at("evidence", `"${c.name}" needs more evidence words (words a student would use to explain it).`);
  if (!c.recap.trim()) at("recap", `"${c.name}" needs a plain-language recap for the end of the lesson.`);
  const lesson = { ...bp, concepts: bp.concepts };
  c.questions.forEach((q, i) => {
    const leak = findGiveaway(lesson, nothing, q, "");
    if (leak) at(`questions.${i}`, `Question ${i + 1} for "${c.name}" gives away "${leak}".`);
  });
  const firstLeak = c.giveaways.find((g) => c.beliefs[0]?.toLowerCase().includes(g.toLowerCase()));
  if (firstLeak) at("beliefs.0", `Gloam's starting belief for "${c.name}" already says "${firstLeak}".`);
  return out;
}

export function slug(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 32) || "idea"
  );
}
