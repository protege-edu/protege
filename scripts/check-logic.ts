/**
 * Tests for the parts of Gloam's brain that are plain code (no AI needed, runs in a second).
 *   npm run test:logic
 */
import assert from "node:assert/strict";
import { findGiveaway } from "@/lib/ai/companion";
import { checkSafety } from "@/lib/ai/safety";
import { directBeat } from "@/lib/companion/director";
import { candidateConcepts, gradeCheck } from "@/lib/companion/grade";
import { applyProgress, brightness, startingUnderstanding } from "@/lib/companion/progress";
import { seasons } from "@/lib/lesson/seasons";

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
test("evidence words match at word starts only ('far' isn't in 'safari')", () => {
  assert.deepEqual(ids("we went on a safari"), []);
});
test("one keyword is partial, a reason makes it clear", () => {
  assert.equal(gradeCheck("tilt", { matches: "TRUE", gaveReason: false }), "partial");
  assert.equal(gradeCheck("earth is tilted so one half leans toward the sun and gets summer", { matches: "TRUE", gaveReason: false }), "clear");
});
test("WRONG is wrong, NEITHER is no grade at all", () => {
  assert.equal(gradeCheck("summer is when we are closer", { matches: "WRONG", gaveReason: false }), "wrong");
  assert.equal(gradeCheck("i like the sun", { matches: "NEITHER", gaveReason: false }), null);
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

console.log("safety");
test("censored swears are caught", () => assert.equal(checkSafety("this is f***ing boring", "x").kind, "redirect"));
test("normal science talk passes", () => assert.equal(checkSafety("the sun hits the northern hemisphere more directly", "x").kind, "ok"));
test("innocent words like 'fork' and 'Scunthorpe' don't trip it", () => {
  assert.equal(checkSafety("I ate with a fork", "x").kind, "ok");
  assert.equal(checkSafety("my cousin lives in Scunthorpe", "x").kind, "ok");
});
test("being mean to Gloam gets a good-natured shrug", () => {
  assert.equal(checkSafety("you're stupid", "x").kind, "shrug");
  assert.equal(checkSafety("shut up gloam", "x").kind, "shrug");
  assert.equal(checkSafety("the sun is not stupid it's tilted", "x").kind, "ok");
});
test("curly apostrophes can't sneak a giveaway past the check", () => {
  assert.equal(findGiveaway(seasons, zero, "Earth doesn’t get closer to the sun!", ""), "doesn't get closer");
});
test("a student in distress gets care, not jokes", () => assert.equal(checkSafety("honestly i want to die", "x").kind, "care"));

console.log("director");
test("a click is always a eureka", () => {
  const before = { ...zero, tilt: 2 as const };
  const progress = applyProgress(before, [{ id: "tilt", quality: "clear" }]);
  assert.equal(directBeat({ lesson: seasons, before, progress, intent: "explaining", judged: [{ id: "tilt", quality: "clear" }], turn: 1 }).emotion, "eureka");
});
test("asking for the answer never gives it", () => {
  const progress = applyProgress(zero, []);
  const beat = directBeat({ lesson: seasons, before: zero, progress, intent: "asking_for_answer", judged: [], turn: 0 });
  assert.equal(beat.emotion, "sheepish");
  assert.equal(findGiveaway(seasons, zero, beat.fallback, ""), null);
});
test("the last candle triggers the finale", () => {
  const before = Object.fromEntries(seasons.concepts.map((c) => [c.id, 3])) as typeof zero;
  before.hemispheres = 2;
  const progress = applyProgress(before, [{ id: "hemispheres", quality: "clear" }]);
  assert.equal(directBeat({ lesson: seasons, before, progress, intent: "explaining", judged: [{ id: "hemispheres", quality: "clear" }], turn: 9 }).finished, true);
});
test("after the finale, Gloam takes a victory lap instead of asking questions", () => {
  const all = Object.fromEntries(seasons.concepts.map((c) => [c.id, 3])) as typeof zero;
  const beat = directBeat({ lesson: seasons, before: all, progress: applyProgress(all, []), intent: "chatting", judged: [], turn: 12 });
  assert.equal(beat.emotion, "proud");
});
test("every scripted question is giveaway-free", () => {
  for (const c of seasons.concepts) for (const q of c.questions) assert.equal(findGiveaway(seasons, zero, q, ""), null, q);
});

console.log(`\n${passed} passed${process.exitCode ? ", some FAILED" : ""}`);
