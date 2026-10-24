"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useState } from "react";
import type { ClientConcept as Concept, Level } from "@/lib/lesson/types";

const LEVEL_WORDS = ["Not lit yet", "A little spark", "Flickering", "Lit"];

/**
 * One candle per idea in the lesson. This is the per-concept meter, as fire instead of numbers.
 * Tap or focus a candle to see what Gloam currently believes about that idea.
 */
export function Candles({ concepts, understanding, flash }: { concepts: Concept[]; understanding: Record<string, Level>; flash?: string | null }) {
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);

  return (
    <ul className="flex items-end justify-center gap-1 sm:gap-5" aria-label="What Gloam understands">
      {concepts.map((c) => (
        <Candle
          key={c.id}
          concept={c}
          level={understanding[c.id] ?? 0}
          open={open === c.id}
          onToggle={() => setOpen((o) => (o === c.id ? null : c.id))}
          onClose={() => setOpen((o) => (o === c.id ? null : o))}
          flashing={flash === c.id}
        />
      ))}
    </ul>
  );
}

function Candle({
  concept,
  level,
  open,
  onToggle,
  onClose,
  flashing,
}: {
  concept: Concept;
  level: Level;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  flashing: boolean;
}) {
  const reduced = useReducedMotion() ?? false;
  const tipId = useId();

  return (
    <li className="relative flex min-w-14 flex-col items-center">
      <AnimatePresence>
        {open && (
          <motion.div
            id={tipId}
            role="tooltip"
            initial={reduced ? false : { opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.16 }}
            className="absolute bottom-full z-20 mb-2 w-56 rounded-md bg-mist px-3 py-2.5 text-xs text-moss"
            style={{ boxShadow: "0 3px 0 var(--color-soot)" }}
          >
            <span className="block font-bold">Gloam thinks:</span>
            <span className="voice block text-sm leading-snug" style={{ ["--bounce" as string]: level * 25 }}>
              “{concept.beliefs[level]}”
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={onToggle}
        onBlur={onClose}
        aria-expanded={open}
        aria-describedby={open ? tipId : undefined}
        aria-label={`${concept.name}: ${LEVEL_WORDS[level]}. Show what Gloam thinks.`}
        className="group flex cursor-pointer flex-col items-center rounded-md px-1 pt-1 pb-1.5 outline-offset-2"
      >
        <CandleArt level={level} flashing={flashing} reduced={reduced} />
        <span className="mt-1 text-center text-xs leading-tight whitespace-nowrap text-mist group-hover:underline">{concept.name}</span>
      </button>
    </li>
  );
}

function CandleArt({ level, flashing, reduced }: { level: Level; flashing: boolean; reduced: boolean }) {
  const flame = [0, 0, 0.62, 1][level];
  return (
    <svg viewBox="0 0 40 72" className="h-16 w-9 overflow-visible sm:h-[72px] sm:w-10" aria-hidden="true">
      {/* halo when fully lit */}
      <motion.circle cx="20" cy="20" r="20" fill="var(--color-lantern)" animate={{ opacity: level === 3 ? 0.18 : 0, scale: flashing && !reduced ? [1, 2.6, 1] : 1 }} transition={{ duration: flashing ? 1 : 0.6 }} />
      {/* wax */}
      <rect x="11" y="34" width="18" height="34" rx="3" fill="var(--color-mist-dim)" />
      <path d="M11 38 q4 4 6 0 q3 6 6 0 q3 3 6 0" fill="none" stroke="var(--color-mist)" strokeWidth="2" />
      <line x1="20" y1="34" x2="20" y2="28" stroke="var(--color-soot)" strokeWidth="2" strokeLinecap="round" />
      {/* smolder: the first spark */}
      {level === 1 && (
        <motion.circle cx="20" cy="27.5" r="2.4" fill="var(--color-ember)" animate={reduced ? {} : { opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.4, repeat: Infinity }} />
      )}
      {/* flame */}
      <motion.g
        style={{ originX: "20px", originY: "29px" }}
        initial={false}
        animate={
          flame === 0
            ? { scale: 0, opacity: 0 }
            : reduced
              ? { scale: flame, opacity: 1 }
              : { scale: [flame, flame * 1.06, flame * 0.96, flame], opacity: 1, rotate: [0, -3, 2, 0] }
        }
        transition={reduced ? { duration: 0 } : { duration: level === 3 ? 1.4 : 0.9, repeat: Infinity, ease: "easeInOut" }}
      >
        <path d="M20 4 C 27 14 28 20 26 25 C 24.5 28.5 15.5 28.5 14 25 C 12 20 14 13 20 4 Z" fill="var(--color-lantern)" />
        <path d="M20 14 C 23 19 23.5 22 22.5 24.5 C 21.5 26.5 18.5 26.5 17.5 24.5 C 16.5 22 17 19 20 14 Z" fill="var(--color-mist)" opacity="0.8" />
      </motion.g>
    </svg>
  );
}
