"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { MicButton } from "@/components/access/MicButton";
import { ReadAloudButton, useCanReadAloud } from "@/components/access/ReadAloud";
import { POSES } from "@/components/gloam/poses";
import { InkButton } from "@/components/ui/InkButton";
import { Sheet } from "@/components/ui/Sheet";
import { useAccess } from "@/lib/access/store";
import type { AgeStyle } from "@/lib/age-styles";
import { readAloud, stopReading } from "@/lib/speech";
import { useCalmMotion } from "@/lib/useCalmMotion";
import { useVoiceReady } from "@/lib/voice/client";
import type { GloamBox } from "./Stage";
import { TypedLine } from "./TypedLine";
import type { TeachSession } from "./useTeachSession";

const MAX = 500;

/**
 * Gloam's speech panel: a piece of night paper with a tail that points at Gloam's mouth.
 * On wide screens it floats beside Gloam's head; on narrow ones it sits under Gloam, tail pointing up.
 */
/** A ref that tells the game where a block of words starts (Gloam stands above it): see useWordsTop */
type WordsRef = (el: HTMLElement | null) => (() => void) | undefined;

function SpeechPanel({ gloam, wide, children, seed, floorAt }: { gloam: GloamBox | null; wide: boolean; children: ReactNode; seed: string; floorAt?: number | null }) {
  const calm = useCalmMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [tailTo, setTailTo] = useState<{ x: number; y: number } | undefined>();
  const mouth = gloam ? { x: gloam.cx + gloam.w * (wide ? 0.4 : 0), y: gloam.top + gloam.h * (wide ? 0.62 : 0.86) } : null;

  // Where the panel goes: beside Gloam's head (wide), or below Gloam (narrow). Long lines or bigger text
  // make it taller: then it slides up (never under the top bar), so it never runs under the teach box.
  const [height, setHeight] = useState(0);
  // the panel stops above the teach box (measured: it grows with sentence starters, long drafts and bigger text)
  const rem = typeof window === "undefined" ? 16 : parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const floor = gloam ? (floorAt ?? gloam.stageH - 13.5 * rem) - 16 : 0;
  const place =
    gloam && wide
      ? {
          left: Math.min(gloam.cx + gloam.w * 0.5 + 28, gloam.stageW - Math.min(gloam.stageW * 0.4, 600) - 24),
          top: Math.max(84, Math.min(gloam.top + gloam.h * 0.12, floor - height)),
          maxHeight: Math.max(160, floor - 84),
        }
      : null;
  const body = useRef<HTMLDivElement>(null);
  const [scrolls, setScrolls] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setHeight(el.offsetHeight);
      const b = body.current;
      setScrolls(!!b && b.scrollHeight > b.clientHeight + 2);
    });
    ro.observe(el);
    if (body.current) ro.observe(body.current);
    return () => ro.disconnect();
  }, []);

  // Re-aim the tail whenever Gloam moves, or the panel moves or changes size
  const mx = mouth?.x;
  const my = mouth?.y;
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || mx === undefined || my === undefined) return;
    const aim = () => {
      const r = el.getBoundingClientRect();
      const next = { x: Math.round(mx - r.left), y: Math.round(my - r.top) };
      setTailTo((t) => (t && t.x === next.x && t.y === next.y ? t : next));
    };
    aim();
    const ro = new ResizeObserver(aim);
    ro.observe(el);
    if (el.parentElement) ro.observe(el.parentElement);
    window.addEventListener("resize", aim);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", aim);
    };
  }, [mx, my]);

  return (
    <motion.div
      ref={ref}
      data-near-gloam
      className={place ? "absolute z-20 flex w-[min(28rem,40vw)] flex-col" : "relative flex max-h-[38dvh] flex-col"}
      style={place ?? undefined}
      initial={calm ? false : { opacity: 0, scale: 0.96, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
    >
      {/* only scrolls in an extreme case (the biggest text on a short screen): never hidden, and then the keyboard can scroll it too */}
      <Sheet seed={seed} className="flex min-h-0 flex-col px-5 py-4 sm:px-6" bodyClassName="min-h-0 overflow-y-auto" bodyRef={body} bodyTabIndex={scrolls ? 0 : undefined} tailTo={tailTo}>
        {children}
      </Sheet>
    </motion.div>
  );
}

function GloamName({ style, line }: { style: AgeStyle; line?: string }) {
  // read-aloud, when the student wants it (Ways to play), and only with a private voice (the laptop's or this device's)
  const wanted = useAccess(style).readAloud !== "off";
  const voiced = useCanReadAloud(style.language ?? "en");
  // leaving the screen stops reading
  useEffect(() => () => stopReading(), []);
  const show = wanted && voiced && !!line;
  return (
    // the bubble's tail already shows who's talking, so the name is only for screen readers
    <span className={show ? "-mt-1 mb-1 flex justify-end" : "contents"}>
      <span className="sr-only">{style.copy.gloamName}: </span>
      {show && <ReadAloudButton style={style} text={line} />}
    </span>
  );
}

/**
 * Teaching: Gloam's speech panel (its line, or what it's thinking), your last line tucked underneath,
 * and Gloam's notebook at the bottom, where you write. The full conversation lives in Gloam's journal.
 */
export function DialogueBand({
  s,
  style,
  gloam,
  wide,
  onOpenLog,
  wordsRef,
  dockTop,
}: {
  s: TeachSession;
  style: AgeStyle;
  gloam: GloamBox | null;
  wide: boolean;
  onOpenLog: () => void;
  wordsRef?: WordsRef;
  /** where the teach box starts (px): the speech panel stays above it */
  dockTop?: number | null;
}) {
  const calm = useCalmMotion();
  const [draft, setDraft] = useState("");
  const input = useRef<HTMLTextAreaElement>(null);
  const lastGloam = [...s.entries].reverse().find((e) => e.kind === "gloam");
  const lastIndex = lastGloam ? s.entries.indexOf(lastGloam) : -1;
  const lastStudent = [...s.entries].reverse().find((e) => e.kind === "student");
  const studentAfterGloam = lastStudent && s.entries.indexOf(lastStudent) > lastIndex;
  const neverTaught = !s.entries.some((e) => e.kind === "student");
  const canSend = s.status === "ready" && !s.moment;
  const ready = canSend && draft.trim().length > 0;
  const access = useAccess(style);
  const lang = style.language ?? "en";
  const voiceReady = useVoiceReady(lang);
  const showMic = access.voice && voiceReady === true;
  // the little kids' mic is big and comes first: talking is their main way in
  const bigMic = style.id === "little";
  const heard = (text: string) => {
    setDraft((d) => (d.trim() ? `${d.trimEnd()} ${text}` : text));
    input.current?.focus();
  };

  // "Every line": Gloam's new lines are read aloud by themselves
  const autoRead = access.readAloud === "auto" && lastGloam?.kind === "gloam" && lastGloam.fresh ? lastGloam : null;
  useEffect(() => {
    if (autoRead) readAloud(autoRead.text, style);
  }, [autoRead, style]);

  // Grow with the text, up to about 4 lines
  useEffect(() => {
    const el = input.current;
    if (!el) return;
    el.style.height = "auto";
    // about 4 lines, at whatever text size the student picked
    const line = parseFloat(getComputedStyle(el).lineHeight) || 24;
    el.style.height = `${Math.min(el.scrollHeight, line * 4 + 20)}px`;
  }, [draft]);

  // Put the cursor where the student teaches when the notebook appears
  useEffect(() => {
    input.current?.focus({ preventScroll: true });
  }, []);

  // How much of the draft arrived by pasting (own words light candles; pasted ones don't)
  const pastedChars = useRef(0);
  const send = () => {
    const pasted = pastedChars.current >= 80 && pastedChars.current >= draft.trim().length * 0.6;
    if (ready && s.teach(draft, pasted)) {
      setDraft("");
      pastedChars.current = 0;
    }
  };

  const speech = (
    <div aria-live="polite">
      <GloamName style={style} line={s.status === "ready" && lastGloam?.kind === "gloam" ? lastGloam.text : undefined} />
      {s.status === "paused" ? (
        <div role="status">
          <p className="text-sm font-bold text-ink">{style.copy.home.paused}</p>
          <InkButton onClick={s.retry} className="mt-3">
            {style.copy.retry}
          </InkButton>
        </div>
      ) : s.status === "offline" ? (
        <div role="alert">
          <p className="text-sm font-bold text-ink">{style.copy.offlineTitle}</p>
          <p className="mt-1 text-sm text-ink-dim">{s.offlineTries ? style.copy.offlineRetryBody(s.offlineTries) : style.copy.offlineBody}</p>
          <InkButton onClick={s.retry} className="mt-3">
            {style.copy.retry}
          </InkButton>
        </div>
      ) : s.status === "thinking" && s.thinking ? (
        <p className="voice text-md text-ink-dim" style={{ ["--casual" as string]: 0.6, ["--slant" as string]: -6 }}>
          {s.thinking}
          <span className="ml-1 inline-block w-[0.6ch]" style={{ animation: calm ? undefined : "caret 1s steps(1) infinite" }}>
            _
          </span>
        </p>
      ) : lastGloam?.kind === "gloam" ? (
        <TypedLine key={lastGloam.id} text={lastGloam.text} shape={POSES[lastGloam.emotion].bounce} animate={lastGloam.fresh} className="text-md text-ink" />
      ) : null}
      {/* what you just said, tucked under Gloam's line like a note */}
      <AnimatePresence initial={false}>
        {studentAfterGloam && lastStudent?.kind === "student" && (
          <motion.p
            key={lastStudent.id}
            initial={calm ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-3 line-clamp-2 border-t border-dashed border-line pt-2 text-xs text-ink-dim"
          >
            <span className="mr-1.5 font-bold">{style.copy.you}:</span>
            {lastStudent.text}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <>
      {wide && gloam && (
        <SpeechPanel gloam={gloam} wide seed="speech" floorAt={dockTop}>
          {speech}
        </SpeechPanel>
      )}
      <div className="absolute inset-x-0 bottom-0 z-20 bg-[linear-gradient(0deg,rgb(var(--t-scrim)/calc(0.92_+_var(--scrim-boost)))_0%,rgb(var(--t-scrim)/calc(0.7_+_var(--scrim-boost)))_55%,transparent_100%)] pt-10">
        <div ref={wordsRef} className="mx-auto flex max-w-[860px] flex-col gap-4 px-4 pb-4 sm:px-8 md:pb-6">
          {!wide && <SpeechPanel gloam={gloam} wide={false} seed="speech-narrow">{speech}</SpeechPanel>}

          {style.input.modes.includes("choices") && (
            // one row that scrolls sideways on phones, so the starters never push the speech over Gloam
            <div
              className="-mx-4 mb-2 flex items-center gap-2 overflow-x-auto px-4 py-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
              role="group"
              aria-label={style.copy.startersLabel}
            >
              <span className="shrink-0 text-xs font-bold text-ink-dim">{style.copy.startersLabel}</span>
              {style.copy.starters.map((st) => (
                <button
                  key={st}
                  type="button"
                  disabled={!canSend}
                  onClick={() => {
                    // "I think…" starts the sentence; the student carries on after it
                    const start = st.replace(/…$/, "").replace(/\s*$/, " ");
                    setDraft((d) => (d.trim() ? `${d.trimEnd()} ${start}` : start));
                    input.current?.focus();
                  }}
                  className="min-h-11 shrink-0 cursor-pointer rounded-full border border-line bg-panel px-4 text-sm font-bold text-ink hover:bg-chip disabled:cursor-default disabled:opacity-50"
                >
                  {st}
                </button>
              ))}
            </div>
          )}

          {/* Gloam's notebook: where you teach */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <label htmlFor="teach" className="sr-only">
              {style.copy.inputLabel}
            </label>
            <Sheet seed="notebook" tone="slate" radius={16} className="px-4 py-2.5 focus-within:[--t-line:var(--t-focus)]">
              {/* on a narrow screen with big text, the buttons wrap under the box instead of squeezing it */}
              <div className="flex flex-wrap items-end justify-end gap-3">
                {showMic && bigMic && <MicButton style={style} onText={heard} disabled={!canSend} big />}
                <textarea
                  id="teach"
                  ref={input}
                  rows={1}
                  value={draft}
                  maxLength={MAX}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    if (!e.target.value.trim()) pastedChars.current = 0;
                    s.typed();
                  }}
                  onPaste={(e) => {
                    pastedChars.current += e.clipboardData.getData("text").length;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder={style.copy.inputPlaceholder}
                  className="min-h-11 min-w-[min(100%,11rem)] flex-1 resize-none bg-transparent py-2.5 text-sm text-ink caret-[var(--t-moon,var(--t-focus))] placeholder:text-ink-dim focus:outline-none"
                  style={{ outline: "none" }}
                />
                {showMic && !bigMic && <MicButton style={style} onText={heard} disabled={!canSend} />}
                <InkButton type="submit" disabled={!ready}>
                  {style.copy.sendButton}
                </InkButton>
              </div>
            </Sheet>
            <div className="mt-2 flex items-center justify-between gap-3 px-1 text-xs text-ink-dim">
              <span>{neverTaught ? style.copy.firstHint : style.copy.inputHint}</span>
              <span className="flex shrink-0 items-center gap-3">
                {draft.length > MAX - 80 && <span>{style.copy.charsLeft(MAX - draft.length)}</span>}
                <InkButton type="button" variant="ghost" onClick={onOpenLog} className="!px-2 !text-xs">
                  {style.copy.log}
                </InkButton>
              </span>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

/** The intro, in Gloam's speech panel: Gloam explains your job, one line at a time. */
export function IntroBand({
  s,
  style,
  steps,
  gloam,
  wide,
  wordsRef,
}: {
  s: TeachSession;
  style: AgeStyle;
  steps: { mood: string; text: string }[];
  gloam: GloamBox | null;
  wide: boolean;
  wordsRef?: WordsRef;
}) {
  const [i, setI] = useState(0);
  const next = useRef<HTMLButtonElement>(null);
  const last = i === steps.length - 1;
  const { setEmotion, finishIntro } = s;

  useEffect(() => {
    setEmotion(steps[i].mood as Parameters<typeof setEmotion>[0]);
    next.current?.focus({ preventScroll: true });
  }, [i, steps, setEmotion]);

  // "Every line" read-aloud covers the intro too
  const auto = useAccess(style).readAloud === "auto";
  useEffect(() => {
    if (auto) readAloud(steps[i].text, style);
  }, [auto, i, steps, style]);

  const panel = (
    <SpeechPanel gloam={gloam} wide={wide} seed="intro">
      <div aria-live="polite" className="min-h-[4.2em]">
        <GloamName style={style} line={steps[i].text} />
        <TypedLine key={i} text={steps[i].text} shape={POSES[steps[i].mood as keyof typeof POSES]?.bounce ?? 20} animate className="text-md text-ink" />
      </div>
      <div className="mt-4 flex items-center gap-2">
        <InkButton ref={next} onClick={() => (last ? finishIntro() : setI(i + 1))}>
          {last ? style.copy.introDone : style.copy.introNext}
        </InkButton>
        {!last && (
          <InkButton variant="ghost" onClick={finishIntro}>
            {style.copy.introSkip}
          </InkButton>
        )}
        <span className="ml-auto flex gap-1.5" role="img" aria-label={style.copy.introPart(i + 1, steps.length)}>
          {steps.map((_, n) => (
            <span key={n} className={`h-1.5 rounded-full transition-[width,background-color] duration-300 ${n === i ? "w-5 bg-[var(--t-moon,var(--t-ink))]" : n < i ? "w-2 bg-ink-dim" : "w-2 bg-line"}`} />
          ))}
        </span>
      </div>
    </SpeechPanel>
  );

  return wide && gloam ? (
    panel
  ) : (
    <div className="absolute inset-x-0 bottom-0 z-20 bg-[linear-gradient(0deg,rgb(var(--t-scrim)/calc(0.92_+_var(--scrim-boost)))_0%,rgb(var(--t-scrim)/calc(0.7_+_var(--scrim-boost)))_55%,transparent_100%)] px-4 pt-10 pb-5">
      <div ref={wordsRef}>{panel}</div>
    </div>
  );
}
