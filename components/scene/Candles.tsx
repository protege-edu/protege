"use client";

import { useCalmMotion } from "@/lib/useCalmMotion";
import { AnimatePresence, motion } from "motion/react";
import { Fragment, useEffect, useId, useState, type CSSProperties } from "react";
import type { AgeStyle } from "@/lib/age-styles";
import type { ClientConcept as Concept, Level } from "@/lib/lesson/types";

/**
 * One candle per idea in the lesson. This is the per-concept meter, as fire instead of numbers.
 * Tap or focus a candle to see what Gloam currently believes about that idea.
 */
export function Candles({
  concepts,
  understanding,
  flash,
  style,
  gap = 0,
}: {
  concepts: Concept[];
  understanding: Record<string, Level>;
  flash?: string | null;
  style: AgeStyle;
  /** Space left in the middle of the row, where Gloam stands */
  gap?: number;
}) {
  const split = Math.floor(concepts.length / 2);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);

  return (
    <ul className="flex items-end justify-center gap-1 sm:gap-5" aria-label={style.copy.candleLabel}>
      {concepts.map((c, i) => (
        <Fragment key={c.id}>
          {gap > 0 && i === split && <li aria-hidden="true" style={{ width: gap }} />}
        <Candle
          concept={c}
          level={understanding[c.id] ?? 0}
          open={open === c.id}
          onToggle={() => setOpen((o) => (o === c.id ? null : c.id))}
          onClose={() => setOpen((o) => (o === c.id ? null : o))}
          flashing={flash === c.id}
          copy={style.copy}
          painterly={style.look.gloamSkin === "painterly"}
          showLabel={style.look.candleLabels}
        />
        </Fragment>
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
  copy,
  painterly,
  showLabel,
}: {
  concept: Concept;
  level: Level;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  flashing: boolean;
  copy: AgeStyle["copy"];
  painterly: boolean;
  showLabel: boolean;
}) {
  const reduced = useCalmMotion();
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
            className="absolute bottom-full z-20 mb-2 w-60 rounded-md border border-line bg-panel px-3 py-2.5 text-xs text-ink"
            style={{ boxShadow: "0 6px 24px rgb(0 0 0 / 0.35)" }}
          >
            <span className="block font-bold text-ink">{concept.name}</span>
            <span className="block text-ink-dim">{copy.gloamThinks}</span>
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
        aria-label={`${concept.name}: ${copy.levelWords[level]}. Show what Gloam thinks.`}
        className="group flex cursor-pointer flex-col items-center rounded-md px-1 pt-1 pb-1.5 outline-offset-2"
      >
        <CandleArt level={level} flashing={flashing} reduced={reduced} painterly={painterly} />
        {showLabel && <span className="mt-1 text-center text-xs leading-tight whitespace-nowrap text-[#e8e6dc] [text-shadow:0_1px_2px_rgb(0_0_0/0.8)] group-hover:underline">{concept.name}</span>}
      </button>
    </li>
  );
}

// The flame grows and flickers from the wick (in the drawing's own coordinates, not the shape's box)
const FLAME_PIVOT = { transformBox: "view-box", originX: "20px", originY: "29px" } as CSSProperties;

function CandleArt({ level, flashing, reduced, painterly }: { level: Level; flashing: boolean; reduced: boolean; painterly: boolean }) {
  const flame = [0, 0, 0.62, 1][level];
  const uid = useId().replace(/:/g, "");
  const lit = flame > 0;
  return (
    <svg viewBox="0 0 40 72" className="h-16 w-9 overflow-visible sm:h-[72px] sm:w-10" aria-hidden="true">
      <defs>
        {/* wax lit from the side, or warmly from its own flame */}
        <linearGradient id={`wax-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={painterly ? "#8f8a7c" : "#c9d2c4"} />
          <stop offset="0.45" stopColor={painterly ? "#e9e2cf" : "#e8ede3"} />
          <stop offset="1" stopColor={painterly ? "#b3ab95" : "#d5ddd0"} />
        </linearGradient>
        <linearGradient id={`glow-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffcf7a" stopOpacity="0.85" />
          <stop offset="1" stopColor="#ffcf7a" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`halo-${uid}`}>
          <stop offset="0" stopColor="#ffd98a" stopOpacity="0.7" />
          <stop offset="1" stopColor="#f4b740" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* halo when lit */}
      <motion.circle cx="20" cy="22" r="26" fill={`url(#halo-${uid})`} animate={{ opacity: [0, 0, 0.35, 0.7][level], scale: flashing && !reduced ? [1, 2.4, 1] : 1 }} transition={{ duration: flashing ? 1 : 0.6 }} style={{ transformBox: "fill-box", transformOrigin: "center" }} />
      {/* soft shadow it stands on */}
      <ellipse cx="20" cy="69" rx="13" ry="3" fill="#000" opacity="0.4" />
      {/* wax with a couple of drips */}
      <rect x="11" y="34" width="18" height="34" rx="2.5" fill={`url(#wax-${uid})`} />
      <path d="M11 37 q0 -3 4 -3 h10 q4 0 4 3 v1 q-2 0 -2 4 q0 3 -2 3 q-2 0 -2 -5 q-1 -2 -3 0 q0 9 -2.5 9 q-2.5 0 -2.5 -7 q0 -3 -3 -3 z" fill={painterly ? "#f2ecdb" : "#eef2ea"} />
      <motion.rect x="11" y="34" width="18" height="20" rx="2.5" fill={`url(#glow-${uid})`} animate={{ opacity: lit ? flame * 0.7 : 0 }} transition={{ duration: 0.6 }} />
      <line x1="20" y1="34" x2="20" y2="28" stroke={lit ? "#3a2412" : "#141414"} strokeWidth="1.8" strokeLinecap="round" />
      {/* smolder: the first spark */}
      {level === 1 && (
        <motion.circle cx="20" cy="27.5" r="2.4" fill="var(--color-ember)" animate={reduced ? {} : { opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.4, repeat: Infinity }} />
      )}
      {/* flame: the outer layer grows when the level changes, the inner layer only flickers.
          Keeping them separate means a level change can never interrupt the flicker loop. */}
      <motion.g
        style={FLAME_PIVOT}
        initial={false}
        animate={{ scale: flame, opacity: flame === 0 ? 0 : 1 }}
        transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 220, damping: 14 }}
      >
        <motion.g
          style={FLAME_PIVOT}
          animate={reduced ? {} : { scale: [1, 1.06, 0.96, 1], rotate: [0, -3, 2, 0] }}
          transition={{ duration: level === 3 ? 1.4 : 0.9, repeat: Infinity, ease: "easeInOut" }}
        >
          <path d="M20 4 C 27 14 28 20 26 25 C 24.5 28.5 15.5 28.5 14 25 C 12 20 14 13 20 4 Z" fill="var(--color-lantern)" />
          <path d="M20 14 C 23 19 23.5 22 22.5 24.5 C 21.5 26.5 18.5 26.5 17.5 24.5 C 16.5 22 17 19 20 14 Z" fill="var(--color-mist)" opacity="0.8" />
        </motion.g>
      </motion.g>
    </svg>
  );
}
