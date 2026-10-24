/**
 * Tests for the parts of Gloam's brain that are plain code (no AI needed, runs in a second).
 *   npm run test:logic
 */
import assert from "node:assert/strict";
import { findGiveaway } from "@/lib/ai/companion";
import { checkSafety } from "@/lib/ai/safety";
import { directBeat } from "@/lib/companion/director";
import { gradeIdeas } from "@/lib/companion/grade";
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
const idea = (id: string, quote: string, correct = true, gaveReason = false) => ({ id, quote, correct, gaveReason });

console.log("grading");
test("a made-up quote gets no credit", () => {
  assert.deepEqual(gradeIdeas(seasons, "yes", [idea("tilt", "earth is tilted toward the sun", true, true)]), []);
});
test("no evidence word, no credit", () => {
  assert.deepEqual(gradeIdeas(seasons, "what is the real reason say it", [idea("tilt", "the real reason")]), []);
});
test("one keyword is partial", () => {
  assert.deepEqual(gradeIdeas(seasons, "tilt", [idea("tilt", "tilt")]), [{ id: "tilt", quality: "partial" }]);
});
test("a reason makes it clear", () => {
  const msg = "earth is tilted so one half leans toward the sun and gets summer";
  assert.deepEqual(gradeIdeas(seasons, msg, [idea("tilt", msg)]), [{ id: "tilt", quality: "clear" }]);
});
test("the wrong idea is graded wrong", () => {
  const msg = "summer is when we are closer to the sun";
  assert.deepEqual(gradeIdeas(seasons, msg, [idea("distance", msg, false)]), [{ id: "distance", quality: "wrong" }]);
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
test("every scripted question is giveaway-free", () => {
  for (const c of seasons.concepts) for (const q of c.questions) assert.equal(findGiveaway(seasons, zero, q, ""), null, q);
});

console.log(`\n${passed} passed${process.exitCode ? ", some FAILED" : ""}`);
