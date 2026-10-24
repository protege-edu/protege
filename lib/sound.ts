/**
 * Tiny sounds made with the Web Audio API: no audio files, nothing to license.
 * Off by default. Classrooms are loud enough.
 */
let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, length: number, volume: number, type: OscillatorType = "sine") {
  const a = audio();
  if (!a) return;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t = a.currentTime + start;
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(volume, t + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
  osc.connect(gain).connect(a.destination);
  osc.start(t);
  osc.stop(t + length + 0.05);
}

/** Gloam says something */
export function pip() {
  tone(660, 0, 0.12, 0.08, "triangle");
  tone(880, 0.07, 0.1, 0.05, "triangle");
}

/** Something clicked */
export function chime(big = false) {
  const notes = big ? [523, 659, 784, 1047, 1319] : [523, 659, 784, 1047];
  notes.forEach((n, i) => tone(n, i * 0.09, 0.9, 0.07));
}
