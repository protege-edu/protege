"use client";

import { useCalmMotion } from "@/lib/useCalmMotion";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";
import { GloamLine } from "./GloamLine";

export type Item =
  | { id: string; kind: "gloam"; text: string; bounce: number; fresh: boolean }
  | { id: string; kind: "student"; text: string }
  | { id: string; kind: "story"; text: string }
  | { id: string; kind: "offline"; tries?: number };

/**
 * The conversation reads like a storybook page, not a chat app:
 * Gloam's lines are handwritten, the student's are typed notes, and story beats sit between them.
 */
export function Conversation({ items, thinking, onRetry }: { items: Item[]; thinking: string | null; onRetry: () => void }) {
  const end = useRef<HTMLDivElement>(null);
  const reduced = useCalmMotion();
  const lastGloam = [...items].reverse().find((i) => i.kind === "gloam")?.id;

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "end" });
  }, [items.length, thinking, reduced]);

  return (
    <div className="flex flex-col gap-5 px-5 pt-6 pb-4 sm:px-8">
      <AnimatePresence initial={false}>
        {items.map((item) => (
          <motion.div
            key={item.id}
            layout={reduced ? false : "position"}
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            {item.kind === "gloam" && (
              <div className="max-w-[34rem]">
                <span className="mb-0.5 block text-xs font-bold text-rosehip-deep">Gloam</span>
                <GloamLine text={item.text} bounce={item.bounce} animate={item.fresh} current={item.id === lastGloam} />
              </div>
            )}
            {item.kind === "student" && (
              <div className="ml-auto max-w-[30rem] rounded-md bg-mist-dim px-4 py-3">
                <span className="mb-0.5 block text-xs font-bold text-moss/80">You</span>
                <p className="text-sm whitespace-pre-wrap text-moss">{item.text}</p>
              </div>
            )}
            {item.kind === "story" && (
              <p className="mx-auto max-w-[26rem] py-1 text-center text-xs text-moss/80">
                <span aria-hidden="true">~ </span>
                {item.text}
                <span aria-hidden="true"> ~</span>
              </p>
            )}
            {item.kind === "offline" && (
              <div role="alert" className="rounded-md border-2 border-moss px-4 py-3">
                <p className="text-sm font-bold text-moss">Gloam fell asleep. Its brain (the AI) isn&apos;t running.</p>
                <p className="mt-1 text-sm text-moss">
                  {item.tries
                    ? `Still asleep (tried ${item.tries} ${item.tries === 1 ? "time" : "times"}). Check that the Ollama app is open on the computer running Protégé, then try again.`
                    : "Ask your teacher to start Ollama on the computer running Protégé, then press Try again. Your message is saved."}
                </p>
                <button
                  type="button"
                  onClick={onRetry}
                  className="mt-3 cursor-pointer rounded-md bg-moss px-4 py-2 text-sm font-bold text-mist hover:bg-moss-deep"
                >
                  Try again
                </button>
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      {thinking && (
        <div className="max-w-[34rem]" aria-live="polite">
          <span className="mb-0.5 block text-xs font-bold text-rosehip-deep">Gloam</span>
          <motion.p
            key={thinking}
            className="voice text-md text-moss/80"
            style={{ ["--bounce" as string]: -20 }}
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {thinking}
          </motion.p>
        </div>
      )}
      <div ref={end} />
    </div>
  );
}
