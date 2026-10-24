"use client";

import { motion } from "motion/react";
import { useCalmMotion } from "@/lib/useCalmMotion";

/**
 * The valley at night, painted in layers (high school style).
 * The lantern is the only warm light in the world. As Gloam understands more,
 * its light spreads: hill edges catch it, the fog warms, fireflies come out,
 * and at the end the whole horizon glows. The scene IS the progress meter.
 *
 * `cx` is where Gloam stands (0..1 across the screen) so the light comes from the right place.
 */
export function NightValley({ brightness, cx = 0.5 }: { brightness: number; cx?: number }) {
  const calm = useCalmMotion();
  const b = brightness;
  const fade = { duration: calm ? 0 : 1.8, ease: "easeInOut" as const };
  const lx = cx * 1600;

  return (
    <svg viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="nv-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#050b09" />
          <stop offset="0.55" stopColor="#0b1814" />
          <stop offset="1" stopColor="#13241e" />
        </linearGradient>
        <linearGradient id="nv-fog" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5d7d70" stopOpacity="0" />
          <stop offset="0.5" stopColor="#5d7d70" stopOpacity="0.16" />
          <stop offset="1" stopColor="#5d7d70" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="nv-light" cx={lx} cy="740" r="900" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffcf7a" stopOpacity="0.55" />
          <stop offset="0.25" stopColor="#f4b740" stopOpacity="0.22" />
          <stop offset="0.6" stopColor="#f4b740" stopOpacity="0.06" />
          <stop offset="1" stopColor="#f4b740" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="nv-crest" x1="0" y1="0" x2="1600" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#f4b740" stopOpacity="0.05" />
          <stop offset={Math.max(0.05, cx - 0.2)} stopColor="#f4b740" stopOpacity="0.5" />
          <stop offset={cx} stopColor="#ffd48a" stopOpacity="1" />
          <stop offset={Math.min(0.95, cx + 0.2)} stopColor="#f4b740" stopOpacity="0.5" />
          <stop offset="1" stopColor="#f4b740" stopOpacity="0.05" />
        </linearGradient>
        <linearGradient id="nv-dawn" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f4b740" stopOpacity="0" />
          <stop offset="1" stopColor="#e08a3a" stopOpacity="0.35" />
        </linearGradient>
      </defs>

      <rect width="1600" height="1000" fill="url(#nv-sky)" />

      {/* stars: a few twinkle, most don't (one great effect, not twenty) */}
      <g fill="#dfe8df">
        {STARS.map(([x, y, r, tw], i) => (
          <circle key={i} cx={x} cy={y} r={r} opacity={0.35} style={tw && !calm ? { animation: `twinkle ${3 + (i % 5)}s ease-in-out ${i % 7}s infinite` } : undefined} />
        ))}
      </g>

      {/* the horizon warms at the very end */}
      <motion.rect x="0" y="380" width="1600" height="260" fill="url(#nv-dawn)" animate={{ opacity: Math.max(0, b - 0.7) / 0.3 }} transition={fade} />

      {/* far mountains */}
      <path d={FAR} fill="#14261f" />
      <rect className={calm ? "" : "fog-drift"} x="-100" y="430" width="1800" height="200" fill="url(#nv-fog)" />

      {/* mid hills with pines */}
      <path d={MID} fill="#0f1d18" />
      <g fill="#0b1712">{PINES.map(([x, y, h], i) => <path key={i} d={pine(x, y, h)} />)}</g>
      <motion.path d={MID_CREST} fill="none" stroke="url(#nv-crest)" strokeWidth="3" strokeLinecap="round" animate={{ opacity: Math.min(1, b * 1.4) }} transition={fade} />

      <rect className={calm ? "" : "fog-drift"} x="-100" y="600" width="1800" height="220" fill="url(#nv-fog)" style={{ animationDuration: "52s" }} />

      {/* the ground Gloam stands on */}
      <path d={NEAR} fill="#0c1813" />
      <motion.path d={NEAR_CREST} fill="none" stroke="url(#nv-crest)" strokeWidth="2.5" strokeLinecap="round" animate={{ opacity: Math.min(1, 0.15 + b * 1.2) }} transition={fade} />

      {/* the lantern's light on the world. It grows with understanding. */}
      <motion.rect width="1600" height="1000" fill="url(#nv-light)" style={{ mixBlendMode: "screen" }} animate={{ opacity: 0.12 + b * 0.88 }} transition={fade} />

      {/* foreground grass, darkest layer, sways a little */}
      <g fill="#050a08">
        {GRASS.map(([x, h, lean], i) => (
          <path
            key={i}
            d={`M${x - 5} 1000 Q ${x + lean * 0.5} ${1000 - h * 0.6} ${x + lean} ${1000 - h} Q ${x + lean * 0.4} ${1000 - h * 0.5} ${x + 5} 1000 Z`}
            style={calm ? undefined : { transformBox: "fill-box", transformOrigin: "bottom", animation: `drift ${5 + (i % 4)}s ease-in-out ${i % 3}s infinite alternate` }}
          />
        ))}
      </g>

      {/* fireflies: only once Gloam understands a fair bit */}
      {!calm &&
        FIREFLIES.map(([x, y, d], i) => (
          <motion.circle
            key={i}
            cx={x}
            cy={y}
            r="3"
            fill="#ffd48a"
            initial={{ opacity: 0 }}
            animate={b >= 0.2 + (i % 6) * 0.12 ? { opacity: [0, 0.95, 0.15, 0.85, 0], x: [0, 26, -10, 18, 0], y: [0, -20, -34, -12, 0] } : { opacity: 0 }}
            transition={{ duration: 7 + d, repeat: Infinity, delay: d }}
          />
        ))}
    </svg>
  );
}

const FAR =
  "M0 520 L 90 470 L 160 495 L 260 410 L 340 455 L 420 400 L 520 470 L 610 430 L 700 480 L 800 420 L 900 460 L 1010 390 L 1100 450 L 1200 420 L 1290 470 L 1390 410 L 1480 455 L 1600 430 L 1600 1000 L 0 1000 Z";
const MID =
  "M0 640 C 120 610 220 590 340 606 C 460 622 520 650 640 640 C 760 630 820 590 960 586 C 1100 582 1180 620 1300 624 C 1420 628 1520 600 1600 596 L 1600 1000 L 0 1000 Z";
const MID_CREST =
  "M0 640 C 120 610 220 590 340 606 C 460 622 520 650 640 640 C 760 630 820 590 960 586 C 1100 582 1180 620 1300 624 C 1420 628 1520 600 1600 596";
const NEAR = "M0 790 C 200 770 380 762 560 768 C 760 774 900 760 1080 756 C 1260 752 1440 768 1600 776 L 1600 1000 L 0 1000 Z";
const NEAR_CREST = "M0 790 C 200 770 380 762 560 768 C 760 774 900 760 1080 756 C 1260 752 1440 768 1600 776";

const pine = (x: number, y: number, h: number) => `M${x} ${y - h} L ${x + h * 0.32} ${y} L ${x - h * 0.32} ${y} Z M${x} ${y - h * 0.62} L ${x + h * 0.4} ${y + h * 0.18} L ${x - h * 0.4} ${y + h * 0.18} Z`;

// Hand-placed so nothing looks randomly generated
const PINES: [number, number, number][] = [
  [90, 630, 70], [130, 628, 52], [300, 612, 60], [1180, 612, 66], [1222, 618, 48], [1380, 616, 74], [1430, 612, 56], [1520, 604, 62], [700, 640, 44],
];
const STARS: [number, number, number, boolean][] = [
  [60, 60, 1.6, true], [180, 140, 1, false], [260, 50, 1.3, false], [380, 110, 1.8, true], [470, 30, 1, false], [560, 170, 1.2, false],
  [640, 80, 1.4, true], [760, 40, 1, false], [850, 150, 1.7, false], [930, 70, 1.1, true], [1040, 120, 1.3, false], [1120, 40, 1.8, true],
  [1210, 180, 1, false], [1300, 90, 1.5, false], [1390, 30, 1.1, true], [1470, 140, 1.4, false], [1560, 70, 1, false], [110, 260, 1, false],
  [330, 300, 1.2, false], [720, 250, 1, true], [990, 290, 1.1, false], [1250, 300, 1, false], [1500, 260, 1.3, false], [480, 230, 0.9, false],
];
const GRASS: [number, number, number][] = Array.from({ length: 46 }, (_, i) => {
  const x = (i * 1600) / 46 + ((i * 37) % 23);
  return [Math.round(x), 40 + ((i * 53) % 70), ((i * 29) % 30) - 15];
});
const FIREFLIES: [number, number, number][] = [
  [420, 700, 0], [1180, 690, 1.3], [560, 610, 2.2], [1020, 640, 0.7], [300, 760, 1.8], [1330, 720, 2.7], [840, 600, 0.4], [1480, 660, 3.1], [200, 680, 1.1], [760, 720, 2.4],
];
