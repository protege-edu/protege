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

/** One soft, felt-footed step (a short low thump, slightly different each time) */
export function step() {
  const pitch = 95 + Math.random() * 25;
  tone(pitch, 0, 0.09, 0.05, "sine");
  tone(pitch * 2.1, 0, 0.04, 0.012, "triangle");
}

// ---------- the game layer: challenges, the rival, the boss fight (all made here, nothing to license) ----------

/** A short burst of filtered noise: scratches, whooshes, rumbles, flutters */
function noise(start: number, length: number, volume: number, filter: BiquadFilterType, freq: number, q = 1, sweepTo?: number) {
  const a = audio();
  if (!a) return;
  const buf = a.createBuffer(1, Math.max(1, Math.floor(a.sampleRate * length)), a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = filter;
  f.Q.value = q;
  const t = a.currentTime + start;
  f.frequency.setValueAtTime(freq, t);
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + length);
  const gain = a.createGain();
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(volume, t + Math.min(0.02, length / 4));
  gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
  src.connect(f).connect(gain).connect(a.destination);
  src.start(t);
  src.stop(t + length + 0.05);
}

/** A tone that slides from one pitch to another */
function slide(from: number, to: number, start: number, length: number, volume: number, type: OscillatorType = "sine") {
  const a = audio();
  if (!a) return;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  const t = a.currentTime + start;
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(to, t + length);
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(volume, t + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
  osc.connect(gain).connect(a.destination);
  osc.start(t);
  osc.stop(t + length + 0.05);
}

/** A clean hit on the Muddle: a crack of moonlight. Each hit in a row rings a step higher. */
export function bossHit(combo = 1) {
  const up = Math.pow(2, Math.min(7, Math.max(0, combo - 1)) * 2 / 12);
  noise(0, 0.18, 0.12, "highpass", 2400);
  slide(660 * up, 1320 * up, 0, 0.22, 0.07, "triangle");
  tone(1320 * up, 0.09, 0.5, 0.04);
  tone(1980 * up, 0.12, 0.6, 0.025);
}

/** The Muddle likes that: a low swell */
export function bossMiss() {
  noise(0, 0.9, 0.07, "lowpass", 180, 0.7, 90);
  slide(70, 52, 0, 0.9, 0.08);
}

/** A glancing hit: a soft thud */
export function glance() {
  noise(0, 0.12, 0.06, "bandpass", 500, 1.2);
  tone(196, 0, 0.18, 0.05, "triangle");
}

/** The Muddle arrives: the valley darkens under a low drone that rises */
export function bossArrive() {
  noise(0, 2.6, 0.06, "lowpass", 90, 0.8, 260);
  slide(41, 55, 0, 2.6, 0.09);
  slide(62, 78, 0.4, 2.2, 0.04, "sawtooth");
}

/** The Muddle is beaten: it bursts into fireflies */
export function bossDefeated() {
  noise(0, 1.4, 0.07, "highpass", 1500, 0.5, 6000);
  [523, 659, 784, 1047, 1319, 1568].forEach((n, i) => tone(n, 0.05 + i * 0.07, 1.1, 0.05));
}

/** The rival arrives: a short, smug caw (a honk or a hoot is the same idea) */
export function rivalArrives() {
  slide(720, 430, 0, 0.16, 0.05, "square");
  slide(760, 410, 0.2, 0.2, 0.05, "square");
  noise(0, 0.36, 0.03, "bandpass", 1400, 2);
}

/** The rival flaps off in a huff */
export function rivalLeaves() {
  for (let i = 0; i < 6; i++) noise(i * 0.07, 0.06, 0.05, "bandpass", 900 + i * 120, 1.5);
  slide(520, 300, 0.05, 0.3, 0.03, "square");
}

/** A pen crossing out a line in Gloam's notebook */
export function scribble() {
  for (let i = 0; i < 4; i++) noise(i * 0.09, 0.08, 0.05, "bandpass", 3200 + (i % 2) * 900, 3);
}

/** Tapping a line or a card that wasn't it */
export function tap() {
  noise(0, 0.05, 0.05, "bandpass", 1800, 2);
}

/** Cards sliding into place */
export function cards() {
  for (let i = 0; i < 4; i++) noise(i * 0.06, 0.07, 0.04, "highpass", 2600 - i * 200, 0.8);
  tone(784, 0.26, 0.3, 0.04, "triangle");
}

/** "Stop!": Gloam's presentation screeches to a halt */
export function stopped() {
  slide(880, 220, 0, 0.25, 0.05, "sawtooth");
}

/** Fireflies landing in the jar: little plinks, one per few */
export function caughtFireflies(n: number) {
  const k = Math.min(6, Math.max(2, Math.ceil(n / 3)));
  for (let i = 0; i < k; i++) tone(1568 + ((i * 3) % 5) * 110, 0.9 + i * 0.07, 0.25, 0.025);
}
