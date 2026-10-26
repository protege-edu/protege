"use client";

import { AnimatePresence, motion } from "motion/react";
import { Sheet } from "@/components/ui/Sheet";
import type { AgeStyle } from "@/lib/age-styles";
import { useCalmMotion } from "@/lib/useCalmMotion";
import type { GloamBox } from "./Stage";

/** What Gloam mutters while it walks to the next checkpoint (hand-written, from the world) */
export function TravelQuip({ text, gloam }: { text: string | null; gloam: GloamBox | null }) {
  const calm = useCalmMotion();
  return (
    <AnimatePresence>
      {text && gloam && (
        <motion.p
          key={text}
          aria-live="polite"
          className="voice pointer-events-none absolute z-20 max-w-[30ch] -translate-x-1/2 text-center text-sm text-ink [text-shadow:0_1px_10px_rgb(0_0_0/0.95)]"
          style={{ left: gloam.cx, top: Math.max(70, gloam.top - 56), ["--casual" as string]: 0.9, ["--slant" as string]: -6 }}
          initial={calm ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={calm ? undefined : { opacity: 0, y: -6, transition: { duration: 0.6 } }}
          transition={{ duration: 0.5 }}
        >
          {text}
        </motion.p>
      )}
    </AnimatePresence>
  );
}

/**
 * A new chapter: Gloam reached the next shrine. The chapter number writes itself in,
 * then the story beat underneath, then it all drifts away. Choreographed, not a popup.
 */
export function ChapterCard({ style, chapter, total, beat }: { style: AgeStyle; chapter: number | null; total: number; beat: string }) {
  const calm = useCalmMotion();
  return (
    <AnimatePresence>
      {chapter !== null && (
        <motion.div
          key={chapter}
          role="status"
          className="pointer-events-none absolute inset-x-0 top-[13%] z-20 flex flex-col items-center px-6 text-center"
          initial={calm ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={calm ? undefined : { opacity: 0, transition: { duration: 1.2 } }}
        >
          <motion.p
            className="voice text-xl text-ink [text-shadow:0_2px_18px_rgb(0_0_0/0.9)] md:text-2xl"
            style={{ ["--casual" as string]: 1, ["--voice-weight" as string]: 800 }}
            initial={calm ? false : { opacity: 0, letterSpacing: "0.3em", filter: "blur(6px)" }}
            animate={{ opacity: 1, letterSpacing: "0em", filter: "blur(0px)" }}
            transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
          >
            {style.copy.chapter(chapter).toLowerCase()}
            <span className="sr-only"> of {total}</span>
          </motion.p>
          <motion.span
            aria-hidden="true"
            className="mt-3 block h-px bg-[var(--t-ink-dim)]"
            initial={calm ? false : { width: 0 }}
            animate={{ width: 120 }}
            transition={{ delay: 0.5, duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          />
          <motion.p
            className="voice mt-3 max-w-[38ch] text-md text-ink-dim [text-shadow:0_1px_12px_rgb(0_0_0/0.95)]"
            style={{ ["--casual" as string]: 0.6, ["--slant" as string]: -8, ["--voice-weight" as string]: 500 }}
            initial={calm ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 1 }}
          >
            {beat}
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Gloam's lantern grew: everything this student has taught, across lessons, made it brighter */
export function LevelUpCard({ style, level, line, onDone }: { style: AgeStyle; level: number | null; line: string; onDone: () => void }) {
  const calm = useCalmMotion();
  return (
    <AnimatePresence onExitComplete={() => undefined}>
      {level !== null && (
        <motion.div
          key={level}
          role="status"
          className="absolute top-20 left-1/2 z-30 w-[min(380px,calc(100%-32px))] -translate-x-1/2"
          initial={calm ? false : { opacity: 0, y: -16, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={calm ? undefined : { opacity: 0, y: -10 }}
          transition={{ type: "spring", stiffness: 220, damping: 20 }}
          onAnimationComplete={() => setTimeout(onDone, 4200)}
        >
          <Sheet seed="level-up" className="px-5 py-4 text-center">
            <p className="text-xs font-bold text-[var(--color-lantern)]">Gloam&apos;s lantern grew</p>
            <p className="voice mt-1 text-lg text-ink" style={{ ["--casual" as string]: 1, ["--voice-weight" as string]: 800 }}>
              {style.id === "senior" ? `level ${level}` : `Level ${level}!`}
            </p>
            <p className="voice mt-1 text-sm text-ink-dim">{line}</p>
          </Sheet>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
