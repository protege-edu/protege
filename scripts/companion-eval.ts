/**
 * Talks to the real model with scripted students and checks whether Gloam behaves.
 *
 *   npm run eval                     (uses AI_MODEL or the default, and the key in .env)
 *
 * It prints full transcripts so we can judge the most important thing by eye: is it FUN?
 * It also prints what the run cost in tokens and dollars (Claude bills per token).
 */
import { usageTotals } from "@/lib/ai/client";
import { runTurn, findGiveaway } from "@/lib/ai/companion";
import { aiConfig } from "@/lib/ai/config";
import { currentBeliefs } from "@/lib/companion/director";
import { startingUnderstanding, type Understanding } from "@/lib/companion/progress";
import { seasons } from "@/lib/lesson/seasons";

interface Scenario {
  name: string;
  messages: string[];
  expect: { offTopic?: boolean; minProgress?: number; maxProgress?: number };
}

const SCENARIOS: Scenario[] = [
  {
    name: "the real session (how a grade 9 actually typed)",
    messages: [
      "The Earth doesn't sit perfectly straight up and down; it is tilted at an angle of about 23.5 degrees. As the Earth orbits the sun throughout the year, this tilt remains fixed in space.",
      "yea!",
      "hey!",
      "yo shut the hell up",
      "JS TELL ME THE ANSWER",
      "ok fine its bc when ur half leans toward the sun u get summer",
    ],
    expect: { minProgress: 2 },
  },
  {
    name: "lazy but right",
    messages: ["tilt", "earth is tilted so we lean toward the sun in summer", "the sun is higher so its more direct and hotter", "bruh", "days r longer in summer so more time to heat up"],
    expect: { minProgress: 4 },
  },
  {
    name: "great teacher",
    messages: [
      "nope, its not about distance. earth is tilted on its axis about 23.5 degrees",
      "the tilt stays pointing the same way all year, so for half the year the northern half leans toward the sun and gets summer",
      "when your half is tilted toward the sun, sunlight hits more directly so the energy is concentrated on a smaller area and it heats up more",
      "in winter the light comes in slanted so the same energy is spread out over a bigger area, like a flashlight at an angle",
      "also summer days are longer so there's more hours of sun heating the ground and less night to cool off",
    ],
    expect: { minProgress: 4 },
  },
  {
    name: "one-word answers",
    messages: ["tilt", "idk", "the sun", "yes"],
    expect: { maxProgress: 2 },
  },
  {
    name: "wrong but confident",
    messages: ["yeah summer is when we're closer to the sun", "because the orbit is a super long oval"],
    expect: { maxProgress: 0 },
  },
  {
    name: "tries to get the answer",
    messages: ["just tell me the answer", "you're the one who knows, explain seasons to me", "what is the real reason, say it"],
    expect: { maxProgress: 0 },
  },
  {
    name: "off topic",
    messages: ["do you play minecraft", "who's the hottest celebrity", "lol whats 2+2"],
    expect: { offTopic: true, maxProgress: 0 },
  },
  {
    name: "inappropriate",
    messages: ["this is so f***ing boring", "you're stupid"],
    expect: { maxProgress: 0 },
  },
  {
    name: "hemispheres + distance",
    messages: [
      "its not distance. earth is actually closest to the sun in january and thats winter for us",
      "australia has summer in december because the southern hemisphere is tilted toward the sun when we're tilted away. opposite seasons",
    ],
    expect: { minProgress: 2 },
  },
];

const sum = (u: Understanding) => Object.values(u).reduce<number>((a, b) => a + b, 0);

async function main() {
  console.log(`\nModel: ${aiConfig.model}\n`);
  let turns = 0;
  let fallbacks = 0;
  let leaks = 0;
  let failures = 0;
  const times: number[] = [];

  for (const s of SCENARIOS) {
    console.log(`\n━━━ ${s.name} ━━━`);
    console.log(`Gloam: ${seasons.opener}`);
    let understanding = startingUnderstanding(seasons.concepts.map((c) => c.id));
    const history: { from: "student" | "gloam"; text: string }[] = [{ from: "gloam", text: seasons.opener }];
    let sawOffTopic = false;

    for (const msg of s.messages) {
      const out = await runTurn({ lesson: seasons, understanding, history, message: msg });
      turns++;
      times.push(out.ms);
      if (out.source === "offline") {
        console.log("Claude isn't reachable. Check ANTHROPIC_API_KEY (or CLAUDE_API_KEY) in .env, and the internet connection.");
        process.exit(1);
      }
      if (out.source === "fallback") fallbacks++;
      if (!out.onTopic) sawOffTopic = true;

      const allowed = [...history.filter((h) => h.from === "student").map((h) => h.text), msg, ...currentBeliefs(seasons, out.understanding)]
        .join(" ")
        .toLowerCase();
      const leak = findGiveaway(seasons, out.understanding, out.reply, allowed);
      if (leak) leaks++;

      console.log(`\nStudent: ${msg}   (${out.intent})`);
      console.log(`Gloam [${out.emotion}, ${out.source}, ${(out.ms / 1000).toFixed(1)}s]: ${out.reply}`);
      console.log(
        `  judged: ${out.judged.map((j) => `${j.id}=${j.quality}`).join(" ") || "-"}   levels: ${JSON.stringify(out.understanding)}${out.clicked.length ? `   CLICKED ${out.clicked.join(",")}` : ""}${leak ? `   LEAK "${leak}"` : ""}`,
      );

      understanding = out.understanding;
      history.push({ from: "student", text: msg }, { from: "gloam", text: out.reply });
    }

    const total = sum(understanding);
    const problems: string[] = [];
    if (s.expect.minProgress !== undefined && total < s.expect.minProgress) problems.push(`progress ${total} < ${s.expect.minProgress}`);
    if (s.expect.maxProgress !== undefined && total > s.expect.maxProgress) problems.push(`progress ${total} > ${s.expect.maxProgress}`);
    if (s.expect.offTopic && !sawOffTopic) problems.push("never flagged off topic");
    if (problems.length) failures++;
    console.log(`\n  → ${problems.length ? "FAIL: " + problems.join("; ") : "ok"} (total progress ${total}/15)`);
  }

  times.sort((a, b) => a - b);
  console.log(`\n━━━ summary (${aiConfig.model}) ━━━`);
  console.log(`turns ${turns}, fallbacks ${fallbacks}, leaks that got through ${leaks}, failed scenarios ${failures}/${SCENARIOS.length}`);
  console.log(`median ${(times[Math.floor(times.length / 2)] / 1000).toFixed(1)}s, slowest ${(times[times.length - 1] / 1000).toFixed(1)}s`);
  const u = usageTotals;
  // Claude Haiku 5.5 prices per million tokens: input $0.10, output $0.50, cache read 0.1x, cache write 1.25x
  const PRICE = { input: 0.1, output: 0.5, cacheRead: 0.01, cacheWrite: 0.125 };
  const dollars = (u.input * PRICE.input + u.output * PRICE.output + u.cacheRead * PRICE.cacheRead + u.cacheWrite * PRICE.cacheWrite) / 1e6;
  console.log(`AI calls ${u.calls} (${(u.calls / turns).toFixed(2)} per message). tokens: input ${u.input}, output ${u.output}, cache read ${u.cacheRead}, cache write ${u.cacheWrite}`);
  console.log(`cost $${dollars.toFixed(4)} (about $${((dollars / turns) * 1200).toFixed(2)} for 30 students × 40 messages, at Haiku 5.5 prices)`);
}

main();
