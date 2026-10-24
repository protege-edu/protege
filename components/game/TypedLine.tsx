"use client";

import { useEffect, useState } from "react";
import { useCalmMotion } from "@/lib/useCalmMotion";

/**
 * Gloam's line, typed out like game dialogue. Click (or press any key in the box) to show it all.
 * The voice font changes shape with Gloam's mood: `shape` is -40 (flat, unimpressed) to 100 (thrilled).
 * Shantell Sans bounces, Martian Mono gets wider; the CSS for the age style decides which.
 */
export function TypedLine({ text, shape, animate, className = "" }: { text: string; shape: number; animate: boolean; className?: string }) {
  const calm = useCalmMotion();
  const play = animate && !calm;
  const [shown, setShown] = useState(play ? 0 : text.length);

  useEffect(() => {
    if (!play) return;
    // Count up from wherever we are, so clicking to skip doesn't get undone by the next tick
    const t = setInterval(() => {
      setShown((prev) => {
        const next = Math.min(prev + 1, text.length);
        if (next >= text.length) clearInterval(t);
        return next;
      });
    }, 24);
    return () => clearInterval(t);
  }, [text, play]);

  const width = 88 + ((Math.max(-40, Math.min(100, shape)) + 40) / 140) * 24;
  const done = shown >= text.length;

  return (
    <p
      className={`voice ${className}`}
      style={{ ["--bounce" as string]: shape, ["--voice-width" as string]: width.toFixed(1), ["--informal" as string]: 60 }}
      onClick={() => setShown(text.length)}
    >
      {/* The full line is always there for screen readers; the typing is only visual */}
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {text.slice(0, shown)}
        {!done && <span className="opacity-0">{text.slice(shown)}</span>}
      </span>
    </p>
  );
}
