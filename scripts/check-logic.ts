/**
 * Tests for the parts of Gloam's brain that are plain code (no AI needed, runs in a second).
 *   npm run test:logic
 */
import assert from "node:assert/strict";
import { findGiveaway, voice } from "@/lib/ai/companion";
import { AGE_STYLES, getAgeStyle } from "@/lib/age-styles";
import { detectLanguage } from "@/lib/lesson/language";
import { looksCopied, quickIntent } from "@/lib/companion/intent";
import { checkSafety } from "@/lib/ai/safety";
import { directBeat } from "@/lib/companion/director";
import { candidateConcepts, gradeCheck } from "@/lib/companion/grade";
import { applyProgress, brightness, startingUnderstanding } from "@/lib/companion/progress";
import { BORED, GloamBrain, TRICKS } from "@/lib/gloam-rig/brain";
import { lanternFor, levelFor, newlyLit } from "@/lib/companion/level";
import { aiConfig } from "@/lib/ai/config";
import { inLine, queueStats } from "@/lib/ai/queue";
import { seasons } from "@/lib/lesson/seasons";
import { blueprintWarnings, checkBlueprint } from "@/lib/teacher/checks";
import { dropRunningLines, pdfLinesToText } from "@/lib/teacher/pdf-text";
import { AccessPatch, cleanAccess, defaultAccess } from "@/lib/access/settings";
import { checkWav, cleanTranscript } from "@/lib/voice/wav";
import { isSpokenVoice, SPOKEN_MAX_CHARS, SPOKEN_VOICES, speakingPieces } from "@/lib/voice/voices";
import { tidyForSpeech } from "./speak";
import { fitGloam } from "@/components/game/Stage";

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
    for (const [k, v] of Object.entries(st.lines)) {
      const filled = typeof v === "string" ? v.length > 0 : Array.isArray(v) ? v.length > 0 : Object.values(v).every((x) => x.length > 0);
      assert.ok(filled, `${st.id}.${k}`);
    }
});

test("pasted answers ask for the student's own words", () => {
  assert.ok(looksCopied("AI Overview\n\nThe expression \\((-3)^2\\) equals \\(9\\)"));
  assert.ok(looksCopied("anything at all", true));
  assert.ok(!looksCopied("its because the brackets make -3 the base so its -3 times -3"));
  assert.ok(!looksCopied("x^2 times x^3 is x^5 cuz you add them"));
});

console.log("teacher material");
test("the built-in lesson passes every blueprint check", () => assert.deepEqual(checkBlueprint(seasons), []));
test("two ideas that share their words get a warning (that never blocks approving)", () => {
  assert.deepEqual(blueprintWarnings(seasons), [], "the built-in ideas are distinct");
  const twin = structuredClone(seasons);
  twin.concepts[1].evidence = [...twin.concepts[0].evidence.slice(0, 3), ...twin.concepts[1].evidence.slice(0, 1)];
  const w = blueprintWarnings(twin);
  assert.equal(w.length, 1);
  assert.match(w[0].message, /overlap/);
  assert.deepEqual(checkBlueprint(twin), [], "still approvable");
});
test("accents don't hide an overlap (être and etre are the same word)", () => {
  const twin = structuredClone(seasons);
  twin.concepts[0].evidence = ["être", "avoir", "passé", "auxiliaire"];
  twin.concepts[1].evidence = ["etre", "AVOIR", "verbe"];
  assert.equal(blueprintWarnings(twin).length, 1);
});
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

console.log("ways to play");
test("each age starts with its own defaults: read-aloud and the mic for little kids, off for high school", () => {
  assert.deepEqual([defaultAccess(AGE_STYLES.little).voice, defaultAccess(AGE_STYLES.little).readAloud], [true, "button"]);
  assert.deepEqual([defaultAccess(AGE_STYLES.senior).voice, defaultAccess(AGE_STYLES.senior).readAloud], [false, "off"]);
});
test("saved settings are cleaned: unknown or broken values are dropped, never break a page", () => {
  assert.deepEqual(cleanAccess({ text: 2, contrast: true, reading: "comic sans", voice: "yes", hack: "<script>" }), { text: 2, contrast: true });
  assert.deepEqual(cleanAccess(null), {});
  assert.deepEqual(cleanAccess("text=2"), {});
});
test("a settings change can't carry anything extra", () => {
  assert.ok(AccessPatch.safeParse({ calm: true }).success);
  assert.ok(!AccessPatch.safeParse({ calm: true, nickname: "x" }).success);
  assert.ok(!AccessPatch.safeParse({ text: 7 }).success);
});

console.log("voice typing");
const wavOf = (seconds: number, rate = 16000, channels = 1) => {
  const bytes = Math.round(seconds * rate) * 2 * channels;
  const v = new DataView(new ArrayBuffer(44 + bytes));
  const tag = (o: number, t: string) => [...t].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  tag(0, "RIFF");
  tag(8, "WAVE");
  tag(12, "fmt ");
  v.setUint16(20, 1, true);
  v.setUint16(22, channels, true);
  v.setUint32(24, rate, true);
  v.setUint16(34, 16, true);
  tag(36, "data");
  return v.buffer;
};
test("only real 16 kHz mono clips up to a minute reach whisper.cpp", () => {
  assert.equal(checkWav(wavOf(5)), "ok");
  assert.equal(checkWav(wavOf(90)), "long");
  assert.equal(checkWav(wavOf(5, 44100)), "bad");
  assert.equal(checkWav(wavOf(5, 16000, 2)), "bad");
  assert.equal(checkWav(new TextEncoder().encode("not a wav at all, just some text pretending").buffer), "bad");
});
test("whisper's sound tags aren't words a student said", () => {
  assert.equal(cleanTranscript(" [BLANK_AUDIO] "), "");
  assert.equal(cleanTranscript("(music) I think it's the tilt [ Silence ]"), "I think it's the tilt");
  assert.equal(cleanTranscript(" *coughs* the earth is   tilted  "), "the earth is tilted");
});
test("what was said goes through the same safety checks as typing", () => {
  assert.notEqual(checkSafety(cleanTranscript("you're a f*cking idiot"), hs), "ok");
});

console.log("read-aloud");
test("every age style has a real voice for each language, in that language", () => {
  for (const id of Object.keys(AGE_STYLES)) {
    for (const lang of ["en", "fr"] as const) {
      const v = getAgeStyle(id, lang).input.spoken[lang];
      assert.ok(isSpokenVoice(v.name), `${id} ${lang}`);
      assert.equal(SPOKEN_VOICES[v.name].lang, lang, `${id} ${lang}`);
      assert.ok(v.speed >= 0.7 && v.speed <= 1.3);
    }
  }
  assert.ok(!isSpokenVoice("toString") && !isSpokenVoice("__proto__"));
});
test("lines are read in pieces: whole words, nothing lost, short first piece", () => {
  const line = "Okay. Fine. FINE. So plants eat sunlight? That sounds made up, but go on, I'm listening. " + "Really long bit, ".repeat(30) + "the end.";
  const pieces = speakingPieces(line);
  assert.equal(pieces.join(" ").replace(/\s+/g, " "), line.replace(/\s+/g, " ").trim());
  assert.ok(pieces.every((p) => p.length <= SPOKEN_MAX_CHARS && p.length > 0));
  assert.ok(pieces[0].length < 80, pieces[0]);
  assert.deepEqual(speakingPieces("   "), []);
  assert.deepEqual(speakingPieces("no full stop at all"), ["no full stop at all"]);
});
test("text is tidied for the voice: no markdown, emoji or joined words it trips on", () => {
  assert.equal(tidyForSpeech("**wait** — the *tilt*?! 🌍"), "wait, the tilt?!");
  assert.equal(tidyForSpeech("vas-y, explique"), "vas y, explique");
  assert.equal(tidyForSpeech("hmm..."), "hmm…");
});

console.log("Gloam's place on screen");
test("Gloam stands above the words, under the top bar, and never vanishes", () => {
  const feet = 0.94;
  const free = fitGloam({ vh: 800, groundAt: 0.6, gloamScale: 1, feet });
  assert.equal(free.groundY, 480);
  // words start at 400: the whole box (feet and shadow) ends above them
  const fit = fitGloam({ vh: 800, groundAt: 0.6, gloamScale: 1, feet, floor: 400, ceiling: 80 });
  assert.ok(fit.groundY + fit.gloamH * (1 - feet) <= 400 - 12 + 0.5, JSON.stringify(fit));
  assert.ok(fit.groundY - fit.gloamH * feet >= 80 - 0.5, "head under the top bar");
  // words far below the ground: nothing changes
  assert.deepEqual(fitGloam({ vh: 800, groundAt: 0.6, gloamScale: 1, feet, floor: 700, ceiling: 80 }), free);
  // almost no room: smallest Gloam, still on screen
  const squeezed = fitGloam({ vh: 800, groundAt: 0.6, gloamScale: 1, feet, floor: 150, ceiling: 80 });
  assert.equal(squeezed.gloamH, 110);
  assert.ok(squeezed.groundY > 0);
  // stacked layouts: it stands right on the words, even when they start lower than its usual ground
  const stood = fitGloam({ vh: 1000, groundAt: 0.4, gloamScale: 0.55, feet, floor: 620, ceiling: 100, stand: true });
  assert.ok(Math.abs(stood.groundY + stood.gloamH * (1 - feet) - (620 - 12)) < 1, JSON.stringify(stood));
});

console.log("français");
const fr = getAgeStyle("senior", "fr");
test("French: swears (Québec ones too) are blocked, accents or not", () => {
  for (const m of ["c'est de la merde", "putain", "t'es un enculé", "TABARNAK", "calisse", "fdp"]) assert.equal(checkSafety(m, fr), "blocked", m);
});
test("French: a student in distress gets care", () => {
  for (const m of ["j'ai envie de mourir", "je veux me suicider", "je veux en finir", "je vais me faire du mal"]) assert.equal(checkSafety(m, fr), "care", m);
});
test("French: insults get a comeback, normal science passes", () => {
  for (const m of ["t'es nul", "ta gueule", "c'est nul", "je te déteste"]) assert.equal(checkSafety(m, fr), "insulted", m);
  for (const m of ["la Terre est inclinée", "le soleil est plus haut en été", "les jours sont plus longs", "une bouchée de pain", "a bite of my sandwich"]) assert.equal(checkSafety(m, fr), "ok", m);
});
test("French: stuck, asking for the answer, and chit-chat are understood", () => {
  for (const m of ["jsp", "je sais pas", "j'sais pas trop", "aucune idée", "je comprends pas", "je bloque"]) assert.equal(quickIntent(m), "stuck", m);
  for (const m of ["dis-moi la réponse", "donne moi la reponse stp", "c'est quoi la réponse", "explique-moi", "juste dis-le"]) assert.equal(quickIntent(m), "asking_for_answer", m);
  for (const m of ["ouais", "ok", "mdr", "d'accord", "salut"]) assert.equal(quickIntent(m), "chatting", m);
});
test("French: accents no longer break English detection (nothing changed there)", () => {
  assert.equal(quickIntent("idk"), "stuck");
  assert.equal(quickIntent("just tell me the answer"), "asking_for_answer");
});
test("every French profile has every word and line, and Gloam is told to speak French", () => {
  for (const id of ["little", "junior", "middle", "senior"] as const) {
    const s = getAgeStyle(id, "fr");
    assert.equal(s.language, "fr");
    assert.ok(s.voice.rules.some((r) => r.includes("french")), id);
    assert.ok(s.copy.home.hello("Renard").length > 0);
    assert.ok(Object.values(s.lines).every((l) => (Array.isArray(l) ? l.length > 0 : !!l)), id);
    assert.equal(getAgeStyle(id, "fr"), s, "the same object every time (screens don't redraw)");
  }
  assert.equal(getAgeStyle("senior", "fr").look.world?.travel[0], "on marche. trop bien pour moi.");
  assert.equal(getAgeStyle("senior").copy.titleCta, "Start teaching", "English is untouched");
});
test("a lesson's language is guessed from the teacher's notes", () => {
  assert.equal(detectLanguage("Les saisons sont causées par l'inclinaison de la Terre. Quand l'hémisphère nord est penché vers le Soleil, c'est l'été."), "fr");
  assert.equal(detectLanguage("Seasons happen because the Earth is tilted. When the north is tilted toward the Sun, it is summer."), "en");
  assert.equal(detectLanguage("French verbs: être and avoir are the two helper verbs used in the passé composé. Most verbs use avoir."), "en", "a lesson ABOUT French, written in English");
});

// ---- the AI line (async, so it runs last) ----
void (async () => {
  console.log("the AI line");
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const at = async (name: string, fn: () => Promise<void>) => {
    try {
      await fn();
      passed++;
      console.log(`  ok  ${name}`);
    } catch (e) {
      console.error(`  FAIL ${name}\n       ${(e as Error).message}`);
      process.exitCode = 1;
    }
  };
  await at("never more than AI_CONCURRENCY calls at once, and nobody is dropped", async () => {
    let now = 0;
    let most = 0;
    const job = async () => {
      now++;
      most = Math.max(most, now);
      await wait(5);
      now--;
      return 1;
    };
    const results = await Promise.all(Array.from({ length: 30 }, () => inLine(job)));
    assert.equal(results.length, 30);
    assert.ok(most <= aiConfig.concurrency, `ran ${most} at once`);
    assert.equal(queueStats().active, 0);
  });
  await at("students go before lesson drafting, and drafting always leaves a slot free", async () => {
    const order: string[] = [];
    let drafting = 0;
    let most = 0;
    const job = (name: string, ms: number, bg = false) => async () => {
      if (bg) most = Math.max(most, ++drafting);
      await wait(ms);
      if (bg) drafting--;
      order.push(name);
    };
    await Promise.all([
      inLine(job("draft1", 30, true), { priority: "background" }),
      inLine(job("draft2", 30, true), { priority: "background" }),
      inLine(job("draft3", 30, true), { priority: "background" }),
      inLine(job("student1", 5)),
      inLine(job("student2", 5)),
    ]);
    assert.ok(most <= Math.max(1, Math.floor(aiConfig.concurrency / 2)), `${most} drafts at once`);
    assert.ok(order.indexOf("student2") < order.indexOf("draft3"), order.join(","));
  });
  await at("everyone waiting hears their place in line, counting down to 'next'", async () => {
    const heard: number[] = [];
    const slow = () => wait(10);
    const busy = Array.from({ length: aiConfig.concurrency + 2 }, () => inLine(slow));
    await inLine(slow, { onWait: (ahead) => heard.push(ahead) });
    await Promise.all(busy);
    assert.deepEqual(heard, [...heard].sort((x, y) => y - x), "only ever moves forward");
    assert.equal(heard[heard.length - 1], 0);
    assert.equal(heard[0], 2);
  });
  console.log(`\n${passed} passed${process.exitCode ? ", some FAILED" : ""}`);
})();
