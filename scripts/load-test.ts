/**
 * A pretend class: N students join one class and teach Gloam at the same time, with the real AI.
 * Measures how long each reply takes and how long the line gets. Nothing may error or time out.
 *
 *   npm run load-test -- --code GLOW-42                 30 students, 3 messages each
 *   npm run load-test -- --code GLOW-42 --students 10 --turns 2 --base http://localhost:3000
 *   npm run load-test -- --code GLOW-42 --pace fast     a stress test: everyone types every few seconds
 *
 * The normal pace is like a real class: a student reads Gloam's reply and types, about 15 to 45 seconds.
 *
 * Use a class made just for this (e.g. "Load test"): the pretend students join it for real.
 * The class needs the lesson (default: the built-in seasons lesson).
 */
const arg = (name: string, fallback?: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const base = arg("base", "http://localhost:3000")!.replace(/\/$/, "");
const code = arg("code");
const students = Number(arg("students", "30"));
const turns = Number(arg("turns", "3"));
const lessonId = arg("lesson", "seasons")!;
const fast = arg("pace", "real") === "fast";
if (!code) {
  console.log("Which class? npm run load-test -- --code GLOW-42");
  process.exit(1);
}

// What pretend students say: real explanations (the AI answers), and chit-chat (hand-written lines, instant)
const SAYINGS = [
  "its because the earth is tilted so one half leans toward the sun",
  "no its not distance, the earth is tilted",
  "when your half leans toward the sun the light hits more directly so its hotter",
  "the sunlight is more spread out in winter because it comes in at an angle",
  "days are longer in summer so theres more time to heat up",
  "the northern and southern hemisphere have opposite seasons",
  "idk",
  "yea",
  "the sun is closer in summer",
  "think of a flashlight shining straight down vs at a slant",
];
const pick = <T>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const letters = () => Array.from({ length: 4 }, () => "abcdefghjkmnpqrstuvwxyz"[Math.floor(Math.random() * 23)]).join("");

interface Turn {
  ms: number;
  source?: string;
  maxAhead: number;
  ok: boolean;
  why?: string;
}

async function student(n: number): Promise<Turn[]> {
  let cookie = "";
  const call = async (path: string, body: unknown) => {
    const res = await fetch(`${base}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: base, ...(cookie ? { Cookie: cookie } : {}) },
      body: JSON.stringify(body),
    });
    const set = res.headers.getSetCookie?.() ?? [];
    for (const c of set) if (c.startsWith("protege_student=")) cookie = c.split(";")[0];
    return res;
  };

  // join: code, then a new student with a picture key
  const found = await (await call("/api/join", { action: "code", code })).json();
  if (!found.classId) throw new Error(`student ${n}: class code didn't work (${found.error ?? "?"})`);
  const joined = await call("/api/join", { action: "new", classId: found.classId, nickname: `Tester ${letters()}`, key: ["moon", "owl", "fern"] });
  if (!joined.ok) throw new Error(`student ${n}: couldn't join (${(await joined.json()).error})`);
  const session = await (await call("/api/session", { lessonId })).json();
  if (!session.id) throw new Error(`student ${n}: no session (${session.error ?? "is the lesson given to this class?"})`);

  const out: Turn[] = [];
  for (let t = 0; t < turns; t++) {
    await wait(fast ? 2000 + Math.random() * 6000 : 15000 + Math.random() * 30000); // reading Gloam's reply, typing
    const start = Date.now();
    let maxAhead = 0;
    try {
      const res = await call("/api/companion", { sessionId: session.id, message: pick(SAYINGS) });
      if (!res.ok || !res.body) {
        out.push({ ms: Date.now() - start, maxAhead, ok: false, why: `HTTP ${res.status}` });
        continue;
      }
      const text = await res.text();
      let replied = false;
      let source: string | undefined;
      for (const line of text.split("\n").filter(Boolean)) {
        const ev = JSON.parse(line);
        if (ev.type === "queued") maxAhead = Math.max(maxAhead, ev.ahead + 1);
        if (ev.type === "reply") {
          replied = true;
          source = ev.source;
        }
        if (ev.type === "offline") throw new Error("the AI went offline");
      }
      out.push({ ms: Date.now() - start, maxAhead, ok: replied, source, why: replied ? undefined : "no reply" });
    } catch (e) {
      out.push({ ms: Date.now() - start, maxAhead, ok: false, why: (e as Error).message });
    }
  }
  return out;
}

async function main() {
  console.log(`A pretend class of ${students} at ${base}, ${turns} messages each, class ${code}, ${fast ? "stress pace" : "real pace"}.\n`);
  const began = Date.now();
  // students arrive over about 10 seconds, like a real class
  const all = await Promise.allSettled(Array.from({ length: students }, (_, i) => wait((i * 10000) / students).then(() => student(i + 1))));
  const failedJoins = all.filter((r) => r.status === "rejected").map((r) => (r as PromiseRejectedResult).reason.message);
  const results = all.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  const times = results.filter((r) => r.ok).map((r) => r.ms).sort((a, b) => a - b);
  const pct = (p: number) => (times.length ? times[Math.min(times.length - 1, Math.floor(p * times.length))] : 0);
  const s = (ms: number) => `${(ms / 1000).toFixed(1)}s`;
  const errors = results.filter((r) => !r.ok);

  console.log(`Students joined:   ${students - failedJoins.length} of ${students}`);
  for (const f of failedJoins.slice(0, 5)) console.log(`  ${f}`);
  console.log(`Messages answered: ${times.length} of ${results.length}`);
  console.log(`Reply time:        typical ${s(pct(0.5))}, slow (1 in 10) ${s(pct(0.9))}, slowest ${s(pct(1))}`);
  const by = (src: string) => results.filter((r) => r.source === src).length;
  console.log(`Gloam's words:     ${by("ai")} written by the AI, ${by("busy")} hand-written because the class was busy, ${by("line") + by("safety")} hand-written anyway (chit-chat)`);
  console.log(`Longest line:      ${Math.max(0, ...results.map((r) => r.maxAhead))} students waiting`);
  console.log(`Whole test:        ${s(Date.now() - began)}`);
  if (errors.length) {
    console.log(`\nPROBLEMS (${errors.length}):`);
    for (const e of errors.slice(0, 10)) console.log(`  ${e.why} after ${s(e.ms)}`);
    process.exitCode = 1;
  } else if (!failedJoins.length) {
    console.log("\nNo errors. Every student was answered.");
  }
}

void main();
