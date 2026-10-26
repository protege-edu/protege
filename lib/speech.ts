/**
 * Read-aloud for kids who can't read well yet: the browser's built-in voices (free, no service).
 * Only voices that run ON the device (`localService`), so Gloam's words are never sent to an online
 * speech service. No local voice for the language? Then there's no read-aloud button, rather than a leak.
 */
function localVoice(lang: string): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices().filter((v) => v.localService && v.lang.toLowerCase().startsWith(lang));
  // prefer a Canadian voice, then any
  return voices.find((v) => /-ca$/i.test(v.lang)) ?? voices[0] ?? null;
}

/** Can this device read this language aloud (on the device)? Voices load late in some browsers: call again later. */
export function canReadAloud(lang: string): boolean {
  return !!localVoice(lang);
}

/** Read `text` aloud, a little slower than normal (it's for young kids). Stops anything already playing. */
export function readAloud(text: string, lang: string) {
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

export function stopReading() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}
