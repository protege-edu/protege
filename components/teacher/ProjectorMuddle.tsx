"use client";

import { AnimatePresence, motion } from "motion/react";
import { useMemo } from "react";
import { useCalmMotion } from "@/lib/useCalmMotion";

const EYE = "#e8e4c9";
const FLASH = "#8ec5dc";
const FIREFLY = "#d6ee8a";

/**
 * The Muddle's body, in three layers of fog like the one in the world (dark at the back, pale at the front, so
 * it reads on a dim projector). Fixed numbers, so it looks the same on every refresh.
 */
const BACK = [
  { x: 50, y: 50, r: 34 },
  { x: 24, y: 60, r: 22 },
  { x: 77, y: 58, r: 23 },
  { x: 50, y: 22, r: 18 },
  { x: 33, y: 33, r: 18 },
  { x: 68, y: 32, r: 19 },
];
const MID = [
  { x: 50, y: 54, r: 27 },
  { x: 30, y: 62, r: 17 },
  { x: 70, y: 61, r: 18 },
  { x: 40, y: 34, r: 15 },
  { x: 61, y: 33, r: 16 },
  { x: 50, y: 74, r: 18 },
];
const FRONT = [
  { x: 37, y: 66, r: 11 },
  { x: 63, y: 67, r: 12 },
  { x: 50, y: 80, r: 10 },
  { x: 45, y: 28, r: 8 },
  { x: 58, y: 27, r: 7 },
];
/** wisps trailing off the bottom */
const WISPS = ["M22 72 C14 82 18 92 8 98", "M40 82 C38 92 44 96 38 104", "M62 82 C66 92 60 98 66 105", "M79 71 C88 80 84 90 93 97"];

/**
 * The whole-class Muddle, drawn big for the projector: fog that thins as the class's explanations hit it, with
 * slit eyes in dark sockets that flinch at every hit (`hitKey` changes). When the class beats it, it bursts and
 * the morning comes up with fireflies. No numbers and no health bar: how much fog is left IS the meter.
 * Calm motion: it just gets thinner, and the fireflies sit still.
 */
export function ProjectorMuddle({ left, beaten, hitKey }: { left: number; beaten: boolean; hitKey: number }) {
  const calm = useCalmMotion();
  // the fog shrinks and fades as it's hit, but never vanishes before the last hit
  const size = 0.5 + 0.5 * left;
  // the morning's fireflies: scattered, drifting up (a ring would look like a loading spinner)
  const flies = useMemo(
    () => Array.from({ length: 34 }, (_, i) => ({ x: 10 + 80 * rand(i), y: 18 + 70 * rand(i + 99), r: 0.9 + (i % 3) * 0.55, rise: 8 + (i % 5) * 4, delay: rand(i + 7) * 1.4 })),
    [],
  );
  return (
    <svg viewBox="0 0 100 110" className="w-full overflow-visible" aria-hidden="true">
      <defs>
        <filter id="muddle-soft" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
        <filter id="muddle-softer" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3.6" />
        </filter>
        <radialGradient id="muddle-dawn" cx="50%" cy="60%" r="50%">
          <stop offset="0%" stopColor={FIREFLY} stopOpacity="0.32" />
          <stop offset="55%" stopColor={FIREFLY} stopOpacity="0.1" />
          <stop offset="100%" stopColor={FIREFLY} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="muddle-eye-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={EYE} stopOpacity="0.55" />
          <stop offset="100%" stopColor={EYE} stopOpacity="0" />
        </radialGradient>
      </defs>
      <AnimatePresence>
        {!beaten && (
          <motion.g
            key="body"
            style={{ transformOrigin: "50px 55px" }}
            initial={false}
            animate={{ scale: size, opacity: 0.6 + 0.4 * left }}
            exit={calm ? { opacity: 0 } : { scale: 1.6, opacity: 0, transition: { duration: 1, ease: "easeOut" } }}
            transition={{ type: "spring", stiffness: 110, damping: 14 }}
          >
            {/* a flinch at every hit */}
            <motion.g key={hitKey} initial={calm || !hitKey ? false : { x: 6, rotate: 5, scale: 0.94 }} animate={{ x: 0, rotate: 0, scale: 1 }} transition={{ type: "spring", stiffness: 420, damping: 7 }} style={{ transformOrigin: "50px 55px" }}>
              <g fill="none" stroke="#56645e" strokeWidth="4" strokeLinecap="round" filter="url(#muddle-softer)" opacity="0.8">
                {WISPS.map((d, i) => (
                  <motion.path key={i} d={d} animate={calm ? undefined : { x: [0, i % 2 ? 2 : -2, 0] }} transition={{ duration: 3.5 + i * 0.6, repeat: Infinity, ease: "easeInOut" }} />
                ))}
              </g>
              <Layer puffs={BACK} fill="#2f3a36" filter="muddle-softer" calm={calm} drift={2.2} />
              <Layer puffs={MID} fill="#4d5b55" filter="muddle-soft" calm={calm} drift={1.6} />
              <Layer puffs={FRONT} fill="#7c8a83" filter="muddle-soft" calm={calm} drift={1.2} opacity={0.7} />
              {/* slit eyes in dark sockets, glowing a little */}
              <circle cx="40" cy="47" r="10" fill="url(#muddle-eye-glow)" />
              <circle cx="60" cy="47" r="10" fill="url(#muddle-eye-glow)" />
              <ellipse cx="40" cy="47" rx="8" ry="5" fill="#141a18" />
              <ellipse cx="60" cy="47" rx="8" ry="5" fill="#141a18" />
              <motion.g animate={calm ? undefined : { scaleY: [1, 1, 0.1, 1] }} transition={{ duration: 5, repeat: Infinity, times: [0, 0.9, 0.95, 1] }} style={{ transformOrigin: "50px 47px" }}>
                {/* (narrowed: it's cross with whoever's hitting it) */}
                <path d="M34 47.8 Q40 43 46 46.6 Q40 49.4 34 47.8z" fill={EYE} />
                <path d="M54 46.6 Q60 43 66 47.8 Q60 49.4 54 46.6z" fill={EYE} />
              </motion.g>
            </motion.g>
          </motion.g>
        )}
      </AnimatePresence>
      {/* a flash of moonlight where the hit landed */}
      <AnimatePresence>
        {!calm && hitKey > 0 && !beaten && (
          <motion.circle key={hitKey} cx="50" cy="52" fill={FLASH} initial={{ r: 4, opacity: 0.75 }} animate={{ r: 38, opacity: 0 }} transition={{ duration: 0.8, ease: "easeOut" }} />
        )}
      </AnimatePresence>
      {/* beaten: the morning comes up, and the fog's last wisps fly off as fireflies */}
      {beaten && (
        <g>
          <motion.ellipse cx="50" cy="60" rx="50" ry="48" fill="url(#muddle-dawn)" initial={calm ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.4 }} />
          {flies.map((f, i) => (
            <motion.circle
              key={i}
              cx={f.x}
              r={f.r}
              fill={FIREFLY}
              style={{ filter: `drop-shadow(0 0 1.6px ${FIREFLY})` }}
              initial={calm ? { cy: f.y } : { cy: 58, opacity: 0 }}
              animate={calm ? undefined : { cy: [58, f.y, f.y - f.rise], opacity: [0, 1, 0.55] }}
              transition={{ duration: 2.6 + (i % 4) * 0.4, delay: f.delay, ease: "easeOut" }}
            />
          ))}
        </g>
      )}
    </svg>
  );
}

/**
 * The same "random" number for the same i, every time and everywhere (integer maths only: Math.sin isn't exactly
 * the same on the server and in the browser, and the page would draw them twice in different places)
 */
function rand(i: number) {
  let h = Math.imul(i + 0x9e37, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function Layer({ puffs, fill, filter, calm, drift, opacity = 1 }: { puffs: { x: number; y: number; r: number }[]; fill: string; filter: string; calm: boolean; drift: number; opacity?: number }) {
  return (
    <g fill={fill} filter={`url(#${filter})`} opacity={opacity}>
      {puffs.map((p, i) => (
        <motion.circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={p.r}
          animate={calm ? undefined : { cx: [p.x, p.x + (i % 2 ? drift : -drift), p.x], cy: [p.y, p.y - drift * 0.7, p.y] }}
          transition={{ duration: 4 + (i % 4) * 0.9, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </g>
  );
}
