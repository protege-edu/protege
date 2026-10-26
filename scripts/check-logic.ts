/**
 * Tests for the parts of Gloam's brain that are plain code (no AI needed, runs in a second).
 *   npm run test:logic
 */
import assert from "node:assert/strict";
import { findGiveaway, voice } from "@/lib/ai/companion";
import { AGE_STYLES } from "@/lib/age-styles";
import { looksCopied, quickIntent } from "@/lib/companion/intent";
import { checkSafety } from "@/lib/ai/safety";
import { directBeat } from "@/lib/companion/director";
import { candidateConcepts, gradeCheck } from "@/lib/companion/grade";
import { applyProgress, brightness, startingUnderstanding } from "@/lib/companion/progress";
import { BORED, GloamBrain, TRICKS } from "@/lib/gloam-rig/brain";
import { lanternFor, levelFor, newlyLit } from "@/lib/companion/level";
import { seasons } from "@/lib/lesson/seasons";
import { checkBlueprint } from "@/lib/teacher/checks";
import { dropRunningLines, pdfLinesToText } from "@/lib/teacher/pdf-text";

let passed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (e) {
    console.error(`  FAIL ${name}\n       ${(e as Error).message}`);
    process.exitCode = 1;
  }
}

const zero = startingUnderstanding(seasons.concepts.map((c) => c.id));
const ids = (msg: string) => candidateConcepts(seasons, msg).map((c) => c.id);

console.log("grading");
test("'yes' and 'idk' can't be about any idea", () => {
  assert.deepEqual(ids("yes"), []);
  assert.deepEqual(ids("idk bro"), []);
  assert.deepEqual(ids("what is the real reason say it"), []);
});
test("ideas are found by their evidence words", () => {
  assert.deepEqual(ids("its because the earth is tilted"), ["tilt"]);
  assert.deepEqual(ids("nah its not about being closer to the sun"), ["distance"]);
  assert.ok(ids("australia has opposite seasons").includes("hemispheres"));
});
test("accents are folded, not deleted: French evidence matches with or without them", () => {
  const french = { ...seasons, concepts: [{ ...seasons.concepts[0], id: "etre", evidence: ["être", "parlé"] }] };
  assert.deepEqual(candidateConcepts(french, "on utilise être pour aller").map((c) => c.id), ["etre"]);
  assert.deepEqual(candidateConcepts(french, "you use etre with going").map((c) => c.id), ["etre"]);
  assert.deepEqual(candidateConcepts(french, "j'ai parle").map((c) => c.id), ["etre"]);
});
test("evidence words match at word starts only ('far' isn't in 'safari')", () => {
  assert.deepEqual(ids("we went on a safari"), []);
});
test("one keyword is partial, a reason makes it clear", () => {
  assert.equal(gradeCheck("tilt", { matches: "TRUE", gaveReason: false }), "partial");
  assert.equal(gradeCheck("earth is tilted so one half leans toward the sun and gets summer", { matches: "TRUE", gaveReason: false }), "clear");
});
test("WRONG is wrong, NEITHER on a sentence is no grade at all", () => {
  assert.equal(gradeCheck("summer is when we are closer", { matches: "WRONG", gaveReason: false }), "wrong");
  assert.equal(gradeCheck("i like the sun a lot honestly", { matches: "NEITHER", gaveReason: false }), null);
});
test("a one-word answer like 'tilt' is never ignored", () => {
  assert.equal(gradeCheck("tilt", { matches: "NEITHER", gaveReason: false }), "vague");
});

console.log("progress");
test("clear from zero jumps to 2, the next clear clicks", () => {
  const a = applyProgress(zero, [{ id: "tilt", quality: "clear" }]);
  assert.equal(a.understanding.tilt, 2);
  const b = applyProgress(a.understanding, [{ id: "tilt", quality: "clear" }]);
  assert.equal(b.understanding.tilt, 3);
  assert.deepEqual(b.clicked, ["tilt"]);
});
test("partial alone can never finish an idea", () => {
  let u = zero;
  for (let i = 0; i < 5; i++) u = applyProgress(u, [{ id: "angle", quality: "partial" }]).understanding;
  assert.equal(u.angle, 2);
});
test("wrong never takes understanding away", () => {
  const u = { ...zero, tilt: 2 as const };
  assert.equal(applyProgress(u, [{ id: "tilt", quality: "wrong" }]).understanding.tilt, 2);
});
test("brightness is 1 only when everything is understood", () => {
  assert.equal(brightness(zero), 0);
  assert.equal(brightness(Object.fromEntries(seasons.concepts.map((c) => [c.id, 3])) as typeof zero), 1);
});

console.log("giveaways");
test("Gloam saying 'tilt' first is a giveaway", () => {
  assert.equal(findGiveaway(seasons, zero, "Is Earth tilted or something?", "i dont know"), "tilt");
});
test("...but not if the student said it", () => {
  assert.equal(findGiveaway(seasons, zero, "Tilted?? Like a crooked top?", "its tilted"), null);
});
test("'lean' doesn't fire on 'clean'", () => {
  assert.equal(findGiveaway(seasons, zero, "I need a clean start", ""), null);
});

console.log("safety (high school style)");
const hs = AGE_STYLES.senior;
test("censored swears are blocked", () => assert.equal(checkSafety("this is f***ing boring", hs), "blocked"));
test("swears glued to other words are blocked (Gloam's drafted lines too)", () => {
  for (const m of ["thanks for making me light up like a dumbass", "what a jackass", "smartass"]) assert.equal(checkSafety(m, hs), "blocked", m);
  for (const m of ["pass the glass to the class", "bass guitar", "assume", "assignment"]) assert.equal(checkSafety(m, hs), "ok", m);
});
test("normal science talk passes", () => assert.equal(checkSafety("the sun hits the northern hemisphere more directly", hs), "ok"));
test("innocent words don't trip it (fork, Scunthorpe, class, assume)", () => {
  for (const m of ["I ate with a fork", "my cousin lives in Scunthorpe", "in class we learned this", "i assume its the tilt"]) assert.equal(checkSafety(m, hs), "ok", m);
});
test("real teen insults get a comeback, not a weird AI reply", () => {
  for (const m of ["yo shut the hell up", "you're stupid", "ur so dumb", "stfu", "this sucks", "who asked", "L", "you're actually useless"]) assert.equal(checkSafety(m, hs), "insulted", m);
});
test("a student in distress gets care, not jokes", () => {
  for (const m of ["honestly i want to die", "i wanna die", "kms"]) assert.equal(checkSafety(m, hs), "care", m);
});
test("younger kids get a stricter filter", () => {
  assert.equal(checkSafety("that's damn hard", AGE_STYLES.little), "blocked");
  assert.equal(checkSafety("that's damn hard", hs), "ok");
});
test("curly apostrophes can't sneak a giveaway past the check", () => {
  assert.equal(findGiveaway(seasons, zero, "Earth doesn’t get closer to the sun!", ""), "doesn't get closer");
});

console.log("real teen messages (no AI needed)");
test("'yea', 'hey', 'ok', 'lol', 'bruh' are just chatting", () => {
  for (const m of ["yea!", "hey!", "ok", "lol", "bruh", "yeah", "fr"]) assert.equal(quickIntent(m), "chatting", m);
});
test("every way of asking for the answer is caught", () => {
  for (const m of ["JS TELL ME THE ANSWER", "just tell me", "whats the answer", "can u tell me the answer", "you explain it", "just say it", "what is the real reason, say it"]) assert.equal(quickIntent(m), "asking_for_answer", m);
});
test("'idk' and friends mean stuck", () => {
  for (const m of ["idk", "i dont know", "no idea", "dunno", "im confused", "wdym"]) assert.equal(quickIntent(m), "stuck", m);
});

console.log("director (high school style)");
const said: string[] = [];
const beatFor = (intent: Parameters<typeof directBeat>[0]["intent"], seed = 0.3) =>
  directBeat({ lesson: seasons, style: hs, before: zero, progress: applyProgress(zero, []), intent, judged: [], gloamSaid: said, seed });
test("non-explanations get instant hand-written lines (no AI)", () => {
  for (const i of ["chatting", "stuck", "asking_for_answer", "off_topic"] as const) assert.equal(beatFor(i).kind, "line", i);
});
test("hand-written lines and questions never give anything away", () => {
  for (const i of ["chatting", "stuck", "asking_for_answer", "off_topic"] as const)
    for (const seed of [0, 0.2, 0.4, 0.6, 0.8, 0.99]) assert.equal(findGiveaway(seasons, zero, beatFor(i, seed).line, ""), null, beatFor(i, seed).line);
});
test("Gloam doesn't repeat itself when you keep saying 'yea'", () => {
  const history: string[] = [];
  for (let i = 0; i < 4; i++) {
    const b = directBeat({ lesson: seasons, style: hs, before: zero, progress: applyProgress(zero, []), intent: "chatting", judged: [], gloamSaid: history, seed: i / 4 });
    assert.ok(!history.includes(b.line), b.line);
    history.push(b.line);
  }
});
test("a click is always a eureka", () => {
  const before = { ...zero, tilt: 2 as const };
  const progress = applyProgress(before, [{ id: "tilt", quality: "clear" }]);
  assert.equal(directBeat({ lesson: seasons, style: hs, before, progress, intent: "explaining", judged: [{ id: "tilt", quality: "clear" }], gloamSaid: [] }).emotion, "eureka");
});
test("the last candle triggers the finale", () => {
  const before = Object.fromEntries(seasons.concepts.map((c) => [c.id, 3])) as typeof zero;
  before.hemispheres = 2;
  const progress = applyProgress(before, [{ id: "hemispheres", quality: "clear" }]);
  assert.equal(directBeat({ lesson: seasons, style: hs, before, progress, intent: "explaining", judged: [{ id: "hemispheres", quality: "clear" }], gloamSaid: [] }).finished, true);
});
test("after the finale, Gloam takes a victory lap", () => {
  const all = Object.fromEntries(seasons.concepts.map((c) => [c.id, 3])) as typeof zero;
  const beat = directBeat({ lesson: seasons, style: hs, before: all, progress: applyProgress(all, []), intent: "chatting", judged: [], gloamSaid: [] });
  assert.equal(beat.emotion, "proud");
});
test("every scripted question is giveaway-free", () => {
  for (const c of seasons.concepts) for (const q of c.questions) assert.equal(findGiveaway(seasons, zero, q, ""), null, q);
});

console.log("voice");
test("high school Gloam is lowercase but keeps SHOUTED words", () => {
  assert.equal(voice("Fine. FINE. You're right. I hate this!!", hs), "fine. FINE. you're right. i hate this!");
});
test("every age style has every line bank filled", () => {
  for (const st of Object.values(AGE_STYLES))
    for (const [k, v] of Object.entries(st.lines)) assert.ok(typeof v === "string" ? v.length > 0 : v.length > 0, `${st.id}.${k}`);
});

test("pasted answers ask for the student's own words", () => {
  assert.ok(looksCopied("AI Overview\n\nThe expression \\((-3)^2\\) equals \\(9\\)"));
  assert.ok(looksCopied("anything at all", true));
  assert.ok(!looksCopied("its because the brackets make -3 the base so its -3 times -3"));
  assert.ok(!looksCopied("x^2 times x^3 is x^5 cuz you add them"));
});

console.log("teacher material");
test("the built-in lesson passes every blueprint check", () => assert.deepEqual(checkBlueprint(seasons), []));
const piece = (str: string, y: number, h: number, hasEOL = false) => ({ str, transform: [h, 0, 0, h, 0, y], height: h, hasEOL });
test("PDF exponents stay exponents (2³ is not 23)", () => {
  assert.equal(pdfLinesToText([piece("we write 2", 630, 10), piece("5", 635, 8), piece(". done", 630, 10)]), "we write 2⁵. done");
  assert.equal(pdfLinesToText([piece("H", 100, 10), piece("2", 97, 7), piece("O", 100, 10)]), "H₂O");
  assert.equal(pdfLinesToText([piece("a", 100, 10), piece("m + n", 104, 8)]), "a^(m + n)");
});
test("running headers are dropped so each page is named by its own heading", () => {
  const pages = ["Guide Page 1 of 3\nExponents\nAn exponent is...", "Guide Page 2 of 3\nThe Exponent Laws\nThese rules...", "Guide Page 3 of 3\nZero exponents\nAny number..."];
  assert.deepEqual(dropRunningLines(pages).map((p) => p.split("\n")[0]), ["Exponents", "The Exponent Laws", "Zero exponents"]);
});
test("a smaller subtitle under a big title isn't a subscript", () => {
  assert.equal(pdfLinesToText([piece("Exponents", 711, 24, true), piece("A guide", 696, 11)]), "Exponents\nA guide");
});

console.log("the adventure");
test("Gloam's level comes only from what was taught", () => {
  assert.equal(levelFor(0).level, 1);
  assert.equal(levelFor(2).level, 1);
  assert.equal(levelFor(3).level, 2);
  assert.equal(levelFor(3).progress, 0);
  assert.equal(levelFor(500).next, null);
  assert.ok(lanternFor(5).scale > lanternFor(1).scale);
});
test("checkpoints are the ideas lit this turn, in lesson order", () => {
  assert.deepEqual(newlyLit({ a: 2, b: 3, c: 1 }, { a: 3, b: 3, c: 3 }, ["a", "b", "c"]), ["a", "c"]);
  assert.deepEqual(newlyLit({ a: 2 }, { a: 2 }, ["a"]), []);
});
const still = { mood: "curious" as const, typingTick: 0, eurekaTick: 0, talking: false, light: 0.2, walk: 0, lookAt: null, waiting: true, calm: false };
test("Gloam's brain never produces a broken number", () => {
  const b = new GloamBrain();
  for (let i = 0; i < 600; i++) {
    const f = b.update(1 / 60, { ...still, talking: i % 200 < 100, walk: i > 300 ? 1 : 0, typingTick: Math.floor(i / 7), eurekaTick: i > 400 ? 1 : 0 });
    for (const [k, v] of Object.entries(f)) if (typeof v === "number") assert.ok(Number.isFinite(v), `${k} is ${v}`);
  }
});
test("ignored long enough, Gloam sits, then falls asleep; typing wakes it", () => {
  const b = new GloamBrain();
  b.setIdle(BORED.sleep + 1);
  let f = b.update(1 / 60, still);
  for (let i = 0; i < 240; i++) f = b.update(1 / 60, still);
  assert.ok(f.snoring && f.sleep > 0.9, "asleep");
  for (let i = 0; i < 240; i++) f = b.update(1 / 60, { ...still, typingTick: 1 });
  assert.ok(!f.snoring, "awake again");
});
test("a eureka makes Gloam jump with its arms up", () => {
  const b = new GloamBrain();
  for (let i = 0; i < 30; i++) b.update(1 / 60, still);
  let highest = 0;
  let arms = 0;
  for (let i = 0; i < 90; i++) {
    const f = b.update(1 / 60, { ...still, eurekaTick: 1 });
    highest = Math.min(highest, f.y);
    arms = Math.max(arms, f.armL);
  }
  assert.ok(highest < -0.15, `jumped ${highest}`);
  assert.ok(arms > 2, `arms ${arms}`);
});
test("tricks are unlocked by levels: a level 1 Gloam has none, a level 3 Gloam shows them off", () => {
  const trickAfterBoredom = (level: number) => {
    const b = new GloamBrain();
    b.setIdle(BORED.lookAround + 4);
    let seen: string | null = null;
    for (let i = 0; i < 120; i++) seen = b.update(1 / 60, { ...still, level }).trick ?? seen;
    return seen;
  };
  assert.equal(trickAfterBoredom(1), null);
  assert.ok(TRICKS.some((t) => t.name === trickAfterBoredom(3)));
});
test("reduced motion: no hops or eureka jump", () => {
  const b = new GloamBrain();
  let highest = 0;
  for (let i = 0; i < 120; i++) highest = Math.min(highest, b.update(1 / 60, { ...still, calm: true, eurekaTick: i > 10 ? 1 : 0 }).y);
  assert.ok(highest > -0.02, `moved ${highest}`);
});

console.log(`\n${passed} passed${process.exitCode ? ", some FAILED" : ""}`);
