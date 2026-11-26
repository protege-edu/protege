import type { AgeStyle } from "@/lib/age-styles";

/**
 * Read-aloud: the browser's built-in voices, ONLY ones that run on the device (`localService`), so Gloam's
 * words are never sent to an online speech service. None on this device? Then there's no read-aloud
 * button, rather than a leak.
 *
 * Devices ship a pile of voices and most of them sound like a robot from 2004. The ranking below picks the
 * most human-sounding one the device actually has: the modern "neural/natural/enhanced" voices first, then
 * the handful of older voices that still sound like a real, warm person (Apple's Samantha, Ava…), and it
 * pushes the flat robotic ones (Microsoft David/Zira, eSpeak) and the joke voices (Zarvox, Bubbles…) to the
 * bottom so they're only ever a last resort.
 */
type Lang = "en" | "fr";
const toLang = (lang: string | undefined): Lang => (lang === "fr" ? "fr" : "en");

/** Just the bits of a voice we rank on — so the ranking is a pure function we can test without a browser. */
export interface VoiceLike {
  name: string;
  lang: string;
  localService: boolean;
}

// The modern, genuinely human-sounding voices: these labels mean a neural/high-quality engine.
const MODERN = /natural|neural|enhanced|premium|\bplus\b|siri|\bwavenet\b/i;
// Older voices that still sound like a real, warm person (Apple on macOS/iOS; Google on Chrome/Android).
const HUMAN =
  /\b(samantha|ava|allison|susan|joelle|zoe|nicky|aaron|evan|serena|stephanie|tom|alex|daniel|arthur|oliver|kate|martha|google|am[eé]lie|thomas|audrey|aur[eé]lie|chantal|nicolas|marie|flora|val[eé]rie)\b/i;
// Flat, mechanical voices (older Microsoft, open-source engines, "compact" cut-downs).
const ROBOTIC = /\b(david|zira|mark|hazel|george|james|catherine|richard|linda|heera|ravi|hortense)\b|microsoft|espeak|speech dispatcher|pico|festival|flite|compact|eloquence/i;
// The novelty / joke voices Apple ships — fun once, never for reading a lesson.
const NOVELTY =
  /\b(albert|fred|ralph|kathy|vicki|victoria|bruce|agnes|junior|princess|bad news|good news|bahh|bells|boing|bubbles|cellos|deranged|hysterical|jester|organ|superstar|trinoids|whisper|wobble|zarvox|rocko|shelley|grandma|grandpa|reed|sandy|flo|eddy|rishi|wobble|cellos|trinoids)\b/i;

/** Score a voice: higher is more human. Used to sort; the winner reads Gloam's lines. */
function score(v: VoiceLike): number {
  const n = v.name;
  let s = 0;
  if (MODERN.test(n)) s += 100;
  if (HUMAN.test(n)) s += 60;
  if (ROBOTIC.test(n)) s -= 90;
  if (NOVELTY.test(n)) s -= 200;
  // Ontario first: a Canadian voice fits best, then US/UK/France, over any other region.
  const lang = v.lang.toLowerCase();
  if (/-ca\b/.test(lang)) s += 10;
  else if (/-(us|gb|fr)\b/.test(lang)) s += 5;
  return s;
}

/** The most human-sounding on-device voice for this language, or null if the device has none. Pure + testable. */
export function pickBestVoice(voices: VoiceLike[], lang: string): VoiceLike | null {
  const usable = voices.filter((v) => v.localService && v.lang.toLowerCase().startsWith(lang));
  if (!usable.length) return null;
  // stable: keep the device's own order when two voices tie
  return usable.map((v, i) => ({ v, s: score(v), i })).sort((a, b) => b.s - a.s || a.i - b.i)[0].v;
}

function localVoice(lang: string): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  const best = pickBestVoice(voices, lang);
  return best ? (best as SpeechSynthesisVoice) : null;
}

/** Listen for read-aloud becoming possible (some browsers load their voices a moment after the page) */
export function watchReadAloud(onChange: () => void): () => void {
  const synth = typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;
  synth?.addEventListener("voiceschanged", onChange);
  return () => synth?.removeEventListener("voiceschanged", onChange);
}

/** Can this student hear this language read aloud on their device? */
export function canReadAloud(lang: string): boolean {
  return !!localVoice(lang);
}

/** Read `text` aloud in this age style's language. Stops anything already playing. */
export function readAloud(text: string, style: Pick<AgeStyle, "language">) {
  stopReading();
  const voice = localVoice(toLang(style.language));
  if (!voice) return;
  const u = new SpeechSynthesisUtterance(text);
  u.voice = voice;
  u.lang = voice.lang;
  // Warm and natural, not a chirpy synth: a touch slower than default for clarity, pitch just above neutral.
  u.rate = 0.97;
  u.pitch = 1.04;
  u.volume = 1;
  window.speechSynthesis.speak(u);
}

export function stopReading() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}
