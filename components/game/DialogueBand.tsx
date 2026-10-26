"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { POSES } from "@/components/gloam/poses";
import { InkButton } from "@/components/ui/InkButton";
import { Sheet } from "@/components/ui/Sheet";
import type { AgeStyle } from "@/lib/age-styles";
import { useCalmMotion } from "@/lib/useCalmMotion";
import type { GloamBox } from "./Stage";
import { TypedLine } from "./TypedLine";
import type { TeachSession } from "./useTeachSession";

const MAX = 500;

/**
 * Gloam's speech panel: a piece of night paper with a tail that points at Gloam's mouth.
 * On wide screens it floats beside Gloam's head; on narrow ones it sits under Gloam, tail pointing up.
 */
function SpeechPanel({ gloam, wide, children, seed }: { gloam: GloamBox | null; wide: boolean; children: ReactNode; seed: string }) {
  const calm = useCalmMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [tailTo, setTailTo] = useState<{ x: number; y: number } | undefined>();
  const mouth = gloam ? { x: gloam.cx + gloam.w * (wide ? 0.4 : 0), y: gloam.top + gloam.h * (wide ? 0.62 : 0.86) } : null;

  // Where the panel goes: beside Gloam's head (wide), or below Gloam (narrow)
  const place = gloam && wide ? { left: Math.min(gloam.cx + gloam.w * 0.5 + 28, gloam.stageW - 460), top: Math.max(84, gloam.top + gloam.h * 0.12) } : null;

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
      className={place ? "absolute z-20 w-[min(440px,36vw)]" : "relative"}
      style={place ?? undefined}
      initial={calm ? false : { opacity: 0, scale: 0.96, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
    >
      <Sheet seed={seed} className="px-5 py-4 sm:px-6" tailTo={tailTo}>
        {children}
      </Sheet>
    </motion.div>
  );
}

function GloamName({ style }: { style: AgeStyle }) {
  return (
    <span className="voice mb-1 block text-xs text-accent" style={{ ["--casual" as string]: 1, ["--voice-weight" as string]: 750 }}>
      {style.copy.gloamName}
    </span>
  );
}

/**
 * Teaching: Gloam's speech panel (its line, or what it's thinking), your last line tucked underneath,
 * and Gloam's notebook at the bottom, where you write. The full conversation lives in Gloam's journal.
 */
export function DialogueBand({ s, style, gloam, wide, onOpenLog }: { s: TeachSession; style: AgeStyle; gloam: GloamBox | null; wide: boolean; onOpenLog: () => void }) {
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

  // Grow with the text, up to about 4 lines
  useEffect(() => {
    const el = input.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
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
      <GloamName style={style} />
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
      {wide && gloam && <SpeechPanel gloam={gloam} wide seed="speech">{speech}</SpeechPanel>}
      <div className="absolute inset-x-0 bottom-0 z-20 bg-[linear-gradient(0deg,rgb(5_10_8/0.92)_0%,rgb(5_10_8/0.7)_55%,transparent_100%)] pt-10">
        <div className="mx-auto flex max-w-[860px] flex-col gap-4 px-4 pb-4 sm:px-8 md:pb-6">
          {!wide && <SpeechPanel gloam={gloam} wide={false} seed="speech-narrow">{speech}</SpeechPanel>}

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
              <div className="flex items-end gap-3">
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
                  className="min-h-11 flex-1 resize-none bg-transparent py-2.5 text-sm text-ink caret-[var(--t-moon,var(--t-focus))] placeholder:text-ink-dim focus:outline-none"
                  style={{ outline: "none" }}
                />
                <InkButton type="submit" disabled={!ready}>
                  {style.copy.sendButton}
                </InkButton>
              </div>
            </Sheet>
            <div className="mt-2 flex items-center justify-between gap-3 px-1 text-xs text-ink-dim">
              <span>{neverTaught ? style.copy.firstHint : style.copy.inputHint}</span>
              <span className="flex shrink-0 items-center gap-3">
                {draft.length > MAX - 80 && <span>{style.copy.charsLeft(MAX - draft.length)}</span>}
                <InkButton type="button" variant="ghost" onClick={onOpenLog} className="!min-h-9 !px-2 !text-xs">
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
export function IntroBand({ s, style, steps, gloam, wide }: { s: TeachSession; style: AgeStyle; steps: { mood: string; text: string }[]; gloam: GloamBox | null; wide: boolean }) {
  const [i, setI] = useState(0);
  const next = useRef<HTMLButtonElement>(null);
  const last = i === steps.length - 1;
  const { setEmotion, finishIntro } = s;

  useEffect(() => {
    setEmotion(steps[i].mood as Parameters<typeof setEmotion>[0]);
    next.current?.focus({ preventScroll: true });
  }, [i, steps, setEmotion]);

  const panel = (
    <SpeechPanel gloam={gloam} wide={wide} seed="intro">
      <div aria-live="polite" className="min-h-[4.2em]">
        <GloamName style={style} />
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
        <span className="ml-auto flex gap-1.5" role="img" aria-label={`Part ${i + 1} of ${steps.length}`}>
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
    <div className="absolute inset-x-0 bottom-0 z-20 bg-[linear-gradient(0deg,rgb(5_10_8/0.92)_0%,rgb(5_10_8/0.7)_55%,transparent_100%)] px-4 pt-10 pb-5">{panel}</div>
  );
}
