import { AsyncLocalStorage } from "node:async_hooks";
import { aiConfig } from "./config";

/**
 * The line for the AI. One laptop runs the model for a whole class, and a small model answering
 * 30 students at once would slow down for everyone. So at most `aiConfig.concurrency` calls run at
 * a time, and the rest wait in line, in the order they arrived:
 *   live:        a student talking to Gloam right now (always first)
 *   background:  drafting a lesson (waits until no student is waiting)
 * Whoever is waiting hears their place in line (Gloam turns it into a waiting line, in character).
 * Hand-written lines never come here: they don't need the AI.
 */
export type Priority = "live" | "background";

interface Waiter {
  priority: Priority;
  start: () => void;
  onWait?: (ahead: number) => void;
  /** the last place in line this waiter was told (only tell them when it changes) */
  told?: number;
}

// kept on globalThis so it survives code reloads while developing (one line per server)
const store = globalThis as unknown as { protegeQueue?: { active: number; waiting: Waiter[] } };
const q = (store.protegeQueue ??= { active: 0, waiting: [] }) as { active: number; background?: number; waiting: Waiter[] };

/** The order things leave the line: every live call first (oldest first), then background */
const ordered = () => [...q.waiting.filter((w) => w.priority === "live"), ...q.waiting.filter((w) => w.priority === "background")];

/** Everyone waiting hears how many are ahead of them (0 = next), but only when it changed */
function tell() {
  ordered().forEach((w, i) => {
    if (w.told === i) return;
    w.told = i;
    w.onWait?.(i);
  });
}

// a lesson draft can take minutes: it may only use a slot if one stays free for students
const backgroundRoom = () => (q.background ?? 0) < Math.max(1, aiConfig.concurrency - 1);

function next() {
  while (q.active < aiConfig.concurrency) {
    const w = ordered().find((x) => x.priority === "live" || (backgroundRoom() && !q.waiting.some((y) => y.priority === "live")));
    if (!w) break;
    q.waiting.splice(q.waiting.indexOf(w), 1);
    q.active++;
    if (w.priority === "background") q.background = (q.background ?? 0) + 1;
    w.start();
  }
  tell();
}

// who's listening for "your place in line" during this request (set once per turn, heard by every AI call in it)
const listener = new AsyncLocalStorage<(ahead: number) => void>();

/** Everything `fn` sends to the AI tells `onWait` its place in line while it waits */
export function hearingLine<T>(onWait: (ahead: number) => void, fn: () => Promise<T>): Promise<T> {
  return listener.run(onWait, fn);
}

/** Run `job` when it's this call's turn. `onWait(ahead)` hears how many are ahead while it waits. */
export async function inLine<T>(job: () => Promise<T>, opts: { priority?: Priority; onWait?: (ahead: number) => void } = {}): Promise<T> {
  const priority = opts.priority ?? "live";
  await new Promise<void>((start) => {
    q.waiting.push({ priority, start, onWait: opts.onWait ?? listener.getStore() });
    next();
  });
  try {
    return await job();
  } finally {
    q.active--;
    if (priority === "background") q.background = (q.background ?? 1) - 1;
    next();
  }
}

/** How busy the AI is right now (for the teacher's live view and the load test) */
export function queueStats() {
  return { active: q.active, waiting: q.waiting.length, live: q.waiting.filter((w) => w.priority === "live").length };
}
