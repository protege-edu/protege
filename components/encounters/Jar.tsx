"use client";

import { AnimatePresence, motion, useAnimate } from "motion/react";
import { useLayoutEffect, useState } from "react";
import type { GloamBox } from "@/components/game/Stage";
import type { AgeStyle } from "@/lib/age-styles";
import { gameUi } from "@/lib/age-styles/game-ui";
import { useCalmMotion } from "@/lib/useCalmMotion";

/** Fireflies are moss-green, never gold: lantern gold only ever means understanding */
export const FIREFLY = "#d6ee8a";

/**
 * Gloam's jar of fireflies, in the top bar. Fireflies are caught by teaching well (lib/game/engine.ts),
 * and the ones just caught fly from Gloam's lantern into the jar. Your own jar: nobody else's count is
 * ever shown (the class only sees one total for everyone). Calm motion: the count just changes.
 */
export function Jar({ style, count, caught, gloam }: { style: AgeStyle; count: number; caught: { n: number; key: number } | null; gloam: GloamBox | null }) {
  const calm = useCalmMotion();
  const ui = gameUi(style.id, style.language);
  // a few glowing dots inside the jar, more as it fills (up to 7)
  const dots = Math.min(7, Math.ceil(count / 12));
  return (
    <span className="pointer-events-auto relative flex items-center gap-1.5" role="status" aria-label={ui.jar(count)}>
      <svg viewBox="0 0 28 34" width="24" height="30" aria-hidden="true">
        {/* a hand-drawn glass jar with a cork */}
        <path d="M9 3.5h10v4H9z" fill="#8a6b4a" />
        <path d="M8.5 7.5c-3 2.4-5 5.6-5 10.5 0 7.5 4.6 12.5 10.5 12.5s10.5-5 10.5-12.5c0-4.9-2-8.1-5-10.5z" fill="rgb(214 238 138 / 0.08)" stroke="var(--t-ink-dim)" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M7.2 13.5c-.8 2-1 4-.6 6" fill="none" stroke="rgb(255 255 255 / 0.35)" strokeWidth="1.2" strokeLinecap="round" />
        {Array.from({ length: dots }, (_, i) => (
          <motion.circle
            key={i}
            cx={9 + ((i * 5) % 11)}
            cy={26 - ((i * 7) % 12)}
            r="1.6"
            fill={FIREFLY}
            animate={calm ? undefined : { opacity: [0.45, 1, 0.45] }}
            transition={{ duration: 1.6 + i * 0.3, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </svg>
      <motion.span key={count} className="text-sm font-bold tabular-nums text-ink" initial={calm ? false : { scale: 1.35 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 16 }}>
        {count}
      </motion.span>
      {/* the ones just caught, flying in from Gloam's lantern */}
      <AnimatePresence>
        {!calm && caught && gloam && <Flight key={caught.key} n={caught.n} from={{ x: gloam.cx - gloam.w * 0.2, y: gloam.top + gloam.h * 0.1 }} label={ui.caught(caught.n)} />}
      </AnimatePresence>
    </span>
  );
}

function Flight({ n, from, label }: { n: number; from: { x: number; y: number }; label: string }) {
  const [scope, animate] = useAnimate<HTMLSpanElement>();
  // where Gloam's lantern was when they were caught (Gloam moving mid-flight doesn't restart them)
  const [start] = useState(from);
  const flies = Math.min(8, Math.max(2, Math.ceil(n / 3)));
  // measured, not guessed: each firefly starts at Gloam's lantern and lands in the jar
  useLayoutEffect(() => {
    const el = scope.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const dx = start.x - r.left;
    const dy = start.y - r.top;
    el.querySelectorAll<HTMLElement>("[data-fly]").forEach((fly, i) => {
      const side = i % 2 ? 1 : -1;
      void animate(fly, { x: [dx + side * i * 6, dx * 0.45 + side * 40, 0], y: [dy + ((i * 13) % 24), dy * 0.3 - 60, 0], opacity: [0, 1, 1, 0] }, { duration: 1.1 + i * 0.07, ease: "easeInOut", delay: i * 0.06 });
    });
  }, [animate, scope, start]);
  return (
    <span ref={scope} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-2">
      {Array.from({ length: flies }, (_, i) => (
        <span key={i} data-fly className="absolute block size-2 rounded-full opacity-0" style={{ background: FIREFLY, boxShadow: `0 0 10px 3px ${FIREFLY}` }} />
      ))}
      <motion.span className="absolute -top-6 left-4 text-xs font-bold whitespace-nowrap" style={{ color: FIREFLY }} initial={{ opacity: 0, y: 4 }} animate={{ opacity: [0, 1, 1, 0], y: -6 }} transition={{ duration: 1.6, delay: 0.9 }}>
        {label}
      </motion.span>
    </span>
  );
}
