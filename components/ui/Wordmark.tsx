"use client";

import { motion } from "motion/react";
import { useCalmMotion } from "@/lib/useCalmMotion";

/**
 * The "protégé" wordmark. The accents on both é's are little flames.
 * They stay unlit (cold ember outlines) until the student has taught Gloam something,
 * then they burn lantern gold: even the logo follows the rule that gold means understanding.
 */
export function Wordmark({ lit = 0, className = "" }: { lit?: number; className?: string }) {
  return (
    <span className={`voice relative inline-flex items-baseline leading-none ${className}`} style={{ ["--casual" as string]: 1, ["--voice-weight" as string]: 800 }} role="img" aria-label="Protégé">
      <span aria-hidden="true">prot</span>
      <FlameE lit={lit} delay={0} />
      <span aria-hidden="true">g</span>
      <FlameE lit={lit} delay={0.7} />
    </span>
  );
}

function FlameE({ lit, delay }: { lit: number; delay: number }) {
  const calm = useCalmMotion();
  const on = lit > 0;
  return (
    <span aria-hidden="true" className="relative inline-block">
      e
      <svg viewBox="0 0 20 30" className="absolute left-1/2 overflow-visible" style={{ width: "0.34em", height: "0.5em", top: "-0.1em", transform: "translateX(-30%) rotate(10deg)" }}>
        {on && <circle cx="10" cy="20" r="13" fill="var(--color-lantern)" opacity={0.18 + lit * 0.2} style={{ filter: "blur(4px)" }} />}
        <motion.path
          d="M12 1 C 9 7, 17 10, 17 18 C 17 25, 11 28, 8.5 27.5 C 4 26.5, 2.5 22, 3.5 18 C 4.5 14, 8 13, 9 9 C 9.7 6.5, 10.5 3.5, 12 1 Z"
          fill={on ? "var(--color-lantern)" : "var(--t-flame-off, var(--t-line))"}
          stroke={on ? "#ffd98a" : "none"}
          strokeOpacity={0.9}
          strokeWidth={1.2}
          style={{ transformOrigin: "10px 26px" }}
          animate={on && !calm ? { scaleY: [1, 1.08, 0.96, 1.04, 1], skewX: [0, -3, 2, -1, 0] } : undefined}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay }}
        />
        {on && <path d="M10.5 12 C 10 15, 13.5 17, 13 21 C 12.5 24, 9 24.5, 7.5 22.5 C 6.5 20, 8.5 17.5, 10.5 12 Z" fill="#fff4d6" opacity={0.85} />}
      </svg>
    </span>
  );
}
