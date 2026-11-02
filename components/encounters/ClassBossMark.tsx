"use client";

import { AnimatePresence, motion } from "motion/react";
import type { AgeStyle } from "@/lib/age-styles";
import { gameUi } from "@/lib/age-styles/game-ui";
import type { ClassBossView } from "@/lib/game/class-boss";
import { useCalmMotion } from "@/lib/useCalmMotion";

/**
 * The whole-class boss, in the top bar while the teacher has it on the projector: a little Muddle whose fog thins
 * as the class hits it (the projector shows the big one). A hit from this student makes it flinch and says so.
 * No numbers: the fog is the meter, like the lantern is.
 */
export function ClassBossMark({ style, boss, news }: { style: AgeStyle; boss: ClassBossView; news: { text: string; key: number } | null }) {
  const calm = useCalmMotion();
  const ui = gameUi(style.id, style.language);
  const fog = boss.beaten ? 0 : 0.35 + 0.65 * boss.left;
  return (
    <span className="pointer-events-auto relative flex items-center gap-2">
      <motion.svg
        key={news?.key ?? 0}
        viewBox="0 0 40 28"
        width="34"
        height="24"
        aria-hidden="true"
        initial={calm || !news ? false : { x: -3, rotate: -8 }}
        animate={{ x: 0, rotate: 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 9 }}
      >
        {/* its fog: thinner as the class hits it */}
        <g fill="var(--t-ink-dim)" opacity={fog}>
          <circle cx="13" cy="16" r="9" />
          <circle cx="24" cy="12" r="10" />
          <circle cx="31" cy="18" r="7" />
          <rect x="8" y="16" width="27" height="9" rx="4.5" />
        </g>
        {!boss.beaten && (
          <g fill="var(--t-bg)">
            <path d="M15 15.5c1.6-1.4 3.4-1.4 5 0-1.6.8-3.4.8-5 0z" />
            <path d="M24 14.5c1.6-1.4 3.4-1.4 5 0-1.6.8-3.4.8-5 0z" />
          </g>
        )}
      </motion.svg>
      <span className="hidden text-sm font-bold text-ink md:inline">{ui.classBoss}</span>
      <span className="sr-only">{boss.beaten ? ui.classBossBeaten(0).replace(/\s*\+0.*$/, "") : ui.classBossHint}</span>
      {/* what just happened (a hit, the class winning, or that it just arrived), under the bar */}
      <AnimatePresence>
        {news && (
          <motion.span
            key={news.key}
            role="status"
            className="absolute top-full right-0 mt-2 w-max max-w-[min(18rem,70vw)] rounded-md bg-panel px-3 py-2 text-sm font-bold text-ink shadow-[0_4px_14px_rgb(0_0_0/0.25)]"
            initial={calm ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {news.text}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
