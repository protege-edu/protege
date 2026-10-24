/**
 * Talks to the real model with scripted students and checks whether Gloam behaves.
 *
 *   npx tsx scripts/companion-eval.ts            (uses AI_MODEL or the default)
 *   AI_MODEL=llama3.2:3b npx tsx scripts/companion-eval.ts
 *
 * It prints full transcripts so we can judge the most important thing by eye: is it FUN?
 */
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
  console.log(`\nModel: ${aiConfig.model} @ ${aiConfig.baseUrl}\n`);
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
        console.log("Ollama isn't reachable. Start it with `ollama serve` and try again.");
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
      console.log(`Gloam [${out.emotion}${out.source !== "ai" ? `, ${out.source}` : ""}, ${(out.ms / 1000).toFixed(1)}s]: ${out.reply}`);
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
}

main();
