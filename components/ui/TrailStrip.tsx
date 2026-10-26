"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useId, useState } from "react";
import type { AgeStyle } from "@/lib/age-styles";
import type { ClientConcept, Level } from "@/lib/lesson/types";
import { useCalmMotion } from "@/lib/useCalmMotion";

/**
 * The journey at a glance, and the per-idea meter: the path through the valley with one candle per idea,
 * in the order the shrines stand. Each candle shows its idea's level as fire (unlit, a spark, flickering,
 * lit). The moonlight ring is where Gloam is now. Tap or focus a candle to see what Gloam believes about it.
 */
export function TrailStrip({ style, concepts, levels, current }: { style: AgeStyle; concepts: ClientConcept[]; levels: Level[]; current: number }) {
  const calm = useCalmMotion();
  const [open, setOpen] = useState<number | null>(null);
  const total = concepts.length;
  const W = 300;
  const H = 44;
  const xs = Array.from({ length: total }, (_, i) => 18 + (i * (W - 36)) / Math.max(1, total - 1));
  const yAt = (x: number) => H / 2 + 6 + Math.sin(x / 38) * 4;
  const path = xs.map((x, i) => `${i ? "L" : "M"}${x.toFixed(1)} ${yAt(x).toFixed(1)}`).join(" ");
  const reached = xs[Math.min(current, total - 1)];

  useEffect(() => {
    if (open === null) return;
    const close = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);

  return (
    <div className="relative w-[min(300px,56vw)]">
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full overflow-visible" aria-hidden="true">
        <path d={path} fill="none" stroke="var(--t-line)" strokeWidth={2} strokeDasharray="1 6" strokeLinecap="round" />
        <motion.path
          d={path}
          fill="none"
          stroke="var(--t-ink-dim)"
          strokeWidth={2}
          strokeLinecap="round"
          initial={false}
          animate={{ pathLength: total > 1 ? (reached - xs[0]) / (xs[total - 1] - xs[0]) : 1 }}
          transition={calm ? { duration: 0 } : { duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
        />
        {xs.map((x, i) => (
          <MiniCandle key={i} x={x} y={yAt(x)} level={levels[i] ?? 0} here={i === current} calm={calm} />
        ))}
      </svg>
      {/* the candles are buttons (keyboard and touch), laid over the drawing */}
      <ul className="absolute inset-0" aria-label={style.copy.candleLabel}>
        {concepts.map((c, i) => (
          <li key={c.id} className="absolute top-0 h-full -translate-x-1/2" style={{ left: `${(xs[i] / W) * 100}%`, width: 30 }}>
            <CandleButton concept={c} level={levels[i] ?? 0} style={style} open={open === i} onToggle={() => setOpen((o) => (o === i ? null : i))} onClose={() => setOpen((o) => (o === i ? null : o))} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function MiniCandle({ x, y, level, here, calm }: { x: number; y: number; level: Level; here: boolean; calm: boolean }) {
  const lit = level === 3;
  const flame = [0, 0.35, 0.7, 1][level];
  return (
    <g>
      {level > 0 && <circle cx={x} cy={y - 12} r={6 + level * 3.5} fill="var(--color-lantern)" opacity={0.08 + level * 0.07} />}
      {/* a little stone and its candle */}
      <path d={`M${x - 6} ${y + 6} L${x - 4.5} ${y} L${x + 4.5} ${y} L${x + 6} ${y + 6} Z`} fill="#33443e" />
      <rect x={x - 2.4} y={y - 9} width={4.8} height={9} rx={1.2} fill={lit ? "#f3e5c7" : level > 0 ? "#b8ad96" : "#56605b"} />
      {level === 1 && <circle cx={x} cy={y - 10.5} r={1.6} fill="var(--color-ember)" />}
      {level >= 2 && (
        <motion.path
          d={`M${x} ${y - 19} C ${x + 3.6} ${y - 14}, ${x + 3} ${y - 10.5}, ${x} ${y - 10} C ${x - 3} ${y - 10.5}, ${x - 3.6} ${y - 14}, ${x} ${y - 19} Z`}
          fill="var(--color-lantern)"
          style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}
          animate={calm ? { scale: flame } : { scale: [flame, flame * 1.1, flame * 0.94, flame] }}
          transition={{ duration: lit ? 1.4 : 0.8, repeat: calm ? 0 : Infinity, ease: "easeInOut" }}
        />
      )}
      {here && (
        <motion.circle
          cx={x}
          cy={y - 6}
          r={11}
          fill="none"
          stroke="var(--t-moon, var(--t-focus))"
          strokeWidth={1.8}
          animate={calm ? undefined : { opacity: [0.95, 0.35, 0.95] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
    </g>
  );
}

function CandleButton({ concept, level, style, open, onToggle, onClose }: { concept: ClientConcept; level: Level; style: AgeStyle; open: boolean; onToggle: () => void; onClose: () => void }) {
  const calm = useCalmMotion();
  const tip = useId();
  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        onBlur={onClose}
        aria-expanded={open}
        aria-describedby={open ? tip : undefined}
        aria-label={`${concept.name}: ${style.copy.levelWords[level]}. Show what Gloam thinks.`}
        className="pointer-events-auto block h-full w-full cursor-pointer rounded-sm"
      />
      <AnimatePresence>
        {open && (
          <motion.div
            id={tip}
            role="tooltip"
            initial={calm ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="absolute top-full left-1/2 z-30 mt-2 w-64 -translate-x-1/2 rounded-md border border-line bg-panel px-3 py-2.5 text-left text-xs text-ink shadow-[0_8px_24px_rgb(0_0_0/0.45)]"
          >
            <span className="block font-bold">{concept.name}</span>
            <span className="block text-ink-dim">
              {style.copy.levelWords[level]}. {style.copy.gloamThinks}:
            </span>
            <span className="voice mt-0.5 block text-sm leading-snug">“{concept.beliefs[level]}”</span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
