"use client";

import { useEffect, useState } from "react";
import { Cut } from "@/components/ui/Cut";
import type { AgeStyle } from "@/lib/age-styles";
import { useCalmMotion } from "@/lib/useCalmMotion";
import { type MicProblem, useVoiceTyping } from "@/lib/voice/client";

/**
 * Talk instead of typing: press, talk, press again. What you said lands in the box to check before
 * sending. A ring of lantern-less moonlight grows with your voice, so you can see you're being heard.
 * `big` is the little kids' version: their main way in.
 */
export function MicButton({ style, onText, disabled, big = false }: { style: AgeStyle; onText: (text: string) => void; disabled?: boolean; big?: boolean }) {
  const t = style.copy.access;
  const calm = useCalmMotion();
  const [problem, setProblem] = useState<MicProblem | null>(null);
  const mic = useVoiceTyping({
    lang: style.language ?? "en",
    onText: (text) => {
      setProblem(null);
      onText(text);
    },
    onProblem: setProblem,
  });
  // a problem message fades after a while (it's still in the screen reader's history)
  useEffect(() => {
    if (!problem) return;
    const t = setTimeout(() => setProblem(null), 8000);
    return () => clearTimeout(t);
  }, [problem]);
  const listening = mic.state === "listening";
  const working = mic.state === "working";
  const size = big ? 56 : 44;
  const label = listening ? t.micStop : t.micStart;
  const status = listening ? t.micListening : working ? t.micWorking : problem === "denied" ? t.micDenied : problem === "empty" ? t.micEmpty : problem ? t.micFailed : "";

  return (
    <span className="relative flex shrink-0 flex-col items-center">
      <button
        type="button"
        aria-label={label}
        aria-pressed={listening}
        disabled={disabled || working}
        onClick={() => {
          setProblem(null);
          if (listening) mic.stop();
          else void mic.start();
        }}
        className="group relative grid cursor-pointer place-items-center rounded-full disabled:cursor-default disabled:opacity-50"
        style={{ width: size, height: size }}
      >
        {/* how loud you are: a soft ring that swells with your voice */}
        {listening && (
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full"
            style={{
              background: "var(--t-moon, var(--t-focus))",
              opacity: 0.28,
              transform: `scale(${calm ? 1.25 : 1.1 + mic.level * 0.6})`,
              transition: calm ? undefined : "transform 70ms linear",
            }}
          />
        )}
        <Cut w={size} h={size} seed="mic" radius={size / 2} fill={listening ? "var(--t-accent)" : "var(--t-chip)"} stroke={listening ? undefined : "var(--t-line)"} />
        <svg viewBox="0 0 24 24" aria-hidden="true" className={`relative ${big ? "h-7 w-7" : "h-5 w-5"}`} style={{ color: listening ? "var(--t-accent-ink)" : "var(--t-ink)" }}>
          {listening ? (
            <rect x="7" y="7" width="10" height="10" rx="2.2" fill="currentColor" />
          ) : (
            <>
              <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" />
              <path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </>
          )}
        </svg>
      </button>
      {/* what's happening, for everyone (and read out by screen readers) */}
      <span role="status" aria-live="polite" className={status ? `pointer-events-none absolute bottom-full mb-2 ${big ? "left-0" : "right-0"} w-max max-w-[min(260px,70vw)] rounded-md border border-line bg-panel px-3 py-2 text-xs font-bold text-ink shadow-[0_6px_20px_rgb(0_0_0/0.25)]` : "sr-only"}>
        {status}
      </span>
    </span>
  );
}
