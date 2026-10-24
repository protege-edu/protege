"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { GloamLine } from "@/components/chat/GloamLine";
import { POSES, type GloamMood } from "@/components/gloam/poses";

export interface IntroStep {
  mood: GloamMood;
  text: string;
}

export function introSteps(lessonTitle: string, candleCount: number): IntroStep[] {
  return [
    { mood: "sheepish", text: "Oh! Hi. I'm Gloam. Sorry, I was asleep. I do that a lot." },
    { mood: "confused", text: "See the lantern on my head? It glows when I understand stuff. Right now it's... not glowing. At all." },
    { mood: "skeptical", text: `Today's thing is "${lessonTitle}". I already have some theories. They might be bad. They're probably bad.` },
    {
      mood: "excited",
      text: `So here's the deal: YOU teach ME. Explain things your way. Every idea I finally get lights one of the ${candleCount} candles down there.`,
    },
  ];
}

/**
 * The short, skippable intro at the start of every new session.
 * Gloam explains the student's job in its own voice. The stage shows the matching pose (onStep).
 */
export function Intro({ steps, onStep, onDone }: { steps: IntroStep[]; onStep: (mood: GloamMood) => void; onDone: () => void }) {
  const [i, setI] = useState(0);
  const reduced = useReducedMotion() ?? false;
  const next = useRef<HTMLButtonElement>(null);
  const last = i === steps.length - 1;

  useEffect(() => {
    onStep(steps[i].mood);
    next.current?.focus({ preventScroll: true });
  }, [i, steps, onStep]);

  return (
    <section aria-label="Meet Gloam" className="flex flex-col gap-8 px-5 pt-10 pb-6 sm:px-8 md:pt-[14vh]">
      <div className="min-h-40" aria-live="polite">
        <span className="mb-0.5 block text-xs font-bold text-rosehip-deep">Gloam</span>
        <AnimatePresence mode="wait">
          <motion.div key={i} exit={reduced ? undefined : { opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>
            <GloamLine text={steps[i].text} bounce={POSES[steps[i].mood].bounce} animate current big />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-3">
        <button
          ref={next}
          type="button"
          onClick={() => (last ? onDone() : setI(i + 1))}
          className="min-h-11 cursor-pointer rounded-md bg-rosehip-deep px-5 text-sm font-bold text-mist hover:bg-rosehip-ink active:scale-95"
        >
          {last ? "Okay, let's start" : "Next"}
        </button>
        {!last && (
          <button type="button" onClick={onDone} className="min-h-11 cursor-pointer rounded-md px-3 text-sm font-bold text-moss underline-offset-4 hover:underline">
            Skip intro
          </button>
        )}
        {/* progress through the intro: small paper dots, not numbers */}
        <span className="ml-auto flex gap-1.5" aria-label={`Part ${i + 1} of ${steps.length}`}>
          {steps.map((_, n) => (
            <span key={n} className={`h-2 w-2 rounded-full ${n <= i ? "bg-moss" : "bg-moss/20"}`} />
          ))}
        </span>
      </div>
    </section>
  );
}
