/** Pure helpers for voice typing (no server or browser APIs, so the tests can check them) */

/** The longest clip a student can send, in seconds (matches voiceConfig.maxSeconds) */
const MAX_SECONDS = 60;

/** What whisper writes for silence or noise, not words a student said */
const NOT_WORDS = /\[\s*(?:blank_audio|silence|music|noise|inaudible|no speech)[^\]]*\]|\(\s*(?:music|silence|noise|inaudible|applause|laughs?)[^)]*\)|\*[^*]{1,30}\*/gi;

/** Clean whisper's text: drop sound tags, squash spaces. Empty means nothing was said. */
export function cleanTranscript(raw: string): string {
  return raw.replace(NOT_WORDS, " ").replace(/\s+/g, " ").trim();
}

/** A real 16 kHz, mono, 16-bit WAV, short enough? (checked before anything reaches whisper.cpp) */
export function checkWav(buf: ArrayBuffer): "ok" | "bad" | "long" {
  if (buf.byteLength < 44) return "bad";
  const v = new DataView(buf);
  const tag = (o: number) => String.fromCharCode(v.getUint8(o), v.getUint8(o + 1), v.getUint8(o + 2), v.getUint8(o + 3));
  if (tag(0) !== "RIFF" || tag(8) !== "WAVE" || tag(12) !== "fmt ") return "bad";
  const format = v.getUint16(20, true);
  const channels = v.getUint16(22, true);
  const rate = v.getUint32(24, true);
  const bits = v.getUint16(34, true);
  if (format !== 1 || channels !== 1 || rate !== 16000 || bits !== 16) return "bad";
  const seconds = (buf.byteLength - 44) / (rate * 2);
  return seconds > MAX_SECONDS + 1 ? "long" : "ok";
}
