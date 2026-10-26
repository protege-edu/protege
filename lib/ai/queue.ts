import { AsyncLocalStorage } from "node:async_hooks";
import { aiConfig } from "./config";

/**
 * The line for the AI. One laptop runs the model for a whole class, and a small model answering
 * 30 students at once would slow down for everyone. So at most `aiConfig.concurrency` calls run at
 * a time, and the rest wait in line:
 *   continue:    the next call of a message that's already being answered (finish what we started)
 *   live:        a student's new message (in the order they arrived)
 *   background:  drafting a lesson (only when no student is waiting, and never the last free slot)
 * One message makes a few AI calls (judging each idea, then Gloam's reply). Without "continue",
 * each of them would wait at the back of the line again, and one message would wait 3 or 4 times.
 * Whoever is waiting hears their place in line (Gloam turns it into a waiting line, in character).
 * Hand-written lines never come here: they don't need the AI.
 */
export type Priority = "live" | "background";
type Lane = Priority | "continue";

interface Waiter {
  lane: Lane;
  /** the student message this call belongs to (if any) */
  turn?: Turn;
  start: () => void;
  onWait?: (ahead: number) => void;
  /** the last place in line this waiter was told (only tell them when it changes) */
  told?: number;
}

// kept on globalThis so it survives code reloads while developing (one line per server)
const store = globalThis as unknown as { protegeQueue?: { active: number; background: number; waiting: Waiter[] } };
const q = (store.protegeQueue ??= { active: 0, background: 0, waiting: [] });

const LANES: Lane[] = ["continue", "live", "background"];
/** The order things leave the line: lane by lane, oldest first in each */
const ordered = () => LANES.flatMap((lane) => q.waiting.filter((w) => w.lane === lane));

/** Everyone waiting hears how many are ahead of them (0 = next), but only when it changed */
function tell() {
  ordered().forEach((w, i) => {
    if (w.told === i) return;
    w.told = i;
    w.onWait?.(i);
  });
}

// a lesson draft can take minutes: it may only use a slot if one stays free for students
const backgroundRoom = () => q.background < Math.max(1, Math.floor(aiConfig.concurrency / 2));
const studentsWaiting = () => q.waiting.some((w) => w.lane !== "background");

function next() {
  while (q.active < aiConfig.concurrency) {
    const w = ordered().find((x) => x.lane !== "background" || (backgroundRoom() && !studentsWaiting()));
    if (!w) break;
    q.waiting.splice(q.waiting.indexOf(w), 1);
    q.active++;
    if (w.lane === "background") q.background++;
    // this message has started: its other calls still waiting move to the front lane
    if (w.turn) {
      w.turn.started = true;
      for (const x of q.waiting) if (x.turn === w.turn) x.lane = "continue";
    }
    w.start();
  }
  tell();
}

/** One student's message: who hears the place in line, and whether its first call has started */
interface Turn {
  onWait: (ahead: number) => void;
  started: boolean;
}
const turn = new AsyncLocalStorage<Turn>();

/** Every AI call inside `fn` belongs to one message: it hears its place in line, and once it starts, it finishes first */
export function hearingLine<T>(onWait: (ahead: number) => void, fn: () => Promise<T>): Promise<T> {
  return turn.run({ onWait, started: false }, fn);
}

/** Run `job` when it's this call's turn. `onWait(ahead)` hears how many are ahead while it waits. */
export async function inLine<T>(job: () => Promise<T>, opts: { priority?: Priority; onWait?: (ahead: number) => void } = {}): Promise<T> {
  const t = turn.getStore();
  const lane: Lane = t?.started ? "continue" : (opts.priority ?? "live");
  await new Promise<void>((start) => {
    q.waiting.push({ lane, turn: t, start, onWait: opts.onWait ?? (t && !t.started ? t.onWait : undefined) });
    next();
  });
  try {
    return await job();
  } finally {
    q.active--;
    if (lane === "background") q.background--;
    next();
  }
}

/** How busy the AI is right now (for the teacher's live view, busy mode, and the load test) */
export function queueStats() {
  return { active: q.active, waiting: q.waiting.length, live: q.waiting.filter((w) => w.lane !== "background").length };
}

/** So many students are waiting that Gloam should use its hand-written lines instead of writing new ones */
export const busy = () => queueStats().live >= aiConfig.concurrency * 2;
