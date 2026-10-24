"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { AgeStyle } from "@/lib/age-styles";
import type { ClientLesson, RecapItem } from "@/lib/lesson/types";
import { useCalmMotion } from "@/lib/useCalmMotion";
import type { Entry } from "./useTeachSession";

/* ---------------- Title screen ---------------- */

export function TitleScreen({
  style,
  lesson,
  resumable,
  onStart,
  onHelp,
}: {
  style: AgeStyle;
  lesson: ClientLesson;
  resumable: boolean;
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
        <motion.h1 {...rise(0.35)} className="voice mt-2 text-2xl font-bold text-ink md:text-3xl" style={{ ["--voice-width" as string]: 112, ["--bounce" as string]: 40 }}>
          {style.copy.appName.toLowerCase()}
        </motion.h1>
        <motion.p {...rise(0.5)} className="mt-4 max-w-[26ch] text-lg text-ink">
          {lesson.title}
        </motion.p>
        <motion.div {...rise(0.7)} className="mt-8 flex flex-wrap items-center gap-3">
          <button
            ref={cta}
            type="button"
            onClick={onStart}
            className="min-h-12 cursor-pointer rounded-md bg-accent px-7 text-sm font-bold text-accent-ink hover:bg-accent-hover active:scale-95"
          >
            {resumable ? style.copy.titleContinue : style.copy.titleCta}
          </button>
          <button type="button" onClick={onHelp} className="min-h-12 cursor-pointer rounded-md px-4 text-sm font-bold text-ink-dim underline-offset-4 hover:text-ink hover:underline">
            {style.copy.titleHelp}
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}

/* ---------------- Top bar while teaching ---------------- */

export function TopBar({ style, lesson, chapter, onPause }: { style: AgeStyle; lesson: ClientLesson; chapter: number; onPause: () => void }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-4 bg-[linear-gradient(180deg,rgb(5_10_8/0.65),transparent)] px-4 pt-3 pb-8 sm:px-6">
      <div className="min-w-0">
        <p className="voice text-xs font-bold text-ink-dim" style={{ ["--voice-width" as string]: 100 }}>
          {style.copy.chapter(chapter).toLowerCase()}
        </p>
        <h1 className="truncate text-sm font-bold text-ink">{lesson.title}</h1>
      </div>
      <button
        type="button"
        onClick={onPause}
        className="pointer-events-auto min-h-11 shrink-0 cursor-pointer rounded-md border border-line bg-panel/80 px-4 text-xs font-bold text-ink hover:bg-panel"
        aria-keyshortcuts="Escape"
      >
        {style.copy.pause}
      </button>
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
        className={side ? "flex h-full w-full max-w-[440px] flex-col border-l border-line bg-panel" : "w-[min(420px,calc(100%-32px))] rounded-lg border border-line bg-panel p-6"}
      >
        {children}
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
  const row = "min-h-11 w-full cursor-pointer rounded-md px-4 text-left text-sm font-bold text-ink hover:bg-chip";
  return (
    <Modal onClose={onResume} label={style.copy.paused}>
      <p className="voice mb-4 text-lg font-bold text-ink" style={{ ["--voice-width" as string]: 110 }}>
        {style.copy.paused.toLowerCase()}
      </p>
      <div className="flex flex-col gap-1">
        <button type="button" onClick={onResume} className="mb-2 min-h-12 w-full cursor-pointer rounded-md bg-accent px-4 text-sm font-bold text-accent-ink hover:bg-accent-hover">
          {style.copy.resume}
        </button>
        {canSeeRecap && (
          <button type="button" className={row} onClick={onRecap}>
            {style.copy.seeRecap}
          </button>
        )}
        <button type="button" className={row} onClick={onLog}>
          {style.copy.log}
        </button>
        <button type="button" className={row} onClick={onHelp}>
          {style.copy.titleHelp}
        </button>
        <button type="button" className={row} onClick={onToggleSound} aria-pressed={sound}>
          {style.copy.sound(sound)}
        </button>
        <button type="button" className={row} onClick={onTitle}>
          {style.copy.backToTitle}
        </button>
        <button
          type="button"
          className={`${row} ${confirming ? "bg-accent text-accent-ink hover:bg-accent-hover" : "text-ink-dim"}`}
          onClick={() => (confirming ? onStartOver() : setConfirming(true))}
        >
          {confirming ? style.copy.startOverConfirm : style.copy.startOver}
        </button>
      </div>
    </Modal>
  );
}

export function HelpDialog({ style, lesson, onClose }: { style: AgeStyle; lesson: ClientLesson; onClose: () => void }) {
  return (
    <Modal onClose={onClose} label={style.copy.howItWorksTitle}>
      <h2 className="voice text-lg font-bold text-ink" style={{ ["--voice-width" as string]: 105 }}>
        {style.copy.howItWorksTitle}
      </h2>
      <div className="mt-3 space-y-2 text-sm text-ink">
        {style.copy.howItWorks(lesson.title, lesson.concepts.length).map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>
      <button type="button" onClick={onClose} className="mt-5 min-h-11 cursor-pointer rounded-md bg-accent px-5 text-sm font-bold text-accent-ink hover:bg-accent-hover">
        {style.copy.close}
      </button>
    </Modal>
  );
}

/** The whole conversation, scrollable. Gloam in its voice font, the student in the reading font. */
export function LogDrawer({ style, entries, onClose }: { style: AgeStyle; entries: Entry[]; onClose: () => void }) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => end.current?.scrollIntoView({ block: "end" }), []);
  return (
    <Modal onClose={onClose} label={style.copy.log} side>
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <h2 className="text-sm font-bold text-ink">{style.copy.log}</h2>
        <button type="button" onClick={onClose} className="min-h-11 cursor-pointer rounded-md px-3 text-xs font-bold text-ink-dim hover:text-ink">
          {style.copy.close}
        </button>
      </div>
      <ol className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {entries.map((e) => (
          <li key={e.id}>
            {e.kind === "gloam" && (
              <>
                <span className="voice block text-xs font-bold text-accent">{style.copy.gloamName}</span>
                <p className="voice text-sm text-ink">{e.text}</p>
              </>
            )}
            {e.kind === "student" && (
              <div className="ml-6 rounded-md bg-chip px-3 py-2">
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
      className="absolute inset-y-0 right-0 z-20 flex w-full flex-col border-l border-line bg-panel/95 md:w-[min(480px,42vw)]"
      initial={calm ? false : { x: 60, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 120, damping: 22, delay: calm ? 0 : 0.3 }}
    >
      <div className="flex-1 overflow-y-auto px-6 pt-8 pb-4 md:px-8">
      <p className="voice text-xs font-bold text-lantern">{style.copy.finaleWord}</p>
      <h2 id="ending-title" className="voice mt-2 text-lg font-bold text-ink" style={{ ["--voice-width" as string]: 108 }}>
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
      <div className="flex flex-wrap gap-3 border-t border-line px-6 py-4 md:px-8">
        <button ref={first} type="button" onClick={onKeepTalking} className="min-h-11 cursor-pointer rounded-md bg-accent px-5 text-sm font-bold text-accent-ink hover:bg-accent-hover">
          {style.copy.resume}
        </button>
        <button type="button" onClick={onTeachAgain} className="min-h-11 cursor-pointer rounded-md border border-line px-5 text-sm font-bold text-ink hover:bg-chip">
          {style.copy.teachAgain}
        </button>
        <button type="button" onClick={onTitle} className="min-h-11 cursor-pointer rounded-md px-3 text-sm font-bold text-ink-dim underline-offset-4 hover:text-ink hover:underline">
          {style.copy.backToTitle}
        </button>
      </div>
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
            className="voice max-w-[40ch] text-center text-sm text-ink-dim [text-shadow:0_1px_8px_rgb(0_0_0/0.9)]"
            style={{ ["--voice-width" as string]: 96 }}
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
