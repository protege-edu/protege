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
  | { kind: "care"; reply: string };

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
  return { kind: "ok" };
}
