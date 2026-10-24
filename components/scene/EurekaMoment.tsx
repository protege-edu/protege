"use client";

import gsap from "gsap";
import { useReducedMotion } from "motion/react";
import { useLayoutEffect, useRef } from "react";

export interface Moment {
  key: number;
  conceptName: string;
  /** every candle is lit: the finale */
  final: boolean;
}

/**
 * The "I GET IT" moment. One choreographed sequence, timed so every part lands on the beat:
 *   dim the valley → light bursts from the lantern → "OHHHH." → candle lights (onPeak) → credit to the student → back to normal
 * With reduced motion: no movement, just the words and the light changing.
 */
export function EurekaMoment({ moment, onPeak, onDone }: { moment: Moment | null; onPeak: () => void; onDone: () => void }) {
  const reduced = useReducedMotion() ?? false;
  const root = useRef<HTMLDivElement>(null);
  const peak = useRef(onPeak);
  const done = useRef(onDone);
  useLayoutEffect(() => {
    peak.current = onPeak;
    done.current = onDone;
  });

  useLayoutEffect(() => {
    if (!moment || !root.current) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ onComplete: () => done.current() });
      if (reduced) {
        tl.set(".em-dim", { opacity: 0.5 })
          .set([".em-word", ".em-credit"], { opacity: 1 })
          .call(() => peak.current())
          .to({}, { duration: moment.final ? 3.4 : 2.2 })
          .set([".em-dim", ".em-word", ".em-credit"], { opacity: 0 });
        return;
      }
      tl.set(".em-ring", { scale: 0, opacity: 0 })
        .set(".em-word", { opacity: 0, scale: 0.6, y: 20, "--bounce": 0 })
        .set(".em-credit", { opacity: 0, y: 10 })
        // 1. the world holds its breath
        .to(".em-dim", { opacity: 0.62, duration: 0.35, ease: "power2.out" })
        // 2. the lantern bursts
        .to(".em-ring", { opacity: 1, duration: 0.05 }, "+=0.15")
        .call(() => peak.current())
        .to(".em-ring", { scale: moment.final ? 16 : 9, opacity: 0, duration: 1.1, ease: "expo.out", stagger: 0.12 }, "<")
        // 3. the word
        .to(".em-word", { opacity: 1, scale: 1, y: 0, duration: 0.55, ease: "back.out(2.2)" }, "<0.1")
        .to(".em-word", { "--bounce": 100, duration: 0.6, ease: "sine.inOut", yoyo: true, repeat: 1 }, "<")
        // 4. the credit goes to the teacher (the student)
        .to(".em-credit", { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }, "-=0.5")
        .to({}, { duration: moment.final ? 2.4 : 1.1 })
        // 5. let the light stay, lift the dark
        .to([".em-word", ".em-credit"], { opacity: 0, y: -12, duration: 0.4, ease: "power2.in" })
        .to(".em-dim", { opacity: 0, duration: 0.6, ease: "power2.inOut" }, "<0.1");
    }, root);
    return () => ctx.revert();
  }, [moment, reduced]);

  if (!moment) return null;
  return (
    <div ref={root} className="pointer-events-none absolute inset-0 z-10 overflow-hidden" aria-live="assertive">
      <div className="em-dim absolute inset-0 bg-soot opacity-0" />
      <div className="absolute top-[30%] left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="em-ring absolute -top-10 -left-10 h-20 w-20 rounded-full border-[6px] border-lantern opacity-0" />
        <div className="em-ring absolute -top-10 -left-10 h-20 w-20 rounded-full border-[3px] border-lantern opacity-0" />
      </div>
      <div className="absolute inset-x-4 top-[14%] flex flex-col items-center text-center">
        <p className="em-word voice text-2xl font-bold text-lantern opacity-0">
          {moment.final ? "THE WHOLE VALLEY!" : "OHHHH."}
        </p>
        <p className="em-credit mt-3 text-md font-bold text-mist opacity-0">
          {moment.final ? "You taught Gloam every idea. That's all you." : `You taught Gloam: ${moment.conceptName.toLowerCase()}`}
        </p>
      </div>
    </div>
  );
}
