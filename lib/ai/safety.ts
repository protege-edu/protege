/**
 * A quick local check that runs BEFORE we ask the model anything.
 * If a message is clearly not okay for school, Gloam redirects in character
 * and the model never even sees it.
 *
 * This is a safety net, not the whole plan: the system prompt also tells Gloam
 * to stay school-appropriate and on topic.
 */

export type SafetyResult =
  | { kind: "ok" }
  | { kind: "redirect"; reply: string }
  | { kind: "care"; reply: string }
  /** The student was mean to Gloam. It shrugs it off with a joke, never gets sad or insults itself. */
  | { kind: "shrug"; reply: string };

// Words that mean a student might be struggling. Gloam drops the jokes for these.
const CARE = [/\bkill (my ?self|myself)\b/i, /\bsuicid/i, /\bself[- ]?harm/i, /\bcut(ting)? myself\b/i, /\bwant to die\b/i, /\bhurt myself\b/i];

// Clearly not-for-school stuff. Kept short on purpose. Gloam redirects, it never scolds.
const BLOCK = [
  /\bf+u+c+k/i,
  /\bf[u*@#$]*c?k(ing|er|ed)?\b/i,
  /\bf\*+/i, // censored swears like f***
  /\bwtf\b|\bstfu\b/i,
  /\bsh[i1*]t+\b/i,
  /\bb[i1]tch/i,
  /\bc[u\*]nt\b/i,
  /\bd[i1]ck\b/i,
  /\bp[o0]rn/i,
  /\bsex(y|ual)?\b/i,
  /\bn[i1]gg/i,
  /\bf[a4]gg?[o0]t/i,
  /\bretard/i,
  /\bnude/i,
  /\bboobs?\b/i,
];

const REDIRECTS = [
  (t: string) => `Whoa, my lantern just flickered. That's not school talk! Can we get back to "${t}"? I'm SO close to getting it.`,
  (t: string) => `Hmm, I'm a tiny lantern creature and I only run on school facts. Help me with "${t}" instead?`,
  () => "I'm going to pretend I didn't hear that and very politely ask you to teach me something real. Please. I'm begging.",
  (t: string) => `Nope, my brain only has room for one thing right now, and it's "${t}". Teach me!`,
];

// Mean (but not blocked) messages aimed at Gloam
const MEAN = [
  /\b(you'?re|ur|you are|u r)\s+(so\s+|really\s+|such\s+an?\s+)?(stupid|dumb|an idiot|idiot|useless|annoying|trash|the worst|lame|boring)\b/i,
  /\bshut up\b/i,
  /\bi hate (you|u|this|gloam)\b/i,
  /^\s*(idiot|stupid|dumb|loser)\W*$/i,
  /\b(you|u) suck\b/i,
];

const SHRUGS = [
  (t: string) => `Ouch. My lantern just made a sad little flicker. Okay, I forgive you. Now help me figure out "${t}"?`,
  () => "Hey! I'm doing my best with one tiny lantern here. Teach me one thing and watch me get smarter.",
  () => "Bold words from my teacher! Lucky for you, I don't hold grudges. I hold lanterns. Teach me something?",
  (t: string) => `I've been called worse by a moth. Anyway, I'm still stuck on "${t}" and I need you.`,
];

export function checkSafety(message: string, topic: string): SafetyResult {
  if (CARE.some((r) => r.test(message))) {
    return {
      kind: "care",
      reply:
        "Hey, I'm going to put the lesson down for a second. That sounds really heavy, and you matter way more than any lesson. Please talk to your teacher, a school counsellor, or another adult you trust. If you're in Canada or the US you can call or text 988 any time, day or night.",
    };
  }
  if (BLOCK.some((r) => r.test(message))) {
    const line = REDIRECTS[Math.floor(Math.random() * REDIRECTS.length)];
    return { kind: "redirect", reply: line(topic) };
  }
  if (MEAN.some((r) => r.test(message))) {
    const line = SHRUGS[Math.floor(Math.random() * SHRUGS.length)];
    return { kind: "shrug", reply: line(topic) };
  }
  return { kind: "ok" };
}
