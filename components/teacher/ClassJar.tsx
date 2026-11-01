"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef } from "react";
import { useCalmMotion } from "@/lib/useCalmMotion";

const FIREFLY = "#d6ee8a";

/** What a class moment says on the projector: the class, never a name */
const SAYS: Record<string, string> = {
  rival: "Someone just won an argument against the rival.",
  notebook: "Someone just fixed a mistake in Gloam's notes.",
  whatif: "Someone just predicted a what-if.",
  order: "Someone just put Gloam's cards in order.",
  recital: "Someone just stopped Gloam mid-presentation and fixed it.",
  boss: "The Muddle just fell. Again.",
};

/** The milestones the class fills toward (a shared goal: never a ranking) */
const GOALS = [50, 100, 250, 500, 1000, 2000, 5000, 10000];

/**
 * The class jar, for the projector: every student's fireflies in one big jar, filling live as the class
 * teaches, with the class's latest wins, without names. One shared goal, so nobody is ever ranked.
 * Calm motion: the fireflies sit still and the numbers just change.
 */
export function ClassJar({ total, moments, className, onClose }: { total: number; moments: { id: number; kind: string; at: number }[]; className: string; onClose: () => void }) {
  const calm = useCalmMotion();
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    close.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      opener?.focus?.({ preventScroll: true });
    };
  }, [onClose]);
  const goal = GOALS.find((g) => g > total) ?? Math.ceil((total + 1) / 10000) * 10000;
  const prev = [...GOALS].reverse().find((g) => g <= total) ?? 0;
  // how full the jar looks: toward the next goal
  const fill = Math.max(0.04, Math.min(1, (total - prev) / Math.max(1, goal - prev)));
  // one glowing dot per few fireflies (capped, so a cheap projector laptop stays smooth)
  const dots = useMemo(
    () =>
      Array.from({ length: Math.min(120, Math.max(6, Math.round(total / 4))) }, (_, i) => ({
        x: 18 + ((i * 53) % 64),
        y: 100 - ((i * 29) % 100) * fill,
        d: 3 + ((i * 17) % 5),
        delay: (i % 11) * 0.37,
      })),
    [total, fill],
  );
  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="jar-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-[#0d1613] text-[#d3ddd6]"
      initial={calm ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={calm ? undefined : { opacity: 0, transition: { duration: 0.25 } }}
    >
      {/* (on a phone it starts at the top: centring a column taller than the screen would cut the jar off) */}
      <div className="mx-auto flex min-h-full max-w-6xl flex-col items-center gap-8 px-6 py-10 md:flex-row md:justify-center md:gap-16">
        {/* the jar */}
        <div className="relative w-[min(52vw,340px,46vh)] shrink-0" aria-hidden="true">
          <svg viewBox="0 0 100 130" className="w-full overflow-visible">
            <defs>
              <clipPath id="jar-inside">
                <path d="M30 22 C14 32 8 46 8 70 C8 104 26 124 50 124 C74 124 92 104 92 70 C92 46 86 32 70 22 Z" />
              </clipPath>
              <radialGradient id="jar-glow" cx="50%" cy="70%" r="60%">
                <stop offset="0%" stopColor={FIREFLY} stopOpacity={0.35 * fill + 0.05} />
                <stop offset="100%" stopColor={FIREFLY} stopOpacity="0" />
              </radialGradient>
            </defs>
            <ellipse cx="50" cy="75" rx="70" ry="64" fill="url(#jar-glow)" />
            <g clipPath="url(#jar-inside)">
              {dots.map((d, i) => (
                <motion.circle
                  key={i}
                  cx={d.x}
                  cy={20 + (d.y / 100) * 100}
                  r={d.d / 4}
                  fill={FIREFLY}
                  style={{ filter: `drop-shadow(0 0 2px ${FIREFLY})` }}
                  animate={calm ? undefined : { opacity: [0.35, 1, 0.35], y: [0, -3, 0] }}
                  transition={{ duration: 2.2 + (i % 5) * 0.4, repeat: Infinity, delay: d.delay, ease: "easeInOut" }}
                />
              ))}
            </g>
            {/* glass, a cork and a highlight, hand-drawn */}
            <path d="M30 22 C14 32 8 46 8 70 C8 104 26 124 50 124 C74 124 92 104 92 70 C92 46 86 32 70 22 Z" fill="rgb(214 238 138 / 0.05)" stroke="#9fb2a8" strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M33 10 h34 v12 h-34 z" fill="#8a6b4a" stroke="#5e4630" strokeWidth="1.2" />
            <path d="M18 50 C15 60 15 72 17 82" fill="none" stroke="rgb(255 255 255 / 0.3)" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>

        <div className="max-w-xl text-center md:text-left">
          <p className="text-lg font-bold text-[#9fb2a8]">{className}</p>
          <h2 id="jar-title" className="mt-1 font-bold tracking-tight" style={{ fontSize: "clamp(3rem, 9vw, 6.5rem)", lineHeight: 1, color: FIREFLY }}>
            <motion.span key={total} initial={calm ? false : { scale: 1.12 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 15 }} className="inline-block tabular-nums">
              {total.toLocaleString()}
            </motion.span>
          </h2>
          <p className="mt-2 text-xl">fireflies caught by teaching Gloam</p>
          <p className="mt-4 text-lg text-[#9fb2a8]">
            Next goal: <span className="font-bold text-[#d3ddd6]">{goal.toLocaleString()}</span>. Together, {(goal - total).toLocaleString()} to go.
          </p>
          <ul className="mt-8 inline-block space-y-2 text-left text-lg" aria-live="polite" aria-label="What just happened">
            <AnimatePresence initial={false}>
              {moments.slice(0, 4).map((m) => (
                <motion.li key={m.id} initial={calm ? false : { opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-3">
                  <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ background: FIREFLY, boxShadow: `0 0 10px ${FIREFLY}` }} />
                  {SAYS[m.kind] ?? "Someone just won a challenge."}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
          <p className="mt-8 text-sm text-[#9fb2a8]">No names and no rankings: the jar is everyone&apos;s.</p>
          <button
            ref={close}
            type="button"
            onClick={onClose}
            className="mt-6 min-h-11 cursor-pointer rounded-md border border-[#2c4844] px-5 font-bold text-[#d3ddd6] hover:bg-[#172723] focus-visible:outline-3 focus-visible:outline-[#8ec5dc]"
          >
            Close
          </button>
        </div>
      </div>
    </motion.div>
  );
}
