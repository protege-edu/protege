"use client";

import { useCalmMotion } from "@/lib/useCalmMotion";
import gsap from "gsap";

import { useEffect, useLayoutEffect, useRef } from "react";

export interface Moment {
  key: number;
  conceptName: string;
  /** "full" for the first idea and the finale, "short" for the rest */
  size: "full" | "short";
  /** every candle is lit: the finale */
  final: boolean;
}

/**
 * The "I GET IT" moment. One choreographed sequence, timed so every part lands on the beat:
 *   dim the valley → light bursts from the lantern → "OHHHH." → candle lights (onPeak) → credit to the student → back to normal
 * The short version skips the dimming and holds for less time. Both can be skipped.
 * With reduced motion: no movement, just the words and the light changing.
 */
export function EurekaMoment({ moment, onPeak, onDone }: { moment: Moment | null; onPeak: () => void; onDone: () => void }) {
  const reduced = useCalmMotion();
  const root = useRef<HTMLDivElement>(null);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const peak = useRef(onPeak);
  const done = useRef(onDone);
  useLayoutEffect(() => {
    peak.current = onPeak;
    done.current = onDone;
  });

  useLayoutEffect(() => {
    if (!moment || !root.current) return;
    const full = moment.size === "full";
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ onComplete: () => done.current() });
      timeline.current = tl;
      if (reduced) {
        tl.set(".em-dim", { opacity: full ? 0.5 : 0.25 })
          .set([".em-word", ".em-credit"], { opacity: 1 })
          .call(() => peak.current())
          .to({}, { duration: moment.final ? 3.4 : full ? 2.2 : 1.4 })
          .set([".em-dim", ".em-word", ".em-credit"], { opacity: 0 });
        return;
      }
      tl.set(".em-ring", { scale: 0, opacity: 0 })
        .set(".em-word", { opacity: 0, scale: 0.6, y: 20, "--bounce": 0 })
        .set(".em-credit", { opacity: 0, y: 10 })
        // 1. the world holds its breath (full only)
        .to(".em-dim", { opacity: full ? 0.62 : 0.2, duration: full ? 0.35 : 0.15, ease: "power2.out" })
        // 2. the lantern bursts
        .to(".em-ring", { opacity: 1, duration: 0.05 }, full ? "+=0.15" : "+=0")
        .call(() => peak.current())
        .to(".em-ring", { scale: moment.final ? 16 : full ? 9 : 5, opacity: 0, duration: full ? 1.1 : 0.8, ease: "expo.out", stagger: 0.12 }, "<")
        // 3. the word
        .to(".em-word", { opacity: 1, scale: 1, y: 0, duration: full ? 0.55 : 0.4, ease: "back.out(2.2)" }, "<0.1")
        .to(".em-word", { "--bounce": 100, duration: 0.6, ease: "sine.inOut", yoyo: true, repeat: 1 }, "<")
        // 4. the credit goes to the teacher (the student)
        .to(".em-credit", { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }, "-=0.5")
        .to({}, { duration: moment.final ? 2.4 : full ? 1.1 : 0.5 })
        // 5. let the light stay, lift the dark
        .to([".em-word", ".em-credit"], { opacity: 0, y: -12, duration: 0.35, ease: "power2.in" })
        .to(".em-dim", { opacity: 0, duration: 0.5, ease: "power2.inOut" }, "<0.1");
    }, root);
    return () => {
      timeline.current = null;
      ctx.revert();
    };
  }, [moment, reduced]);

  // Skip with Escape (the button works too). Jumping to the end still lights the candle.
  useEffect(() => {
    if (!moment) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && timeline.current?.progress(1);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moment]);

  if (!moment) return null;
  const full = moment.size === "full";
  return (
    <div ref={root} className="absolute inset-0 z-10 overflow-hidden">
      <div className="em-dim absolute inset-0 bg-soot opacity-0" />
      <div className="absolute top-[30%] left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="em-ring absolute -top-10 -left-10 h-20 w-20 rounded-full border-[6px] border-lantern opacity-0" />
        <div className="em-ring absolute -top-10 -left-10 h-20 w-20 rounded-full border-[3px] border-lantern opacity-0" />
      </div>
      <div className="pointer-events-none absolute inset-x-4 top-[12%] flex flex-col items-center text-center" aria-live="assertive">
        <p className={`em-word voice font-bold text-lantern opacity-0 ${full ? "text-2xl" : "text-xl"}`}>
          {moment.final ? "THE WHOLE VALLEY!" : full ? "OHHHH." : "Ooh!"}
        </p>
        <p className="em-credit mt-3 rounded-md bg-soot/60 px-3 py-1 text-md font-bold text-mist opacity-0">
          {moment.final ? "You taught Gloam every idea. That's all you." : `You taught Gloam: ${moment.conceptName.toLowerCase()}`}
        </p>
      </div>
      <button
        type="button"
        onClick={() => timeline.current?.progress(1)}
        className="absolute top-3 right-3 min-h-11 cursor-pointer rounded-md bg-soot/70 px-4 text-xs font-bold text-mist hover:bg-soot"
      >
        Skip
      </button>
    </div>
  );
}
