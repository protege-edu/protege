import type { Emotion } from "@/lib/ai/schemas";

/** Gloam's whole face and body, as numbers. Changing emotion = springing between two of these. */
export interface Pose {
  /** 0 = eye open, 1 = shut */
  lidL: number;
  lidR: number;
  /** degrees; brows rotate around their own middle */
  browL: number;
  browR: number;
  /** px, negative = raised */
  browY: number;
  pupil: number;
  /** where Gloam looks by default in this mood, px */
  gazeX: number;
  gazeY: number;
  mouth: { w: number; top: number; bot: number; l: number; r: number };
  /** whole-body lean, degrees */
  tilt: number;
  /** arm angles, degrees. 0 = hanging, 150 = straight up */
  armL: number;
  armR: number;
  cheek: number;
  /** how bouncy Gloam's handwriting is in this mood (Shantell Sans BNCE axis, -100..100) */
  bounce: number;
}

export type GloamMood = Emotion | "thinking" | "asleep" | "listening";

const base: Pose = {
  lidL: 0.08,
  lidR: 0.08,
  browL: 0,
  browR: 0,
  browY: 0,
  pupil: 1,
  gazeX: 0,
  gazeY: 0,
  mouth: { w: 12, top: 0, bot: 7, l: -1, r: -1 },
  tilt: 0,
  armL: 10,
  armR: 10,
  cheek: 0.35,
  bounce: 20,
};

const p = (over: Partial<Pose>): Pose => ({ ...base, ...over, mouth: { ...base.mouth, ...over.mouth } });

export const POSES: Record<GloamMood, Pose> = {
  confused: p({
    browL: -14,
    browR: -8,
    browY: -4,
    lidR: 0.18,
    pupil: 0.85,
    gazeX: -2,
    gazeY: -2,
    mouth: { w: 13, top: 3, bot: 7, l: 4, r: -4 },
    tilt: -7,
    armL: 25,
    armR: 12,
    bounce: -10,
  }),
  curious: p({
    browL: -6,
    browR: 6,
    browY: -7,
    lidL: 0,
    lidR: 0,
    pupil: 1.12,
    mouth: { w: 7, top: -6, bot: 8, l: 0, r: 0 },
    tilt: 5,
    armL: 18,
    armR: 18,
    bounce: 30,
  }),
  skeptical: p({
    browL: 4,
    browR: -10,
    browY: -2,
    lidL: 0.12,
    lidR: 0.48,
    gazeX: 3,
    mouth: { w: 15, top: 1, bot: 4, l: 2, r: -4 },
    tilt: -3,
    armL: 40,
    armR: 8,
    bounce: 0,
  }),
  excited: p({
    browL: -4,
    browR: 4,
    browY: -10,
    lidL: 0,
    lidR: 0,
    pupil: 1.2,
    mouth: { w: 23, top: 1, bot: 22, l: -4, r: -4 },
    armL: 70,
    armR: 70,
    cheek: 0.6,
    bounce: 70,
  }),
  sheepish: p({
    browL: -12,
    browR: 12,
    browY: -3,
    lidL: 0.22,
    lidR: 0.22,
    gazeX: -4,
    gazeY: 4,
    mouth: { w: 13, top: 3, bot: 7, l: 1, r: 1 },
    tilt: -4,
    armL: 8,
    armR: 135,
    cheek: 0.85,
    bounce: 10,
  }),
  proud: p({
    browL: 6,
    browR: -6,
    browY: -3,
    lidL: 0.3,
    lidR: 0.3,
    gazeY: -2,
    mouth: { w: 20, top: 0, bot: 13, l: -5, r: -5 },
    armL: 48,
    armR: 48,
    cheek: 0.55,
    bounce: 40,
  }),
  eureka: p({
    browL: -8,
    browR: 8,
    browY: -14,
    lidL: 0,
    lidR: 0,
    pupil: 1.35,
    mouth: { w: 21, top: -9, bot: 27, l: -2, r: -2 },
    armL: 150,
    armR: 150,
    cheek: 0.8,
    bounce: 100,
  }),
  redirect: p({
    browL: -10,
    browR: 2,
    browY: -4,
    lidL: 0.15,
    lidR: 0.15,
    gazeX: 5,
    mouth: { w: 16, top: 1, bot: 9, l: 3, r: -5 },
    tilt: 4,
    armL: 10,
    armR: 95,
    bounce: 30,
  }),
  thinking: p({
    browL: -8,
    browR: 4,
    browY: -5,
    lidL: 0.15,
    lidR: 0.15,
    pupil: 0.9,
    gazeX: -5,
    gazeY: -6,
    mouth: { w: 8, top: 0, bot: 3, l: 2, r: -2 },
    tilt: -3,
    armL: 12,
    armR: 105,
    bounce: 0,
  }),
  listening: p({
    browL: -4,
    browR: 4,
    browY: -5,
    lidL: 0,
    lidR: 0,
    pupil: 1.1,
    gazeX: 5,
    gazeY: 4,
    mouth: { w: 8, top: -3, bot: 6, l: 0, r: 0 },
    tilt: 6,
    armL: 15,
    armR: 15,
    bounce: 20,
  }),
  asleep: p({
    lidL: 1,
    lidR: 1,
    browY: 2,
    mouth: { w: 6, top: 0, bot: 4, l: 0, r: 0 },
    tilt: -5,
    armL: 4,
    armR: 4,
    cheek: 0.2,
    bounce: -40,
  }),
};

/** Mouth as one closed shape with a fixed number of points, so it can morph smoothly */
export function mouthPath(m: Pose["mouth"], cx = 130, cy = 246): string {
  const f = (n: number) => n.toFixed(2);
  return `M ${f(cx - m.w)} ${f(cy + m.l)} Q ${f(cx)} ${f(cy + m.top)} ${f(cx + m.w)} ${f(cy + m.r)} Q ${f(cx)} ${f(cy + m.bot)} ${f(cx - m.w)} ${f(cy + m.l)} Z`;
}

/** Lantern color: from a cold dark ember (nothing understood) to full Lantern gold */
export function lanternFill(brightness: number): string {
  const from = [0x3a, 0x2c, 0x22];
  const to = [0xf4, 0xb7, 0x40];
  const t = Math.max(0, Math.min(1, 0.12 + brightness * 0.88));
  const c = from.map((v, i) => Math.round(v + (to[i] - v) * t));
  return `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
