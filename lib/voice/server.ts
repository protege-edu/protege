import "server-only";
import { voiceConfig } from "./config";
import { cleanTranscript } from "./wav";

export { checkWav } from "./wav";

/**
 * Voice typing on the teacher's laptop: a student's clip goes to whisper.cpp running on this same
 * computer and comes back as words. The clip only ever lives in memory for those few seconds:
 * it's never written to disk, logged or kept.
 */

// whisper.cpp runs on the CPU: a few clips at once, the rest wait their turn (kept across code reloads)
const store = globalThis as unknown as { protegeVoice?: { active: number; waiting: (() => void)[] } };
const line = (store.protegeVoice ??= { active: 0, waiting: [] });

/** More students waiting than this, and we say "busy" instead of making them wait a long time */
export const VOICE_LINE_MAX = 30;

async function inTurn<T>(job: () => Promise<T>): Promise<T> {
  if (line.active >= voiceConfig.concurrency) await new Promise<void>((go) => line.waiting.push(go));
  line.active++;
  try {
    return await job();
  } finally {
    line.active--;
    line.waiting.shift()?.();
  }
}

export const voiceBusy = () => line.waiting.length >= VOICE_LINE_MAX;

let checked = { at: 0, ok: false };
/** Is whisper.cpp running? (asked at most every 10 seconds) */
export async function voiceReady(): Promise<boolean> {
  if (Date.now() - checked.at < 10_000) return checked.ok;
  let ok = false;
  try {
    const res = await fetch(voiceConfig.url, { signal: AbortSignal.timeout(1500) });
    ok = res.status < 500;
  } catch {
    ok = false;
  }
  checked = { at: Date.now(), ok };
  return ok;
}

/** Turn a WAV clip (16 kHz mono, made in the browser) into words in `language`. Throws if whisper.cpp isn't running. */
export async function transcribe(wav: ArrayBuffer, language: "en" | "fr"): Promise<string> {
  return inTurn(async () => {
    const form = new FormData();
    form.append("file", new Blob([wav], { type: "audio/wav" }), "clip.wav");
    form.append("response_format", "json");
    form.append("language", language);
    form.append("temperature", "0.0");
    const res = await fetch(`${voiceConfig.url}/inference`, { method: "POST", body: form, signal: AbortSignal.timeout(voiceConfig.timeoutMs) });
    if (!res.ok) throw new Error(`voice server ${res.status}`);
    const out = (await res.json()) as { text?: string };
    return cleanTranscript(out.text ?? "");
  });
}
