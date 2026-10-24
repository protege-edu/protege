"use client";

import { useCalmMotion } from "@/lib/useCalmMotion";
import { motion } from "motion/react";

/**
 * Gloam's valley, cut from flat layers of paper. It starts in the dark.
 * As Gloam understands more, color comes back to the hills, the crests catch
 * lantern light, and fireflies show up. The scene IS the progress meter.
 */
export function Diorama({ brightness }: { brightness: number }) {
  const reduced = useCalmMotion();
  const fade = { duration: reduced ? 0 : 1.6, ease: "easeInOut" as const };
  const b = brightness;

  return (
    <svg viewBox="0 0 600 520" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 h-full w-full" aria-hidden="true">
      <rect width="600" height="520" fill="var(--color-soot)" />
      {/* the night sky warms from soot to moss */}
      <motion.rect width="600" height="520" fill="var(--color-moss)" animate={{ opacity: 0.15 + b * 0.55 }} transition={fade} />

      {STARS.map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="var(--color-mist)" opacity={0.18 + (i % 3) * 0.1} />
      ))}

      {/* back hills */}
      <path d={BACK} fill="var(--color-moss-deep)" />
      <motion.path d={BACK} fill="var(--color-lichen)" animate={{ opacity: b * 0.45 }} transition={fade} />
      <motion.path d={BACK_CREST} fill="none" stroke="var(--color-lantern)" strokeWidth="3" strokeLinecap="round" animate={{ opacity: Math.max(0, b - 0.5) * 1.2 }} transition={fade} />

      {/* middle hills */}
      <path d={MID} fill="var(--color-moss)" />
      <motion.path d={MID} fill="var(--color-lichen)" animate={{ opacity: b * 0.7 }} transition={fade} />
      <motion.path d={MID_CREST} fill="none" stroke="var(--color-lantern)" strokeWidth="3" strokeLinecap="round" animate={{ opacity: Math.max(0, b - 0.25) * 1.1 }} transition={fade} />

      {/* the ground Gloam stands on */}
      <path d={FRONT} fill="var(--color-moss-deep)" />
      <motion.path d={FRONT} fill="var(--color-moss)" animate={{ opacity: b * 0.9 }} transition={fade} />

      {/* fireflies: only once Gloam understands a fair bit */}
      {!reduced &&
        FIREFLIES.map(([x, y, d], i) => (
          <motion.circle
            key={i}
            cx={x}
            cy={y}
            r="2.6"
            fill="var(--color-lantern)"
            initial={{ opacity: 0 }}
            animate={b >= (i + 1) * 0.14 ? { opacity: [0, 0.9, 0.2, 0.9, 0], x: [0, 14, -6, 10, 0], y: [0, -12, -20, -8, 0] } : { opacity: 0 }}
            transition={{ duration: 6 + d, repeat: Infinity, delay: d }}
          />
        ))}
    </svg>
  );
}

const BACK =
  "M0 292 C 40 280 70 262 112 258 C 150 254 170 272 204 270 C 246 268 268 236 318 232 C 360 229 380 250 420 252 C 470 255 500 236 540 238 C 566 240 586 248 600 252 L600 520 L0 520 Z";
const BACK_CREST =
  "M0 292 C 40 280 70 262 112 258 C 150 254 170 272 204 270 C 246 268 268 236 318 232 C 360 229 380 250 420 252 C 470 255 500 236 540 238 C 566 240 586 248 600 252";
const MID =
  "M0 352 C 54 334 96 326 150 334 C 196 341 222 356 262 352 C 318 346 346 314 404 312 C 452 310 484 330 524 336 C 560 341 584 334 600 330 L600 520 L0 520 Z";
const MID_CREST =
  "M0 352 C 54 334 96 326 150 334 C 196 341 222 356 262 352 C 318 346 346 314 404 312 C 452 310 484 330 524 336 C 560 341 584 334 600 330";
const FRONT = "M0 430 C 90 416 170 412 250 416 C 330 420 380 410 450 408 C 520 406 566 414 600 420 L600 520 L0 520 Z";

// Hand-placed so the sky never looks random-generated
const STARS: [number, number, number][] = [
  [38, 40, 1.4], [92, 96, 1], [140, 28, 1.8], [196, 74, 1], [252, 22, 1.2], [300, 118, 1], [344, 48, 1.6],
  [398, 92, 1], [446, 30, 1.2], [492, 70, 1.8], [546, 36, 1], [578, 110, 1.2], [70, 160, 1], [520, 168, 1],
  [24, 214, 1.2], [580, 196, 1],
];

const FIREFLIES: [number, number, number][] = [
  [90, 380, 0], [520, 360, 1.2], [180, 300, 2.1], [430, 280, 0.6], [300, 390, 1.7], [60, 290, 2.6], [560, 300, 0.3],
];
