import "server-only";
import { speakConfig } from "./config";
import type { SpokenVoice } from "./voices";

/**
 * Read-aloud in Gloam's voice: asks the helper on this laptop (scripts/speak.ts) to say a line, and keeps
 * the sound in memory for a little while, so a line the whole class hears (the intro, the join steps,
 * Gloam's hand-written jokes) is only made once. Nothing is written to disk or logged, and the memory is
 * emptied after an hour and whenever Protégé restarts.
 */

const KEEP_MS = 60 * 60 * 1000;
const KEEP_BYTES = 96 * 1024 * 1024;

type Kept = { wav: ArrayBuffer; until: number };
// kept across code reloads in development
const store = globalThis as unknown as { protegeSpoken?: { kept: Map<string, Kept>; bytes: number; making: Map<string, Promise<ArrayBuffer>> } };
const memory = (store.protegeSpoken ??= { kept: new Map(), bytes: 0, making: new Map() });

function forget(key: string) {
  const k = memory.kept.get(key);
  if (!k) return;
  memory.bytes -= k.wav.byteLength;
  memory.kept.delete(key);
}

function keep(key: string, wav: ArrayBuffer) {
  const now = Date.now();
  for (const [k, v] of memory.kept) if (v.until < now) forget(k);
  // oldest first (a Map remembers the order things went in)
  for (const k of memory.kept.keys()) {
    if (memory.bytes + wav.byteLength <= KEEP_BYTES) break;
    forget(k);
  }
  memory.kept.set(key, { wav, until: now + KEEP_MS });
  memory.bytes += wav.byteLength;
}

let checked = { at: 0, ok: false };
/** Is the read-aloud helper running? (asked at most every 10 seconds) */
export async function speakReady(): Promise<boolean> {
  if (Date.now() - checked.at < 10_000) return checked.ok;
  let ok = false;
  try {
    ok = (await fetch(speakConfig.url, { signal: AbortSignal.timeout(1500) })).ok;
  } catch {
    ok = false;
  }
  checked = { at: Date.now(), ok };
  return ok;
}

/** More lines waiting than this, and the browser uses the device's voice instead of waiting */
export const SPEAK_LINE_MAX = 40;
export const speakBusy = () => memory.making.size >= SPEAK_LINE_MAX;

/** A line as WAV sound. Throws if the helper isn't running. */
export async function speak(text: string, voice: SpokenVoice): Promise<ArrayBuffer> {
  const key = `${voice.name}|${voice.speed}|${text}`;
  const hit = memory.kept.get(key);
  if (hit && hit.until > Date.now()) {
    // used again: move it to the back of the line for forgetting
    memory.kept.delete(key);
    memory.kept.set(key, hit);
    return hit.wav;
  }
  // the same line asked for by several students at once is only made once
  let making = memory.making.get(key);
  if (!making) {
    making = (async () => {
      const res = await fetch(`${speakConfig.url}/speak`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, voice: voice.name, speed: voice.speed }),
        signal: AbortSignal.timeout(speakConfig.timeoutMs),
      });
      if (!res.ok) throw new Error(`read-aloud helper ${res.status}`);
      const wav = await res.arrayBuffer();
      keep(key, wav);
      return wav;
    })().finally(() => memory.making.delete(key));
    memory.making.set(key, making);
  }
  return making;
}
