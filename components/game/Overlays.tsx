"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { InkButton } from "@/components/ui/InkButton";
import { Sheet } from "@/components/ui/Sheet";
import { TrailStrip } from "@/components/ui/TrailStrip";
import { Wordmark } from "@/components/ui/Wordmark";
import type { AgeStyle } from "@/lib/age-styles";
import type { ClientLesson, RecapItem } from "@/lib/lesson/types";
import { useCalmMotion } from "@/lib/useCalmMotion";
import type { Entry } from "./useTeachSession";

/* ---------------- Title screen ---------------- */

export function TitleScreen({
  style,
  lesson,
  resumable,
  light,
  onStart,
  onHelp,
}: {
  style: AgeStyle;
  lesson: ClientLesson;
  resumable: boolean;
  /** How much the student has taught Gloam so far (the wordmark's flames light up) */
  light: number;
  onStart: () => void;
  onHelp: () => void;
}) {
  const calm = useCalmMotion();
  const cta = useRef<HTMLButtonElement>(null);
  useEffect(() => cta.current?.focus({ preventScroll: true }), []);
  const rise = (delay: number) => (calm ? {} : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { delay, duration: 0.8, ease: [0.22, 1, 0.36, 1] as const } });

  return (
    <motion.div className="absolute inset-0 z-20 flex items-end md:items-center" exit={calm ? undefined : { opacity: 0, transition: { duration: 0.5 } }}>
      {/* darken the left side so the title reads, keep the right side (Gloam) clear */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgb(5_10_8/0.85)_0%,rgb(5_10_8/0.55)_38%,transparent_65%)] max-md:bg-[linear-gradient(0deg,rgb(5_10_8/0.92)_0%,rgb(5_10_8/0.6)_45%,transparent_70%)]" />
      <div className="relative w-full px-6 pb-10 md:w-auto md:px-[7vw] md:pb-0">
        <motion.p {...rise(0.2)} className="text-xs font-bold text-ink-dim">
          {lesson.subject}
        </motion.p>
        <motion.h1 {...rise(0.35)} className="mt-3 text-[4rem] text-ink md:text-[6.5rem]">
          <Wordmark lit={light} />
        </motion.h1>
        <motion.p {...rise(0.5)} className="mt-5 max-w-[24ch] text-lg text-ink">
          {lesson.title}
        </motion.p>
        <motion.div {...rise(0.7)} className="mt-8 flex flex-wrap items-center gap-3">
          <InkButton ref={cta} size="lg" onClick={onStart}>
            {resumable ? style.copy.titleContinue : style.copy.titleCta}
          </InkButton>
          <InkButton variant="quiet" size="lg" onClick={onHelp}>
            {style.copy.titleHelp}
          </InkButton>
        </motion.div>
      </div>
      {/* a quiet way in for teachers; students won't need it */}
      <a href="/teacher" className="absolute right-4 bottom-4 min-h-11 content-center rounded-md px-3 text-xs font-bold text-ink-dim underline-offset-4 hover:text-ink hover:underline">
        {style.copy.forTeachers}
      </a>
    </motion.div>
  );
}

/* ---------------- Top bar while teaching ---------------- */

export function TopBar({ style, lesson, lit, onPause }: { style: AgeStyle; lesson: ClientLesson; lit: number; onPause: () => void }) {
  const total = lesson.concepts.length;
  const current = Math.min(lit, total - 1);
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-4 bg-[linear-gradient(180deg,rgb(5_10_8/0.7),transparent)] px-4 pt-3 pb-10 sm:px-6">
      <div className="min-w-0">
        <h1 className="truncate text-sm font-bold text-ink">{lesson.title}</h1>
        <TrailStrip total={total} lit={lit} current={current} label={`${style.copy.chapter(current + 1)} of ${total}. ${lit} lit.`} />
      </div>
      <InkButton variant="quiet" onClick={onPause} aria-keyshortcuts="Escape" className="pointer-events-auto">
        {style.copy.pause}
      </InkButton>
    </div>
  );
}

/* ---------------- Modal shell (pause, help, log) ---------------- */

function Modal({ onClose, label, children, side = false }: { onClose: () => void; label: string; children: ReactNode; side?: boolean }) {
  const calm = useCalmMotion();
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const first = box.current?.querySelector<HTMLElement>("button, [href], textarea, input");
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      // keep keyboard focus inside the panel
      if (e.key === "Tab" && box.current) {
        const items = [...box.current.querySelectorAll<HTMLElement>("button, [href], textarea, input")];
        if (!items.length) return;
        const [a, z] = [items[0], items[items.length - 1]];
        if (e.shiftKey && document.activeElement === a) {
          e.preventDefault();
          z.focus();
        } else if (!e.shiftKey && document.activeElement === z) {
          e.preventDefault();
          a.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <motion.div
      className={`fixed inset-0 z-40 flex ${side ? "justify-end" : "items-center justify-center"} bg-[rgb(3_7_5/0.72)]`}
      initial={calm ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={calm ? undefined : { opacity: 0 }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        initial={calm ? false : side ? { x: 40, opacity: 0 } : { y: 12, opacity: 0 }}
        animate={{ x: 0, y: 0, opacity: 1 }}
        exit={calm ? undefined : side ? { x: 40, opacity: 0 } : { y: 8, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        className={side ? "flex h-full w-full max-w-[460px] flex-col p-3" : "w-[min(420px,calc(100%-32px))]"}
      >
        <Sheet seed={label} radius={20} className={side ? "flex min-h-0 flex-1 flex-col" : "p-6"}>
          {side ? <div className="flex h-[calc(100dvh-24px)] flex-col">{children}</div> : children}
        </Sheet>
      </motion.div>
    </motion.div>
  );
}

export function PauseMenu({
  style,
  sound,
  onResume,
  onHelp,
  onLog,
  onToggleSound,
  onStartOver,
  onTitle,
  canSeeRecap,
  onRecap,
}: {
  style: AgeStyle;
  sound: boolean;
  onResume: () => void;
  onHelp: () => void;
  onLog: () => void;
  onToggleSound: () => void;
  onStartOver: () => void;
  onTitle: () => void;
  canSeeRecap: boolean;
  onRecap: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const row = "!justify-start w-full";
  return (
    <Modal onClose={onResume} label={style.copy.paused}>
      <p className="voice mb-4 text-lg text-ink" style={{ ["--casual" as string]: 1, ["--voice-weight" as string]: 750 }}>
        {style.copy.paused.toLowerCase()}
      </p>
      <div className="flex flex-col items-stretch gap-0.5">
        <InkButton onClick={onResume} className="mb-3 w-full">
          {style.copy.resume}
        </InkButton>
        {canSeeRecap && (
          <InkButton variant="ghost" className={row} onClick={onRecap}>
            {style.copy.seeRecap}
          </InkButton>
        )}
        <InkButton variant="ghost" className={row} onClick={onLog}>
          {style.copy.log}
        </InkButton>
        <InkButton variant="ghost" className={row} onClick={onHelp}>
          {style.copy.titleHelp}
        </InkButton>
        <InkButton variant="ghost" className={row} onClick={onToggleSound} aria-pressed={sound}>
          {style.copy.sound(sound)}
        </InkButton>
        <InkButton variant="ghost" className={row} onClick={onTitle}>
          {style.copy.backToTitle}
        </InkButton>
        {confirming ? (
          <InkButton className="mt-2 w-full" onClick={onStartOver}>
            {style.copy.startOverConfirm}
          </InkButton>
        ) : (
          <InkButton variant="ghost" className={`${row} !text-ink-dim`} onClick={() => setConfirming(true)}>
            {style.copy.startOver}
          </InkButton>
        )}
      </div>
    </Modal>
  );
}

export function HelpDialog({ style, lesson, onClose }: { style: AgeStyle; lesson: ClientLesson; onClose: () => void }) {
  return (
    <Modal onClose={onClose} label={style.copy.howItWorksTitle}>
      <h2 className="voice text-lg text-ink" style={{ ["--casual" as string]: 1, ["--voice-weight" as string]: 750 }}>
        {style.copy.howItWorksTitle}
      </h2>
      <div className="mt-3 space-y-2 text-sm text-ink">
        {style.copy.howItWorks(lesson.title, lesson.concepts.length).map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>
      <InkButton onClick={onClose} className="mt-5">
        {style.copy.close}
      </InkButton>
    </Modal>
  );
}

/** The whole conversation, scrollable. Gloam in its voice font, the student in the reading font. */
export function LogDrawer({ style, entries, onClose }: { style: AgeStyle; entries: Entry[]; onClose: () => void }) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => end.current?.scrollIntoView({ block: "end" }), []);
  return (
    <Modal onClose={onClose} label={style.copy.log} side>
      <div className="flex items-center justify-between border-b border-dashed border-line px-5 py-3">
        <h2 className="voice text-md text-ink" style={{ ["--casual" as string]: 1, ["--voice-weight" as string]: 750 }}>
          {style.copy.log.toLowerCase()}
        </h2>
        <InkButton variant="quiet" onClick={onClose}>
          {style.copy.close}
        </InkButton>
      </div>
      <ol className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {entries.map((e) => (
          <li key={e.id}>
            {e.kind === "gloam" && (
              <>
                <span className="voice block text-xs text-accent" style={{ ["--voice-weight" as string]: 750 }}>
                  {style.copy.gloamName}
                </span>
                <p className="voice text-sm text-ink">{e.text}</p>
              </>
            )}
            {e.kind === "student" && (
              <div className="ml-6 border-l-2 border-line pl-3">
                <span className="block text-xs font-bold text-ink-dim">{style.copy.you}</span>
                <p className="text-sm whitespace-pre-wrap text-ink">{e.text}</p>
              </div>
            )}
            {e.kind === "story" && <p className="text-center text-xs text-ink-dim">{e.text}</p>}
          </li>
        ))}
        <div ref={end} />
      </ol>
    </Modal>
  );
}

/* ---------------- The ending ---------------- */

export function EndingPanel({
  style,
  recap,
  onTeachAgain,
  onTitle,
  onKeepTalking,
}: {
  style: AgeStyle;
  recap: RecapItem[];
  onTeachAgain: () => void;
  onTitle: () => void;
  onKeepTalking: () => void;
}) {
  const calm = useCalmMotion();
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => first.current?.focus({ preventScroll: true }), []);
  return (
    <motion.section
      aria-labelledby="ending-title"
      className="absolute inset-y-0 right-0 z-20 flex w-full flex-col p-3 md:w-[min(500px,42vw)]"
      initial={calm ? false : { x: 60, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 120, damping: 22, delay: calm ? 0 : 0.3 }}
    >
      <Sheet seed="ending" radius={22} className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-[calc(100dvh-24px)] flex-col">
      <div className="flex-1 overflow-y-auto px-6 pt-8 pb-4 md:px-8">
      <p className="voice text-xs font-bold text-lantern">{style.copy.finaleWord}</p>
      <h2 id="ending-title" className="voice mt-2 text-lg text-ink" style={{ ["--casual" as string]: 1, ["--voice-weight" as string]: 750 }}>
        {style.copy.recapTitle}
      </h2>
      <p className="mt-2 text-sm text-ink-dim">{style.copy.recapIntro}</p>
      <ul className="mt-5 space-y-4">
        {recap.map((r, i) => (
          <motion.li
            key={r.id}
            className="border-l-2 border-lantern pl-4"
            initial={calm ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: calm ? 0 : 0.6 + i * 0.12 }}
          >
            <span className="block text-sm font-bold text-ink">{r.name}</span>
            <span className="text-sm text-ink-dim">{r.text}</span>
          </motion.li>
        ))}
      </ul>
      </div>
      <div className="flex flex-wrap gap-2 border-t border-dashed border-line px-6 py-4 md:px-8">
        <InkButton ref={first} onClick={onKeepTalking}>
          {style.copy.resume}
        </InkButton>
        <InkButton variant="quiet" onClick={onTeachAgain}>
          {style.copy.teachAgain}
        </InkButton>
        <InkButton variant="ghost" onClick={onTitle}>
          {style.copy.backToTitle}
        </InkButton>
      </div>
      </div>
      </Sheet>
    </motion.section>
  );
}

/** Story beats appear as a quiet caption over the scene, then fade */
export function StoryCaption({ text }: { text: string | null }) {
  const calm = useCalmMotion();
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[16%] z-10 flex justify-center px-6" aria-live="polite">
      <AnimatePresence mode="wait">
        {text && (
          <motion.p
            key={text}
            className="voice max-w-[40ch] text-center text-md text-ink [text-shadow:0_1px_10px_rgb(0_0_0/0.95)]"
            style={{ ["--casual" as string]: 0.7, ["--slant" as string]: -8, ["--voice-weight" as string]: 500 }}
            initial={calm ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={calm ? undefined : { opacity: 0, transition: { duration: 1.2 } }}
            transition={{ duration: 1 }}
          >
            {text}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
