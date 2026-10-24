import { senior } from "./senior";
import type { AgeStyle, AgeStyleId, Line } from "./types";
import { junior, little, middle } from "./younger";

export type { AgeStyle, AgeStyleId } from "./types";

export const AGE_STYLES: Record<AgeStyleId, AgeStyle> = { little, junior, middle, senior };

/** The teacher picks a grade (0 = kindergarten). That picks the age style. */
export function styleForGrade(grade: number): AgeStyle {
  return Object.values(AGE_STYLES).find((s) => grade >= s.grades[0] && grade <= s.grades[1]) ?? senior;
}

export function getAgeStyle(id: string | undefined): AgeStyle {
  return AGE_STYLES[id as AgeStyleId] ?? senior;
}

/**
 * Pick a line Gloam hasn't said recently and fill in {topic} and {question}.
 * `recent` is what Gloam already said, so the same joke never shows up twice in a row.
 */
export function pickLine(lines: Line[], fill: { topic: string; question: string }, recent: string[] = [], seed = Math.random()): string {
  const said = recent.join("\n").toLowerCase();
  const fresh = lines.filter((l) => !said.includes(l.split("{")[0].trim().toLowerCase().slice(0, 24)));
  const pool = fresh.length ? fresh : lines;
  const line = pool[Math.floor(seed * pool.length) % pool.length];
  return line
    .replaceAll("{topic}", fill.topic)
    .replaceAll("{question}", fill.question)
    .replace(/\s+/g, " ")
    .trim();
}
