"use client";

import { useSyncExternalStore } from "react";
import { useAccess } from "@/lib/access/store";
import type { AgeStyle } from "@/lib/age-styles";
import { canReadAloud, readAloud, watchReadAloud } from "@/lib/speech";

/** Can this student hear this language read aloud: Gloam's voice from the teacher's laptop, or a voice on this device? */
export function useCanReadAloud(lang: string) {
  return useSyncExternalStore(watchReadAloud, () => canReadAloud(lang), () => false);
}

/**
 * "Read it to me": reads `text` aloud in Gloam's voice (made on the teacher's laptop) or a voice on this
 * device. Only shows when the student wants read-aloud (Ways to play) and one of those can.
 */
export function ReadAloudButton({ style, text, className = "" }: { style: AgeStyle; text: string; className?: string }) {
  const lang = style.language ?? "en";
  const wanted = useAccess(style).readAloud !== "off";
  const can = useCanReadAloud(lang);
  if (!wanted || !can || !text) return null;
  return (
    <button
      type="button"
      onClick={() => readAloud(text, style)}
      className={`inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-md px-2 text-xs font-bold text-ink-dim hover:text-ink ${className}`}
    >
      <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
        <path d="M3 8h3l4-3.5v11L6 12H3z" fill="currentColor" />
        <path d="M13 7.2c1 .8 1.5 1.8 1.5 2.8s-.5 2-1.5 2.8M15.3 5c1.6 1.4 2.4 3.1 2.4 5s-.8 3.6-2.4 5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      {style.copy.readAloud}
    </button>
  );
}
