import type { AgeStyle } from "@/lib/age-styles";

/**
 * A quick local check that runs BEFORE the AI sees anything.
 * The age style picks HOW Gloam responds (the lines) and how strict the filter is.
 * The AI never even sees a blocked message.
 */
export type SafetyKind = "ok" | "care" | "blocked" | "insulted";

// Words that mean a student might be struggling. Gloam drops the jokes for these, at every age.
const CARE = [
  /\bkill (my ?self|myself)\b/i,
  /\bkms\b/i,
  /\bsuicid/i,
  /\bself[- ]?harm/i,
  /\bcut(ting)? myself\b/i,
  /\b(want|wanna) (to )?die\b/i,
  /\bhurt(ing)? myself\b/i,
  /\bend it all\b/i,
  /\bno reason to live\b/i,
];

// Not okay for school at any age. Gloam redirects, it never scolds.
const BLOCK = [
  /\bf+u+c+k/i,
  /\bf[u*@#$]*c?k(ing|er|ed|in)?\b/i,
  /\bf\*+/i,
  /\bfk\b|\bfkn\b|\bfking\b/i,
  /\bmf\b|\bmotherf/i,
  /\bwtf\b/i,
  /\bsh[i1*]t+\b|\bsh\*t|\bbs\b/i,
  /\bb[i1*]tch/i,
  /\bc[u*]nt\b/i,
  /\bd[i1*]ck\b|\bcock\b|\bpenis\b|\bvagina\b/i,
  /\bass(hole)?\b|\ba\$\$/i,
  /\bp[o0]rn/i,
  /\bsex(y|ual)?\b|\bhorny\b|\bnudes?\b|\bboobs?\b|\btits\b/i,
  /\bn[i1*]gg/i,
  /\bf[a4*]gg?[o0]?t?s?\b/i,
  /\bretard/i,
  /\bkys\b|\bkill yo(u|ur)self\b/i,
  /\bslut\b|\bwhore\b/i,
];

// Extra words blocked only for the youngest kids ("strict")
const STRICT_EXTRA = [/\bhell\b/i, /\bdamn\b/i, /\bcrap\b/i, /\bsucks?\b/i, /\bstupid\b/i, /\bdumb\b/i, /\bshut up\b/i, /\bhate\b/i];

// Mean (but not blocked) messages aimed at Gloam or the lesson
const MEAN = [
  /\b(you'?re|ur|you are|u r|youre)\s+(so\s+|really\s+|such\s+an?\s+|actually\s+|literally\s+)?(stupid|dumb|an idiot|idiot|useless|annoying|trash|garbage|the worst|lame|boring|cringe|mid|bad|slow)\b/i,
  /\bshut (the (hell|heck) )?up\b|\bstfu\b|\bshush\b|\bshut it\b/i,
  /\bi hate (you|u|this|gloam|it)\b/i,
  /^\s*(idiot|stupid|dumb|loser|clown|bozo|cringe|mid|trash|L)\W*$/i,
  /\b(you|u) suck\b|\bthis sucks\b/i,
  /\bnobody (cares|asked)\b|\bwho asked\b/i,
  /\bgo away\b|\bleave me alone\b/i,
];

export function checkSafety(message: string, style: AgeStyle): SafetyKind {
  if (CARE.some((r) => r.test(message))) return "care";
  if (BLOCK.some((r) => r.test(message))) return "blocked";
  if (style.safety.level === "strict" && STRICT_EXTRA.some((r) => r.test(message))) return "blocked";
  if (MEAN.some((r) => r.test(message))) return "insulted";
  return "ok";
}
