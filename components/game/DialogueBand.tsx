"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { POSES } from "@/components/gloam/poses";
import type { AgeStyle } from "@/lib/age-styles";
import { useCalmMotion } from "@/lib/useCalmMotion";
import { TypedLine } from "./TypedLine";
import type { TeachSession } from "./useTeachSession";

const MAX = 500;

/**
 * The dialogue band at the bottom, like a story game: your last line, Gloam's line, then where you type.
 * The full conversation lives in the log (one click away), so this stays calm and readable.
 */
export function DialogueBand({ s, style, onOpenLog }: { s: TeachSession; style: AgeStyle; onOpenLog: () => void }) {
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

  // Put the cursor where the student teaches when the band appears
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

  return (
    <div className="absolute inset-x-0 bottom-0 z-20 bg-[linear-gradient(0deg,rgb(3_7_5/0.97)_0%,rgb(3_7_5/0.9)_58%,rgb(3_7_5/0.55)_80%,transparent_100%)] pt-16">
      <div className="mx-auto flex max-w-[880px] flex-col gap-3 px-4 pb-4 sm:px-8 md:pb-6">
        {/* what you just said */}
        <AnimatePresence initial={false}>
          {studentAfterGloam && lastStudent?.kind === "student" && (
            <motion.p
              key={lastStudent.id}
              initial={calm ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="line-clamp-2 text-sm text-ink-dim"
            >
              <span className="mr-2 font-bold text-ink-dim">{style.copy.you}</span>
              {lastStudent.text}
            </motion.p>
          )}
        </AnimatePresence>

        {/* what Gloam says (or is thinking) */}
        <div className="min-h-[3.2em]" aria-live="polite">
          <span className="voice mb-1 block text-xs font-bold text-accent" style={{ ["--voice-width" as string]: 100 }}>
            {style.copy.gloamName}
          </span>
          {s.status === "offline" ? (
            <div role="alert">
              <p className="text-sm font-bold text-ink">{style.copy.offlineTitle}</p>
              <p className="mt-1 text-sm text-ink-dim">{s.offlineTries ? style.copy.offlineRetryBody(s.offlineTries) : style.copy.offlineBody}</p>
              <button type="button" onClick={s.retry} className="mt-3 min-h-11 cursor-pointer rounded-md bg-accent px-4 text-sm font-bold text-accent-ink hover:bg-accent-hover">
                {style.copy.retry}
              </button>
            </div>
          ) : s.status === "thinking" && s.thinking ? (
            <p className="voice text-md text-ink-dim" style={{ ["--voice-width" as string]: 90 }}>
              {s.thinking}
              <span className="ml-1 inline-block w-[0.6ch]" style={{ animation: calm ? undefined : "caret 1s steps(1) infinite" }}>
                _
              </span>
            </p>
          ) : lastGloam?.kind === "gloam" ? (
            <TypedLine key={lastGloam.id} text={lastGloam.text} shape={POSES[lastGloam.emotion].bounce} animate={lastGloam.fresh} className="text-md text-ink" />
          ) : null}
        </div>

        {/* where you teach */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <label htmlFor="teach" className="sr-only">
            {style.copy.inputLabel}
          </label>
          <div className="flex items-end gap-2 rounded-md border border-line bg-bg px-3 py-1.5 focus-within:border-[var(--t-focus)]">
            <span aria-hidden="true" className="voice pb-2.5 text-md text-accent">
              &gt;
            </span>
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
              className="min-h-11 flex-1 resize-none bg-transparent py-2.5 text-sm text-ink placeholder:text-ink-dim focus:outline-none"
              style={{ outline: "none" }}
            />
            <button
              type="submit"
              disabled={!ready}
              className="mb-0.5 h-10 shrink-0 cursor-pointer rounded-md bg-accent px-5 text-sm font-bold text-accent-ink transition-[transform,background-color,opacity] duration-150 hover:bg-accent-hover active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {style.copy.sendButton}
            </button>
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-3 text-xs text-ink-dim">
            <span>{neverTaught ? style.copy.firstHint : style.copy.inputHint}</span>
            <span className="flex shrink-0 items-center gap-3">
              {draft.length > MAX - 80 && <span>{style.copy.charsLeft(MAX - draft.length)}</span>}
              <button type="button" onClick={onOpenLog} className="min-h-8 cursor-pointer rounded-sm px-1 font-bold text-ink-dim underline-offset-4 hover:text-ink hover:underline">
                {style.copy.log}
              </button>
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}

/** The intro, in the same dialogue band: Gloam explains your job, one line at a time. */
export function IntroBand({ s, style, steps }: { s: TeachSession; style: AgeStyle; steps: { mood: string; text: string }[] }) {
  const [i, setI] = useState(0);
  const next = useRef<HTMLButtonElement>(null);
  const last = i === steps.length - 1;
  const { setEmotion, finishIntro } = s;

  useEffect(() => {
    setEmotion(steps[i].mood as Parameters<typeof setEmotion>[0]);
    next.current?.focus({ preventScroll: true });
  }, [i, steps, setEmotion]);

  return (
    <div className="absolute inset-x-0 bottom-0 z-20 bg-[linear-gradient(0deg,rgb(3_7_5/0.97)_0%,rgb(3_7_5/0.9)_58%,rgb(3_7_5/0.55)_80%,transparent_100%)] pt-16">
      <div className="mx-auto flex max-w-[880px] flex-col gap-4 px-4 pb-6 sm:px-8">
        <div className="min-h-[4.5em]" aria-live="polite">
          <span className="voice mb-1 block text-xs font-bold text-accent">{style.copy.gloamName}</span>
          <TypedLine key={i} text={steps[i].text} shape={POSES[steps[i].mood as keyof typeof POSES]?.bounce ?? 20} animate className="text-md text-ink" />
        </div>
        <div className="flex items-center gap-3">
          <button
            ref={next}
            type="button"
            onClick={() => (last ? finishIntro() : setI(i + 1))}
            className="min-h-11 cursor-pointer rounded-md bg-accent px-5 text-sm font-bold text-accent-ink hover:bg-accent-hover active:scale-95"
          >
            {last ? style.copy.introDone : style.copy.introNext}
          </button>
          {!last && (
            <button type="button" onClick={finishIntro} className="min-h-11 cursor-pointer rounded-md px-3 text-sm font-bold text-ink-dim underline-offset-4 hover:text-ink hover:underline">
              {style.copy.introSkip}
            </button>
          )}
          <span className="ml-auto flex gap-1.5" aria-label={`Part ${i + 1} of ${steps.length}`}>
            {steps.map((_, n) => (
              <span key={n} className={`h-1.5 w-5 rounded-full ${n <= i ? "bg-ink" : "bg-line"}`} />
            ))}
          </span>
        </div>
      </div>
    </div>
  );
}
