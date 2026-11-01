/**
 * Plays a whole lesson through the game layer with the real model: teaching, every idea's challenge,
 * then the boss fight, the way a good student would (explaining each idea in their own words).
 * Prints who said what, and fails if the lesson can't be finished or a line comes out empty.
 *
 *   npm run eval:game
 */
import { usageTotals } from "@/lib/ai/client";
import { playTurn, transcriptOf } from "@/lib/ai/game-turn";
import { startingUnderstanding, type Understanding } from "@/lib/companion/progress";
import { ORDER_ID } from "@/lib/game/engine";
import type { Action, Play } from "@/lib/game/types";
import { seasons } from "@/lib/lesson/seasons";

// how a grade 9 might explain each idea (and each challenge), in their own words
const SAY: Record<string, string> = {
  tilt: "earth is tilted like 23.5 degrees and it always leans the same way, so part of the year our half leans toward the sun",
  angle: "when the sun is high the light hits straight down so the energy is packed into a small area and heats more, slanted light spreads out",
  daylight: "in summer the days are longer so the ground gets more hours of sun to heat up and less night to cool down",
  distance: "its not distance, earths orbit is almost a circle and we're actually closest to the sun in january which is winter for us",
  hemispheres: "the north and south have opposite seasons because when one half leans toward the sun the other half leans away",
  "whatif-tilt": "there would basically be no seasons because no half would ever lean toward the sun, every place gets the same sunlight all year",
  "whatif-angle": "it would be way hotter everywhere because the light would always come straight down and pack the energy in",
  "whatif-daylight": "summer and winter would be less different because summer loses its extra hours of heating",
  "whatif-distance": "seasons would barely change because distance isn't what causes them, the tilt still does",
  "whatif-hemispheres": "winter, because argentina is in the southern half which leans away from the sun in july",
  [ORDER_ID]: "because leaning toward the sun makes it higher in the sky so the light hits more directly and the days are longer, so the ground gains more heat",
};

async function main() {
  const lesson = seasons;
  let understanding: Understanding = startingUnderstanding(lesson.concepts.map((c) => c.id));
  let play: Play | null = null;
  const history: { from: "student" | "gloam"; text: string; about?: string | null }[] = [{ from: "gloam", text: lesson.opener }];
  const problems: string[] = [];
  let fireflies = 0;
  let finished = false;
  for (let turn = 0; turn < 45 && !finished; turn++) {
    const open = play?.open ?? null;
    let action: Action | undefined;
    let message: string;
    if (!open) {
      const next = lesson.concepts.find((c) => understanding[c.id] < 3) ?? lesson.concepts[0];
      message = SAY[next.id];
    } else if (open.kind === "notebook" && open.phase === "spot") {
      action = { type: "pick", value: open.wrong };
      message = open.lines[open.wrong];
    } else if (open.kind === "order" && open.phase === "order") {
      action = { type: "order", value: open.answer };
      message = "(put the cards in order)";
    } else if (open.kind === "recital" && open.phase === "listen") {
      action = { type: "stop" };
      message = "stop!";
    } else if (open.kind === "whatif") message = SAY[`whatif-${open.conceptId}`];
    else if (open.kind === "order") message = SAY[ORDER_ID];
    else if (open.kind === "boss") message = SAY[open.rounds[open.round].conceptId];
    else message = SAY[open.conceptId];

    const out = await playTurn({ lesson, understanding, history, message, play, action, gameOn: true });
    if (out.source === "offline") {
      problems.push("Claude couldn't be reached");
      break;
    }
    console.log(`\n  You${action ? ` [${action.type}]` : ""}: ${message}`);
    const lines = transcriptOf(out);
    if (!lines.length) problems.push(`turn ${turn}: nobody said anything`);
    for (const l of lines) {
      if (!l.text.trim()) problems.push(`turn ${turn}: an empty line from ${l.who}`);
      console.log(`${l.who.padStart(6)}: ${l.text}`);
    }
    const moved = lesson.concepts.filter((c) => out.understanding[c.id] !== understanding[c.id]).map((c) => `${c.id} ${understanding[c.id]}→${out.understanding[c.id]}`);
    console.log(`        [${out.game?.event ?? out.source}${moved.length ? `, ${moved.join(", ")}` : ""}${out.fireflies ? `, +${out.fireflies} fireflies` : ""}${out.play?.open ? `, open: ${out.play.open.kind}` : ""}]`);
    for (const l of lines) if (l.who === "gloam") history.push({ from: "gloam", text: l.text, about: l.about ?? null });
    history.splice(history.length - lines.filter((l) => l.who === "gloam").length, 0, { from: "student", text: message });
    understanding = out.understanding;
    play = out.play;
    fireflies += out.fireflies;
    finished = out.finished;
  }
  if (!finished) problems.push("the lesson wasn't finished in 45 turns");
  const kinds = Object.values(play?.done ?? {});
  const u = usageTotals;
  const dollars = (u.input * 0.1 + u.output * 0.5 + u.cacheRead * 0.01 + u.cacheWrite * 0.125) / 1e6;
  console.log(`\nChallenges: ${JSON.stringify(play?.plan)} → ${kinds.join(", ")}. Boss: ${play?.boss ?? "not beaten"}. Fireflies: ${fireflies}.`);
  console.log(`Cost: ${u.calls} calls, about $${dollars.toFixed(3)}`);
  if (problems.length) {
    console.log(`\n${problems.length} problem(s):\n- ${problems.join("\n- ")}`);
    process.exitCode = 1;
  } else console.log("\nThe whole lesson plays through: every challenge and the boss.");
}

void main();
