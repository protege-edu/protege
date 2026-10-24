"use client";

import { useCalmMotion } from "@/lib/useCalmMotion";
import { motion } from "motion/react";

/**
 * Something Gloam says, in its own handwriting.
 * The words pop in one at a time (like it's talking), and the letters are as bouncy
 * as Gloam's mood: the Shantell Sans BNCE axis goes from flat (confused) to wild (eureka).
 */
export function GloamLine({ text, bounce, animate, current, big = false }: { text: string; bounce: number; animate: boolean; current: boolean; big?: boolean }) {
  const reduced = useCalmMotion();
  const words = text.split(/\s+/);
  const play = animate && !reduced;

  return (
    <p
      className={`voice ${big ? "text-lg" : "text-md"} text-moss transition-opacity duration-500 ${current ? "opacity-100" : "opacity-70"}`}
      style={{ ["--bounce" as string]: bounce, ["--informal" as string]: 60 }}
    >
      {play
        ? words.map((w, i) => (
            <motion.span
              key={i}
              className="inline-block whitespace-pre"
              initial={{ opacity: 0, y: 6, rotate: -4 }}
              animate={{ opacity: 1, y: 0, rotate: 0 }}
              transition={{ delay: i * 0.045, type: "spring", stiffness: 500, damping: 22 }}
            >
              {w + (i < words.length - 1 ? " " : "")}
            </motion.span>
          ))
        : text}
    </p>
  );
}
