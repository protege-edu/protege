import type { AgeStyle } from "@/lib/age-styles";

/**
 * Read-aloud: the browser's built-in voices, ONLY ones that run on the device (`localService`), so Gloam's
 * words are never sent to an online speech service. None on this device? Then there's no read-aloud
 * button, rather than a leak.
 */
type Lang = "en" | "fr";
const toLang = (lang: string | undefined): Lang => (lang === "fr" ? "fr" : "en");

function localVoice(lang: string): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices().filter((v) => v.localService && v.lang.toLowerCase().startsWith(lang));
  // the most natural-sounding one this device has, then a Canadian one, then any
  return voices.find((v) => /natural|neural|enhanced|premium/i.test(v.name)) ?? voices.find((v) => /-ca$/i.test(v.lang)) ?? voices[0] ?? null;
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
  u.rate = 0.9;
  u.pitch = 1.15;
  window.speechSynthesis.speak(u);
}

export function stopReading() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}
