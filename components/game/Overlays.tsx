"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { ReadAloudButton } from "@/components/access/ReadAloud";
import { WaysToPlayButton } from "@/components/access/WaysToPlay";
import { InkButton } from "@/components/ui/InkButton";
import { Modal } from "@/components/ui/Modal";
import { Sheet } from "@/components/ui/Sheet";
import { TrailStrip } from "@/components/ui/TrailStrip";
import { Wordmark } from "@/components/ui/Logo";
import type { AgeStyle } from "@/lib/age-styles";
import type { GloamLevel } from "@/lib/companion/level";
import type { ClientLesson, Level, RecapItem } from "@/lib/lesson/types";
import { useCalmMotion } from "@/lib/useCalmMotion";
import type { Entry } from "./useTeachSession";

/* ---------------- Title screen ---------------- */

/**
 * Who's looking at the title screen:
 *   guest:   the practice lesson at "/", not in a class. The main way in is joining your class.
 *   student: signed in to a class. Their Gloam's home is one tap away.
 *   preview: a teacher trying a lesson
 */
export type Account = "guest" | "student" | "preview";

export function TitleScreen({
  style,
  lesson,
  resumable,
  account = "preview",
  onStart,
  onHelp,
  onGo,
}: {
  style: AgeStyle;
  lesson: ClientLesson;
  resumable: boolean;
  account?: Account;
  onStart: () => void;
  onHelp: () => void;
  /** go to another page (join, or the student's home) */
  onGo: (href: string) => void;
}) {
  const calm = useCalmMotion();
  const cta = useRef<HTMLButtonElement>(null);
  useEffect(() => cta.current?.focus({ preventScroll: true }), []);
  const rise = (delay: number) => (calm ? {} : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { delay, duration: 0.8, ease: [0.22, 1, 0.36, 1] as const } });

  return (
    <motion.div className="absolute inset-0 z-20 flex items-end md:items-center" exit={calm ? undefined : { opacity: 0, transition: { duration: 0.5 } }}>
      {/* darken the left side so the title reads, keep the right side (Gloam) clear */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgb(var(--t-scrim)/calc(0.85_+_var(--scrim-boost)))_0%,rgb(var(--t-scrim)/calc(0.55_+_var(--scrim-boost)))_38%,transparent_65%)] max-md:bg-[linear-gradient(0deg,rgb(var(--t-scrim)/calc(0.92_+_var(--scrim-boost)))_0%,rgb(var(--t-scrim)/calc(0.6_+_var(--scrim-boost)))_45%,transparent_70%)]" />
      <div className="relative w-full px-6 pb-10 md:w-auto md:px-[7vw] md:pb-0">
        <motion.h1 {...rise(0.35)} className="mt-3 text-[4rem] text-ink md:text-[6.5rem]">
          <Wordmark tone={style.look.tone} mark={false} />
        </motion.h1>
        <motion.p {...rise(0.5)} className="mt-5 max-w-[24ch] text-lg text-ink">
          {lesson.title}
        </motion.p>
        {/* wraps before it reaches Gloam, even with the biggest text */}
        <motion.div {...rise(0.7)} className="mt-8 flex max-w-[min(40rem,54vw)] flex-wrap items-center gap-3 max-md:max-w-none">
          {account === "guest" ? (
            <>
              <InkButton ref={cta} size="lg" onClick={() => onGo("/join")}>
                {style.copy.titleJoin}
              </InkButton>
              <InkButton variant="quiet" size="lg" onClick={onStart}>
                {resumable ? style.copy.titleContinue : style.copy.titlePractice}
              </InkButton>
              <InkButton variant="ghost" onClick={onHelp}>
                {style.copy.titleHelp}
              </InkButton>
              <WaysToPlayButton style={style} />
            </>
          ) : (
            <>
              <InkButton ref={cta} size="lg" onClick={onStart}>
                {resumable ? style.copy.titleContinue : style.copy.titleCta}
              </InkButton>
              {account === "student" ? (
                <InkButton variant="quiet" size="lg" onClick={() => onGo("/me")}>
                  {style.copy.toMyGloam}
                </InkButton>
              ) : (
                <InkButton variant="quiet" size="lg" onClick={onHelp}>
                  {style.copy.titleHelp}
                </InkButton>
              )}
              <WaysToPlayButton style={style} />
            </>
          )}
        </motion.div>
        {/* students always know they're talking to an AI, and who reads what they write */}
        <motion.p {...rise(0.85)} className="mt-6 max-w-[48ch] text-xs text-ink-dim">
          {style.copy.about.aiNote}
        </motion.p>
      </div>
      {/* a quiet way in for teachers; students won't need it */}
      {account !== "student" && (
      <a href="/teacher" className="absolute right-4 bottom-4 min-h-11 content-center rounded-md px-3 text-xs font-bold text-ink-dim underline-offset-4 hover:text-ink hover:underline">
        {style.copy.forTeachers}
      </a>
      )}
    </motion.div>
  );
}

/* ---------------- Top bar while teaching ---------------- */

export function TopBar({ style, lesson, levels, current, onPause }: { style: AgeStyle; lesson: ClientLesson; levels: Level[]; current: number; onPause: () => void }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-4 bg-[linear-gradient(180deg,rgb(var(--t-scrim)/calc(0.7_+_var(--scrim-boost))),transparent)] px-4 pt-3 pb-10 sm:px-6">
      <div className="min-w-0">
        <h1 className="truncate text-sm font-bold text-ink">{lesson.title}</h1>
        <TrailStrip style={style} concepts={lesson.concepts} levels={levels} current={Math.min(current, lesson.concepts.length - 1)} />
      </div>
      <InkButton variant="quiet" onClick={onPause} aria-keyshortcuts="Escape" className="pointer-events-auto">
        {style.copy.pause}
      </InkButton>
    </div>
  );
}

export function PauseMenu({
  style,
  onResume,
  onHelp,
  onLog,
  onAccess,
  onStartOver,
  onTitle,
  titleLabel,
  canSeeRecap,
  onRecap,
  onMap,
}: {
  style: AgeStyle;
  onResume: () => void;
  onHelp: () => void;
  onLog: () => void;
  /** Ways to play: voice, read-aloud, text size, contrast, motion, sound */
  onAccess: () => void;
  onStartOver: () => void;
  onTitle: () => void;
  /** what "back to title" says (a student goes back to their Gloam instead) */
  titleLabel?: string;
  canSeeRecap: boolean;
  onRecap: () => void;
  /** the trail map (only in age styles with a journey world) */
  onMap?: () => void;
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
        {onMap && (
          <InkButton variant="ghost" className={row} onClick={onMap}>
            {style.copy.trailMap}
          </InkButton>
        )}
        <InkButton variant="ghost" className={row} onClick={onLog}>
          {style.copy.log}
        </InkButton>
        <InkButton variant="ghost" className={row} onClick={onHelp}>
          {style.copy.titleHelp}
        </InkButton>
        <InkButton variant="ghost" className={row} onClick={onAccess} aria-haspopup="dialog">
          {style.copy.access.open}
        </InkButton>
        <InkButton variant="ghost" className={row} onClick={onTitle}>
          {titleLabel ?? style.copy.backToTitle}
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
      {/* what Gloam is, and what it remembers: every student's right to know */}
      <h3 className="mt-5 text-sm font-bold text-ink">{style.copy.about.title}</h3>
      <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-ink-dim">
        {style.copy.about.lines.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
      <ReadAloudButton style={style} className="-ml-2 mt-1" text={[style.copy.howItWorksTitle, ...style.copy.howItWorks(lesson.title, lesson.concepts.length), style.copy.about.title, ...style.copy.about.lines].join(" ")} />
      <InkButton onClick={onClose} className="mt-5">
        {style.copy.close}
      </InkButton>
    </Modal>
  );
}

/** The whole conversation, scrollable. Gloam in its voice font, the student in the reading font. */
export function LogDrawer({ style, entries, onClose }: { style: AgeStyle; entries: Entry[]; onClose: () => void }) {
  const end = useRef<HTMLLIElement>(null);
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
      {/* focusable, so the conversation can be scrolled with the keyboard too */}
      <ol tabIndex={0} aria-label={style.copy.log} className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
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
        <li ref={end} aria-hidden="true" />
      </ol>
    </Modal>
  );
}

/* ---------------- The ending: Gloam's journal ---------------- */

/** A small hand-drawn flame: an idea Gloam now understands (gold = understanding) */
function FlameMark() {
  return (
    <svg viewBox="0 0 20 28" className="mt-0.5 h-6 w-4 shrink-0" aria-hidden="true">
      <circle cx="10" cy="17" r="10" fill="var(--color-lantern)" opacity="0.16" />
      <path d="M11 1 C 8 7, 16 10, 16 17 C 16 23, 11 26, 9 25.5 C 4.5 24.5, 3 20.5, 4 17 C 5 13.5, 8 12.5, 9 9 C 9.6 6.5, 10 3.5, 11 1 Z" fill="var(--color-lantern)" />
      <path d="M10 12 C 9.5 15, 12.5 16.5, 12 20 C 11.5 22.5, 8.5 23, 7.5 21 C 6.8 19, 8.6 17, 10 12 Z" fill="#fff4d6" opacity="0.85" />
    </svg>
  );
}

/**
 * The finale's recap, as pages of Gloam's journal: everything the student taught it, in plain words.
 * Written from the approved lesson (never by the AI), so students always leave with the right ideas.
 * Gloam's lantern level shows as words and light, never as a bar.
 */
export function EndingPanel({
  style,
  recap,
  gloam,
  onTeachAgain,
  onTitle,
  onKeepTalking,
  titleLabel,
}: {
  style: AgeStyle;
  recap: RecapItem[];
  gloam: GloamLevel;
  onTeachAgain: () => void;
  onTitle: () => void;
  onKeepTalking: () => void;
  titleLabel?: string;
}) {
  const calm = useCalmMotion();
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => first.current?.focus({ preventScroll: true }), []);
  const toGo = gloam.next === null ? null : gloam.next - gloam.light;
  return (
    <motion.section
      aria-labelledby="ending-title"
      className="absolute inset-y-0 right-0 z-20 flex w-full flex-col p-3 md:w-[min(520px,44vw)]"
      initial={calm ? false : { x: 60, opacity: 0, rotate: 1.5 }}
      animate={{ x: 0, opacity: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 110, damping: 20, delay: calm ? 0 : 0.3 }}
    >
      <Sheet seed="journal" tone="slate" radius={22} className="flex min-h-0 flex-1 flex-col">
        <div className="flex h-[calc(100dvh-24px)] flex-col">
          {/* faint ruled lines, like a real journal page */}
          <div tabIndex={0} role="region" aria-labelledby="ending-title" className="flex-1 overflow-y-auto bg-[repeating-linear-gradient(180deg,transparent_0,transparent_31px,rgb(211_221_214/0.07)_31px,rgb(211_221_214/0.07)_32px)] px-6 pt-8 pb-4 md:px-8">
            <p className="voice text-sm text-[var(--color-lantern)]" style={{ ["--casual" as string]: 1, ["--slant" as string]: -8 }}>
              {style.copy.finaleWord}
            </p>
            <h2 id="ending-title" className="voice mt-1 text-xl text-ink" style={{ ["--casual" as string]: 1, ["--voice-weight" as string]: 800, ["--slant" as string]: -4 }}>
              {style.copy.recapTitle.toLowerCase()}
            </h2>
            <p className="mt-2 text-sm text-ink-dim">{style.copy.recapIntro}</p>
            <ReadAloudButton style={style} className="-ml-2 mt-1" text={[style.copy.recapTitle, style.copy.recapIntro, ...recap.map((r) => `${r.name}. ${r.text}`)].join(" ")} />
            <ol className="mt-6 space-y-5">
              {recap.map((r, i) => (
                <motion.li
                  key={r.id}
                  className="flex gap-3"
                  initial={calm ? false : { opacity: 0, y: 10, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ delay: calm ? 0 : 0.7 + i * 0.22, duration: 0.6 }}
                >
                  <FlameMark />
                  <span>
                    <span className="block text-sm font-bold text-ink">{r.name}</span>
                    <span className="text-sm text-ink-dim">{r.text}</span>
                  </span>
                </motion.li>
              ))}
            </ol>
            <motion.div
              className="mt-8 border-t border-dashed border-line pt-4"
              initial={calm ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: calm ? 0 : 0.9 + recap.length * 0.22 }}
            >
              <p className="voice text-md text-ink" style={{ ["--casual" as string]: 1, ["--slant" as string]: -6 }}>
                {style.copy.journalLevel(gloam.level)}
              </p>
              <p className="mt-1 text-sm text-ink-dim">{style.copy.journalTaught(gloam.light, toGo)}</p>
            </motion.div>
          </div>
          <div className="flex flex-wrap gap-2 border-t border-dashed border-line px-6 py-4 md:px-8">
            <InkButton ref={first} onClick={onKeepTalking}>
              {style.copy.resume}
            </InkButton>
            <InkButton variant="quiet" onClick={onTeachAgain}>
              {style.copy.teachAgain}
            </InkButton>
            <InkButton variant="ghost" onClick={onTitle}>
              {titleLabel ?? style.copy.backToTitle}
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
            className="voice max-w-[40ch] text-center text-md text-ink [text-shadow:0_1px_10px_rgb(var(--t-glow)/0.95)]"
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
