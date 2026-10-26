import { frSenior, frStorybook, type FrenchStyle } from "./fr";
import { senior } from "./senior";
import type { AgeStyle, AgeStyleId, Language, Line } from "./types";
import { junior, little, middle } from "./younger";

export type { AgeStyle, AgeStyleId, Language } from "./types";
export { LANGUAGES } from "./types";

export const AGE_STYLES: Record<AgeStyleId, AgeStyle> = { little, junior, middle, senior };

/** The teacher picks a grade (0 = kindergarten). That picks the age style. */
export function styleForGrade(grade: number): AgeStyle {
  return Object.values(AGE_STYLES).find((s) => grade >= s.grades[0] && grade <= s.grades[1]) ?? senior;
}

const FRENCH: Record<AgeStyleId, FrenchStyle> = { senior: frSenior, little: frStorybook(true), junior: frStorybook(true), middle: frStorybook(false) };
// one object per style and language, so screens that depend on it don't redraw for nothing
const translated = new Map<string, AgeStyle>();

/** An age style, speaking a language: the same Gloam, the same look, every word and line in that language */
export function getAgeStyle(id: string | undefined, language: Language | string = "en"): AgeStyle {
  const base = AGE_STYLES[id as AgeStyleId] ?? senior;
  if (language !== "fr") return base;
  const key = `${base.id}:fr`;
  const hit = translated.get(key);
  if (hit) return hit;
  const fr = FRENCH[base.id];
  const world = base.look.world && fr.travel ? { ...base.look.world, travel: fr.travel } : base.look.world;
  const style: AgeStyle = {
    ...base,
    language: "fr",
    copy: fr.copy,
    lines: fr.lines,
    voice: { ...base.voice, rules: [...base.voice.rules, ...fr.voiceRules], banned: [...base.voice.banned, ...fr.banned] },
    look: { ...base.look, world },
  };
  translated.set(key, style);
  return style;
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
