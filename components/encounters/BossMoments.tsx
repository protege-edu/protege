"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import type { TeachSession } from "@/components/game/useTeachSession";
import type { AgeStyle } from "@/lib/age-styles";
import { gameUi } from "@/lib/age-styles/game-ui";
import { useCalmMotion } from "@/lib/useCalmMotion";

/**
 * The boss fight's big moments, over the whole scene:
 *   - its arrival: the screen dims and its name slams in (deadpan and slanted for high school,
 *     a bouncy cartoon title for the younger ages), with one line under it. A tap skips it.
 *   - every clean hit: a flash of moonlight across the screen (a frame of hit-stop).
 * Calm motion: the title just fades in and out, and there's no flash.
 */
export function BossMoments({ s, style }: { s: TeachSession; style: AgeStyle }) {
  const calm = useCalmMotion();
  const ui = gameUi(style.id, style.language);
  // (it starts during the last candle's big moment: the title waits until that's over)
  const boss = s.encounter?.kind === "boss" && !s.moment;
  const deadpan = style.id === "senior";
  // the title plays once, when the fight starts
  const [title, setTitle] = useState(false);
  const [was, setWas] = useState(boss);
  if (boss !== was) {
    setWas(boss);
    if (boss && s.encounter?.kind === "boss" && s.encounter.round === 0) setTitle(true);
  }
  useEffect(() => {
    if (!title) return;
    const t = setTimeout(() => setTitle(false), calm ? 1800 : 2600);
    return () => clearTimeout(t);
  }, [title, calm]);

  return (
    <>
      <AnimatePresence>
        {title && (
          <motion.button
            type="button"
            key="boss-title"
            onClick={() => setTitle(false)}
            aria-label={`${ui.bossTitle}. ${ui.bossIntro}`}
            className="absolute inset-0 z-50 flex cursor-pointer flex-col items-center justify-center bg-[rgb(3_8_6/0.62)] px-6 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.5 } }}
          >
            <motion.span
              className="voice block font-bold text-[#e8e4c9]"
              style={
                deadpan
                  ? { fontSize: "clamp(3rem, 11vw, 8.5rem)", letterSpacing: "0.04em", ["--casual" as string]: 0, ["--slant" as string]: -12, lineHeight: 0.95 }
                  : { fontSize: "clamp(2.6rem, 9vw, 7rem)", lineHeight: 1 }
              }
              initial={calm ? false : deadpan ? { scale: 1.7, opacity: 0, filter: "blur(10px)" } : { scale: 0.3, rotate: -8, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1, filter: "blur(0px)" }}
              transition={deadpan ? { duration: 0.35, ease: [0.2, 0.9, 0.3, 1.05] } : { type: "spring", stiffness: 300, damping: 11 }}
            >
              {ui.bossTitle}
            </motion.span>
            {deadpan && <motion.span aria-hidden="true" className="mt-4 block h-px bg-[#e8e4c9]/60" initial={{ width: 0 }} animate={{ width: "min(60vw, 520px)" }} transition={{ delay: 0.35, duration: 0.6 }} />}
            <motion.span className="voice mt-4 block max-w-[34ch] text-md text-[#cfd6c8]" initial={calm ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
              {ui.bossIntro}
            </motion.span>
          </motion.button>
        )}
      </AnimatePresence>
      {/* a hit: one frame of moonlight */}
      <AnimatePresence>
        {!calm && s.gameEvent && (s.gameEvent.event === "hit" || s.gameEvent.event === "defeated") && (
          <motion.span
            key={s.gameEvent.key}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-30 bg-[#8ec5dc]"
            initial={{ opacity: 0.32 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
