import { pickLine } from "@/lib/age-styles";
import type { GameLines } from "@/lib/age-styles/game-lines";
import type { Emotion } from "@/lib/ai/schemas";
import type { GameEvent } from "./engine";
import type { Encounter } from "./types";

/** Who's talking: the rival and the Muddle have their own lines in the conversation */
export type Speaker = "gloam" | "rival" | "muddle";
export interface Said {
  who: Speaker;
  text: string;
}

interface Fill {
  topic: string;
  question: string;
  recent: string[];
  seed?: number;
}

/** Hand-written lines with the encounter's own words filled in ({claim}, {scenario}, {a}, {b}) */
function line(lines: string[], f: Fill, e?: Encounter | null): string {
  const raw = pickLine(lines, { topic: f.topic, question: f.question }, f.recent, f.seed);
  const claim = e?.kind === "rival" ? e.claim : e?.kind === "boss" ? bossClaim(e) : "";
  const scenario = e?.kind === "whatif" ? e.scenario : "";
  const [a, b] = e?.kind === "order" ? linkOf(e) : ["", ""];
  const n = e?.kind === "boss" ? String(e.combo) : "";
  return raw.replaceAll("{n}", n).replaceAll("{claim}", claim).replaceAll("{scenario}", scenario).replaceAll("{a}", a).replaceAll("{b}", b).replace(/\s+/g, " ").trim();
}


function bossClaim(e: Extract<Encounter, { kind: "boss" }>): string {
  const r = e.rounds[e.round];
  return r ? (r.mash ? `${r.claim} ${r.mash}` : r.claim) : "";
}

/** The link Gloam asks about once the cards are in order: the middle two, where the "why" lives */
function linkOf(e: Extract<Encounter, { kind: "order" }>): [string, string] {
  const right = e.answer.map((i) => e.cards[i]);
  const k = Math.max(0, Math.floor((right.length - 2) / 2));
  return [right[k], right[k + 1]];
}

/** What's said when a challenge or the boss starts */
export function openingLines(e: Encounter, g: GameLines, f: Fill): { said: Said[]; emotion: Emotion } {
  switch (e.kind) {
    case "notebook":
      return { said: [{ who: "gloam", text: line(g.notebook.open, f, e) }], emotion: "proud" };
    case "rival":
      return { said: [{ who: "rival", text: line(g.rivalSays.arrive, f, e) }, { who: "gloam", text: line(g.rivalGloam.tempted, f, e) }], emotion: "confused" };
    case "whatif":
      return { said: [{ who: "gloam", text: line(g.whatif.open, f, e) }], emotion: "curious" };
    case "order":
      return { said: [{ who: "gloam", text: line(g.order.open, f, e) }], emotion: "sheepish" };
    case "recital":
      // (Gloam's presentation itself is on the challenge card, typed slowly enough to stop)
      return { said: [{ who: "gloam", text: line(g.recital.open, f, e) }], emotion: "proud" };
    case "boss":
      return { said: [{ who: "muddle", text: line(g.bossSays.arrive, f, e) }], emotion: "confused" };
  }
}

/**
 * What's said after a move. `before` is the encounter the move was made in, `after` what it became.
 * A won challenge's big line is Gloam's (the AI, like any "I get it!"): only the rival's exit is here.
 */
export function eventLines(event: GameEvent, before: Encounter, after: Encounter | null, g: GameLines, f: Fill): { said: Said[]; emotion: Emotion } {
  const e = after ?? before;
  const gloam = (lines: string[], emotion: Emotion) => ({ said: [{ who: "gloam" as const, text: line(lines, f, e) }], emotion });
  if (event === "skipped") return gloam(g.skipped, "curious");

  if (before.kind === "boss") {
    const muddle = (lines: string[]) => ({ who: "muddle" as const, text: line(lines, f, before) });
    switch (event) {
      case "hit": {
        const said: Said[] = [muddle(g.bossSays.hit)];
        if (after?.kind === "boss" && after.combo >= 2) said.push({ who: "gloam", text: line(g.bossGloam.flare, f, after) });
        if (after) said.push({ who: "muddle", text: line(g.bossSays.round, f, after) });
        return { said, emotion: "excited" };
      }
      case "defeated":
        return { said: [muddle(g.bossSays.hit), muddle(g.bossSays.defeated)], emotion: "eureka" };
      case "glance":
        return { said: [muddle(g.bossSays.glance)], emotion: "curious" };
      case "miss": {
        const said: Said[] = [muddle(g.bossSays.miss)];
        if (before.tries >= 1) said.push({ who: "gloam", text: line(g.bossGloam.hint, f, before) });
        return { said, emotion: "sheepish" };
      }
      default:
        return { said: [muddle(g.bossSays.nothing)], emotion: "curious" };
    }
  }

  switch (before.kind) {
    case "notebook": {
      const b = g.notebook;
      if (event === "spotted") return gloam(b.spotted, "sheepish");
      if (event === "wrongPick") return gloam(b.wrongPick, "proud");
      if (event === "won") return gloam(b.won, "eureka");
      return gloam(event === "glance" ? b.glance : event === "miss" ? b.miss : b.nothing, event === "miss" ? "skeptical" : "curious");
    }
    case "rival": {
      if (event === "won") return { said: [{ who: "rival", text: line(g.rivalSays.defeated, f, e) }], emotion: "eureka" };
      const r = event === "glance" ? g.rivalSays.glance : event === "miss" ? g.rivalSays.miss : g.rivalSays.nothing;
      return { said: [{ who: "rival", text: line(r, f, e) }], emotion: event === "miss" ? "confused" : "curious" };
    }
    case "whatif": {
      const b = g.whatif;
      if (event === "won") return gloam(b.won, "eureka");
      return gloam(event === "glance" ? b.glance : event === "miss" ? b.miss : b.nothing, "curious");
    }
    case "order": {
      const b = g.order;
      if (event === "ordered") return gloam(b.ordered, "excited");
      if (event === "misordered") return gloam(b.misordered, "sheepish");
      if (event === "won") return gloam(b.won, "eureka");
      return gloam(event === "glance" ? b.glance : event === "miss" ? b.miss : b.nothing, "curious");
    }
    case "recital": {
      const b = g.recital;
      if (event === "stopped") return gloam(b.stopped, "sheepish");
      if (event === "won") return gloam(b.won, "eureka");
      return gloam(event === "glance" ? b.glance : event === "miss" ? b.miss : b.nothing, "curious");
    }
  }
}
