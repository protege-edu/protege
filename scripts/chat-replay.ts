/**
 * Replays a real play-test chat against the real model, the way a teacher's lesson is really made:
 * the notes are drafted into a lesson first, then every message goes through Gloam's real turn.
 * It fails if Gloam repeats a question it just asked, says something under 4 words, or ignores
 * good short answers. (This is the chat that showed Gloam asking the same question 4 times.)
 *
 *   npm run eval:replay            draft the lesson once (saved in data/replay/), then replay it
 *   npm run eval:replay -- --draft draft it again
 */
import fs from "node:fs";
import path from "node:path";
import { draftBlueprint } from "@/lib/ai/blueprint";
import { usageTotals } from "@/lib/ai/client";
import { runTurn } from "@/lib/ai/companion";
import { startingUnderstanding, type Understanding } from "@/lib/companion/progress";
import type { LessonBlueprint } from "@/lib/lesson/types";

const NOTES = `Canada's population distribution

Canada is the second largest country in the world by area, but it has only about 41 million people. Its population is not spread out evenly.

Most Canadians live in the south. About 75% of Canadians live within 160 km of the United States border. The busiest area is the Quebec City–Windsor corridor, along the Great Lakes and the St. Lawrence River. The Greater Toronto Area (GTA) in southern Ontario is the largest urban area in Canada.

Why do people live there? The south has a milder climate and a longer growing season. It has fertile farmland, lots of fresh water, and the Great Lakes and St. Lawrence River for transport and trade. Being close to the United States means trade and jobs, and cities with jobs attract even more people.

The north is very sparsely populated. The climate is harsh and cold, much of the ground is permafrost, and the growing season is very short, so it is hard to farm and expensive to build there.

Most Canadians (about 80%) live in cities. This is called urbanization.`;

// what the play-tester typed, word for word (and a few more of the same kind)
const STUDENT = [
  "No no I don't know",
  "And because of the climate and other resources if the resources in an area is better and the climate is good it's more favorable for",
  "I think It's because No, Gloam!",
  "in the GPTA",
  "in ontario, down the south",
  "shut it",
  "ok",
  "in ontario. down south in GTA becuase of the climate",
  "next",
  "next",
  "most people live near the us border because its warmer there",
  "idk",
  "the north is too cold and the ground is frozen so its hard to farm or build",
];

const sources: Record<string, number> = {};
const redraft = process.argv.includes("--draft");
const dir = path.join(process.cwd(), "data", "replay");

async function lessonFor(grade: number): Promise<LessonBlueprint> {
  const file = path.join(dir, `canada-grade-${grade}.json`);
  if (!redraft && fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf8"));
  console.log(`Drafting the lesson for grade ${grade}…`);
  const lesson = await draftBlueprint({ source: NOTES, grade, titleHint: "Canada's population" });
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(lesson, null, 2));
  return lesson;
}

const questionsIn = (text: string) => (text.match(/[^.!?]*\?/g) ?? []).map((q) => q.toLowerCase().replace(/[^a-z ]/g, "").replace(/\s+/g, " ").trim()).filter((q) => q.split(" ").length >= 4);

async function replay(grade: number): Promise<string[]> {
  const lesson = await lessonFor(grade);
  const problems: string[] = [];
  let understanding: Understanding = startingUnderstanding(lesson.concepts.map((c) => c.id));
  const history: { from: "student" | "gloam"; text: string; about?: string | null }[] = [{ from: "gloam", text: lesson.opener }];
  console.log(`\n=== grade ${grade} (${lesson.ageStyle}): "${lesson.title}", ideas: ${lesson.concepts.map((c) => c.name).join(" / ")}`);
  console.log(`Gloam: ${lesson.opener}`);
  for (const message of STUDENT) {
    const out = await runTurn({ lesson, understanding, history, message });
    console.log(`  You: ${message}`);
    const lines = [out.reply, ...(out.followUp ? [out.followUp.text] : [])];
    for (const line of lines) {
      const recent = history.filter((h) => h.from === "gloam").slice(-6).flatMap((h) => questionsIn(h.text));
      const again = questionsIn(line).find((q) => recent.includes(q));
      if (again) problems.push(`grade ${grade}: asked "${again}" again`);
      if (line.split(/\s+/).filter(Boolean).length < 4) problems.push(`grade ${grade}: a reply under 4 words: "${line}"`);
    }
    const moved = lesson.concepts.filter((c) => out.understanding[c.id] > understanding[c.id]).map((c) => `${c.name} → ${out.understanding[c.id]}`);
    sources[out.source] = (sources[out.source] ?? 0) + 1;
    console.log(`Gloam: ${out.reply}   [${out.source}${moved.length ? `, ${moved.join(", ")}` : ""}]`);
    if (out.followUp) console.log(`Gloam: ${out.followUp.text}   [straight after the candle]`);
    history.push({ from: "student", text: message }, { from: "gloam", text: out.reply, about: out.about });
    if (out.followUp) history.push({ from: "gloam", text: out.followUp.text, about: out.followUp.about });
    understanding = out.understanding;
  }
  const total = Object.values(understanding).reduce<number>((a, b) => a + b, 0);
  if (total < 3) problems.push(`grade ${grade}: good answers ("ontario", "GTA", "climate", "near the us border") only moved the candles ${total} step(s)`);
  return problems;
}

async function main() {
  const problems = [...(await replay(9)), ...(await replay(4))];
  const u = usageTotals;
  // Claude Haiku 5.5 prices per million tokens (as in companion-eval.ts)
  const dollars = (u.input * 0.1 + u.output * 0.5 + u.cacheRead * 0.01 + u.cacheWrite * 0.125) / 1e6;
  // "fallback" means the AI's reply failed its checks 3 times and Gloam used its hand-written line
  console.log(`\nWhere Gloam's replies came from: ${JSON.stringify(sources)}`);
  console.log(`Cost: ${u.calls} calls, about $${dollars.toFixed(3)}`);
  if (problems.length) {
    console.log(`\n${problems.length} problem(s):\n- ${problems.join("\n- ")}`);
    process.exitCode = 1;
  } else console.log("\nNo repeats, no one-word replies, and the good answers counted.");
}

void main();
