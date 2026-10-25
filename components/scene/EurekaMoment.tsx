"use client";

import gsap from "gsap";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import type { AgeStyle } from "@/lib/age-styles";
import { useCalmMotion } from "@/lib/useCalmMotion";

export interface Moment {
  key: number;
  conceptName: string;
  /** "full" for the first idea and the finale, "short" for the rest */
  size: "full" | "short";
  /** every candle is lit: the finale */
  final: boolean;
}

/**
 * The "I get it" moment. One choreographed sequence, timed so every part lands on the beat:
 *   the world dims → light blooms out of the lantern → the word → candle lights (onPeak) → credit to the student → settle
 * The age style decides the energy: "big" for young kids, "understated" (witty, quieter) for high school.
 * The short version is quicker. Both can be skipped. With reduced motion: no movement, just words and light.
 *
 * `x` is where Gloam stands across the stage (0..1), so the light comes from its lantern.
 */
export function EurekaMoment({ moment, style, x = 0.5, onPeak, onDone }: { moment: Moment | null; style: AgeStyle; x?: number; onPeak: () => void; onDone: () => void }) {
  const calm = useCalmMotion();
  const root = useRef<HTMLDivElement>(null);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const peak = useRef(onPeak);
  const done = useRef(onDone);
  useLayoutEffect(() => {
    peak.current = onPeak;
    done.current = onDone;
  });
  const quiet = style.celebrate.style === "understated";
  const sparks = useMemo(() => Array.from({ length: style.celebrate.particles }, (_, i) => i), [style.celebrate.particles]);

  useLayoutEffect(() => {
    if (!moment || !root.current) return;
    const full = moment.size === "full";
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ onComplete: () => done.current() });
      timeline.current = tl;
      if (calm) {
        tl.set(".em-dim", { opacity: full ? 0.45 : 0.2 })
          .set([".em-word", ".em-credit"], { opacity: 1 })
          .call(() => peak.current())
          .to({}, { duration: moment.final ? 3.4 : full ? 2.2 : 1.5 })
          .set([".em-dim", ".em-word", ".em-credit"], { opacity: 0 });
        return;
      }
      const dim = full ? (quiet ? 0.5 : 0.62) : quiet ? 0.18 : 0.25;
      tl.set(".em-bar", { scaleY: 0 })
        .set(".em-bloom", { scale: 0.2, opacity: 0 })
        .set(".em-ring", { scale: 0, opacity: 0 })
        .set(".em-word", { opacity: 0, y: quiet ? 8 : 20, scale: quiet ? 1 : 0.6, "--bounce": 0, "--voice-width": 85 })
        .set(".em-credit", { opacity: 0, y: 10 })
        .set(".em-spark", { opacity: 0, x: 0, y: 0 })
        // 1. the world holds its breath
        .to(".em-dim", { opacity: dim, duration: full ? 0.45 : 0.18, ease: "power2.out" })
        // big moments get cinema letterbox bars
        .to(".em-bar", { scaleY: full ? 1 : 0, duration: 0.5, ease: "power3.out" }, "<")
        // 2. light blooms out of the lantern
        .to(".em-bloom", { opacity: 1, scale: 1, duration: 0.25, ease: "power2.out" }, full ? "+=0.2" : "+=0")
        .call(() => peak.current())
        .to(".em-ring", { opacity: quiet ? 0.55 : 1, duration: 0.05 }, "<")
        .to(".em-ring", { scale: moment.final ? 18 : full ? 10 : 6, opacity: 0, duration: full ? 1.3 : 0.9, ease: "expo.out", stagger: 0.14 }, "<")
        .to(".em-bloom", { scale: moment.final ? 6 : 3, opacity: 0, duration: full ? 1.6 : 1, ease: "power2.out" }, "<0.1")
        // sparks drift up out of the light
        .to(
          ".em-spark",
          {
            opacity: 1,
            duration: 0.15,
            stagger: { each: 0.012, from: "random" },
          },
          "<",
        )
        .to(
          ".em-spark",
          {
            x: () => gsap.utils.random(-140, 140),
            y: () => gsap.utils.random(-220, -40),
            opacity: 0,
            duration: () => gsap.utils.random(1, 1.8),
            ease: "power1.out",
            stagger: { each: 0.012, from: "random" },
          },
          "<0.05",
        )
        // 3. the word
        .to(".em-word", { opacity: 1, y: 0, scale: 1, duration: quiet ? 0.6 : 0.55, ease: quiet ? "power3.out" : "back.out(2.2)" }, "<0.1")
        .to(".em-word", quiet ? { "--voice-width": 112, duration: 0.9, ease: "power2.out" } : { "--bounce": 100, duration: 0.6, ease: "sine.inOut", yoyo: true, repeat: 1 }, "<")
        // 4. the credit goes to the teacher: the student
        .to(".em-credit", { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }, "-=0.4")
        .to({}, { duration: moment.final ? 2.6 : full ? 1.2 : 0.6 })
        // 5. keep the new light, lift the dark
        .to([".em-word", ".em-credit"], { opacity: 0, y: -10, duration: 0.4, ease: "power2.in" })
        .to(".em-dim", { opacity: 0, duration: 0.7, ease: "power2.inOut" }, "<0.1")
        .to(".em-bar", { scaleY: 0, duration: 0.6, ease: "power3.inOut" }, "<");
    }, root);
    return () => {
      timeline.current = null;
      ctx.revert();
    };
  }, [moment, calm, quiet]);

  // Skip with Escape (the button works too). Jumping to the end still lights the candle.
  useEffect(() => {
    if (!moment) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && timeline.current?.progress(1);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moment]);

  if (!moment) return null;
  const full = moment.size === "full";
  const word = moment.final ? style.copy.finaleWord : style.copy.eurekaWord;
  return (
    <div ref={root} className="absolute inset-0 z-30 overflow-hidden">
      <div className="em-dim absolute inset-0 bg-[#030705] opacity-0" />
      <div className="em-bar absolute inset-x-0 top-0 h-[9vh] origin-top scale-y-0 bg-black" />
      <div className="em-bar absolute inset-x-0 bottom-0 h-[9vh] origin-bottom scale-y-0 bg-black" />
      {/* the light, centred on Gloam's lantern */}
      <div className="absolute top-[30%]" style={{ left: `${x * 100}%` }}>
        <div className="em-bloom absolute -top-40 -left-40 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgb(255_217_138/0.85)_0%,rgb(244_183_64/0.35)_35%,transparent_70%)] opacity-0" />
        <div className={`em-ring absolute -top-10 -left-10 h-20 w-20 rounded-full border-lantern opacity-0 ${quiet ? "border-[1.5px]" : "border-[3px]"}`} />
        {!quiet && <div className="em-ring absolute -top-10 -left-10 h-20 w-20 rounded-full border border-lantern opacity-0" />}
        {sparks.map((i) => (
          <span key={i} className="em-spark absolute h-1 w-1 rounded-full bg-[#ffd98a] opacity-0" style={{ left: (i % 7) * 3 - 9, top: (i % 5) * 3 - 6 }} />
        ))}
      </div>
      <div className="pointer-events-none absolute inset-x-4 top-[9%] flex flex-col items-center text-center" aria-live="assertive">
        <p className={`em-word voice font-bold text-lantern opacity-0 ${full || !quiet ? "text-2xl" : "text-xl"} [text-shadow:0_2px_24px_rgb(0_0_0/0.6)]`}>{word}</p>
        <p className="em-credit mt-3 rounded-md bg-[#030705]/70 px-3 py-1.5 text-sm font-bold text-[#ebe7dc] opacity-0">
          {moment.final ? style.copy.finaleCredit : style.copy.credit(moment.conceptName)}
        </p>
      </div>
      <button
        type="button"
        onClick={() => timeline.current?.progress(1)}
        className="absolute right-3 bottom-3 min-h-11 cursor-pointer rounded-md bg-[#030705]/70 px-4 text-xs font-bold text-[#ebe7dc] hover:bg-[#030705]"
      >
        {style.copy.skip}
      </button>
    </div>
  );
}
