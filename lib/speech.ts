import type { AgeStyle } from "@/lib/age-styles";
import { speakingPieces, type SpokenVoice } from "@/lib/voice/voices";

/**
 * Read-aloud, two private ways, tried in this order:
 *   "laptop": Gloam's natural voice, made on the teacher's laptop (app/api/speak, Kokoro). The line goes to
 *             Protégé on that laptop and the sound comes back. Nothing is saved.
 *   "device": the browser's built-in voices, ONLY ones that run on the device (`localService`), so Gloam's
 *             words are never sent to an online speech service.
 * Neither? Then there's no read-aloud button, rather than a leak.
 */
type Lang = "en" | "fr";
const toLang = (lang: string | undefined): Lang => (lang === "fr" ? "fr" : "en");

function localVoice(lang: string): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices().filter((v) => v.localService && v.lang.toLowerCase().startsWith(lang));
  // prefer a Canadian voice, then any
  return voices.find((v) => /-ca$/i.test(v.lang)) ?? voices[0] ?? null;
}

// ---- is Gloam's voice running on the laptop? (asked once; asked again later if it wasn't) ----
let laptop: boolean | null = null;
let asking = false;
const listeners = new Set<() => void>();

function askLaptop() {
  if (asking || laptop === true || typeof window === "undefined") return;
  asking = true;
  void fetch("/api/speak", { cache: "no-store" })
    .then((r) => r.json())
    .then((j: { ready?: boolean }) => !!j.ready)
    .catch(() => false)
    .then((ready) => {
      asking = false;
      if (ready !== laptop) {
        laptop = ready;
        listeners.forEach((l) => l());
      }
      // the teacher might start it later
      if (!ready) setTimeout(askLaptop, 30_000);
    });
}

/** Listen for read-aloud becoming possible (device voices load late in some browsers; the laptop answers later) */
export function watchReadAloud(onChange: () => void): () => void {
  listeners.add(onChange);
  askLaptop();
  const synth = typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;
  synth?.addEventListener("voiceschanged", onChange);
  return () => {
    listeners.delete(onChange);
    synth?.removeEventListener("voiceschanged", onChange);
  };
}

/** Can this student hear this language read aloud (by the laptop, or on the device)? */
export function canReadAloud(lang: string): boolean {
  return laptop === true || !!localVoice(lang);
}

// ---- playing ----
let reading = 0;
let playing: { audio: HTMLAudioElement; done: () => void } | null = null;

function deviceSpeak(text: string, lang: Lang) {
  const voice = localVoice(lang);
  if (!voice) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.voice = voice;
  u.lang = voice.lang;
  u.rate = 0.9;
  u.pitch = 1.15;
  window.speechSynthesis.speak(u);
}

/** How long a student waits for the laptop before the device reads instead (the first piece; later ones are made while one plays) */
const FIRST_WAIT_MS = 6000;
const NEXT_WAIT_MS = 15000;

function piece(text: string, voice: SpokenVoice, waitMs: number): Promise<Blob> {
  return fetch("/api/speak", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text, voice: voice.name, speed: voice.speed }),
    signal: AbortSignal.timeout(waitMs),
  }).then((r) => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))));
}

function play(sound: Blob): Promise<void> {
  return new Promise((done) => {
    const url = URL.createObjectURL(sound);
    const audio = new Audio(url);
    const finish = () => {
      URL.revokeObjectURL(url);
      if (playing?.audio === audio) playing = null;
      done();
    };
    playing = { audio, done: finish };
    audio.onended = finish;
    audio.onerror = finish;
    audio.play().catch(finish);
  });
}

/** Each piece is played while the next one is being made */
async function laptopSpeak(text: string, voice: SpokenVoice, lang: Lang, id: number) {
  const pieces = speakingPieces(text);
  let next = pieces.length ? piece(pieces[0], voice, FIRST_WAIT_MS) : null;
  for (let i = 0; i < pieces.length && next; i++) {
    let sound: Blob;
    try {
      sound = await next;
    } catch {
      // the laptop couldn't (busy, slow or stopped): the device reads the rest
      if (id === reading) deviceSpeak(pieces.slice(i).join(" "), lang);
      return;
    }
    if (id !== reading) return;
    next = i + 1 < pieces.length ? piece(pieces[i + 1], voice, NEXT_WAIT_MS) : null;
    next?.catch(() => {});
    await play(sound);
    if (id !== reading) return;
  }
}

/** Read `text` aloud in this age style's voice and language. Stops anything already playing. */
export function readAloud(text: string, style: Pick<AgeStyle, "language" | "input">) {
  stopReading();
  const lang = toLang(style.language);
  if (laptop) void laptopSpeak(text, style.input.spoken[lang], lang, reading);
  else deviceSpeak(text, lang);
}

export function stopReading() {
  reading++;
  if (playing) {
    playing.audio.pause();
    playing.done();
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}
