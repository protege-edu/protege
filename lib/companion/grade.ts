import type { ConceptCheck, Quality } from "@/lib/ai/schemas";
import type { Concept, LessonBlueprint } from "@/lib/lesson/types";

// Words that usually mean the student explained WHY, not just WHAT
const REASON = /\b(because|cuz|cause|since|so|which means|that means|means|that's why|thats why|makes|causes|so that)\b/;

// Accents are folded, not deleted (être -> etre, mangé -> mange), so lessons in French and other
// languages match whether or not students type the accents.
const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s.']/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Which ideas could this message be about? Plain code, no AI:
 * a message is only checked against an idea if it uses one of that idea's evidence words.
 * So "yes" or "idk" can never count as teaching, and the AI can't file an answer under the wrong idea.
 */
export function candidateConcepts(lesson: LessonBlueprint, message: string): Concept[] {
  const msg = normalize(message);
  return lesson.concepts.filter((c) => c.evidence.some((e) => new RegExp(`\\b${escape(normalize(e))}`).test(msg)));
}

/** Turn the judge's answer about one idea into a grade. NEITHER means "not about this idea". */
export function gradeCheck(message: string, check: ConceptCheck): Quality | null {
  const msg = normalize(message);
  const words = msg.split(" ").length;
  // A one or two word answer like "tilt" is about the idea even if the judge can't tell which side it's on.
  // Gloam should react to it ("tilt. one word. bold."), not ignore it.
  if (check.matches === "NEITHER") return words <= 3 ? "vague" : null;
  if (check.matches === "WRONG") return "wrong";
  return (check.gaveReason || REASON.test(msg)) && words >= 6 ? "clear" : "partial";
}
