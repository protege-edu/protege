"use client";

import { useTrapFocus } from "@/components/ui/Modal";
import { motion } from "motion/react";
import { useEffect, useRef } from "react";
import { InkButton } from "@/components/ui/InkButton";
import { LogoMark } from "@/components/ui/Logo";
import { Sheet } from "@/components/ui/Sheet";
import type { AgeStyle, JourneyWorld } from "@/lib/age-styles/types";
import type { ClientConcept, Level } from "@/lib/lesson/types";
import { useCalmMotion } from "@/lib/useCalmMotion";

/**
 * The trail map: the whole painted valley at once, with every idea's shrine along the path.
 * The map is dark except where light has been earned: a pool around every lit shrine,
 * the same "light is the meter" idea as the game. Gloam's face marks where it's waiting.
 */
export function TrailMap({
  style,
  world,
  concepts,
  levels,
  stop,
  onClose,
}: {
  style: AgeStyle;
  world: JourneyWorld;
  concepts: ClientConcept[];
  levels: Level[];
  stop: number;
  onClose: () => void;
}) {
  const calm = useCalmMotion();
  const close = useRef<HTMLButtonElement>(null);
  const returnTo = useRef<HTMLElement | null>(typeof document === "undefined" ? null : (document.activeElement as HTMLElement | null));
  const box = useRef<HTMLDivElement>(null);
  useTrapFocus(box, onClose, true, close);
  useEffect(() => {
    const back = returnTo.current;
    return () => {
      if (back && document.contains(back)) back.focus({ preventScroll: true });
    };
  }, []);

  const n = concepts.length;
  const xAt = (i: number) => (i >= n ? world.end : world.start + ((world.end - world.start) * i) / n);
  const yAt = (x: number) => {
    const p = world.path;
    for (let i = 1; i < p.length; i++) if (x <= p[i][0]) return p[i - 1][1] + ((p[i][1] - p[i - 1][1]) * (x - p[i - 1][0])) / (p[i][0] - p[i - 1][0]);
    return p[p.length - 1][1];
  };
  const pct = (v: number) => `${(v * 100).toFixed(2)}%`;
  const lit = concepts.map((_, i) => levels[i] === 3);
  // light pools: one per lit shrine (and a small one around Gloam's lantern once it understands anything)
  const pools = [
    ...concepts.flatMap((_, i) => (lit[i] ? [`radial-gradient(circle at ${pct(xAt(i))} ${pct(yAt(xAt(i)) - 0.08)}, #000 0, #000 9%, transparent 21%)`] : [])),
    ...(levels.some((l) => l > 0) ? [`radial-gradient(circle at ${pct(xAt(stop))} ${pct(yAt(xAt(stop)) - 0.1)}, #000 0, transparent 12%)`] : []),
  ];
  const mask = pools.length ? pools.join(", ") : "linear-gradient(transparent, transparent)";
  const map = world.map;
  const here = stop >= n ? style.copy.mapEnd : concepts[stop].name;

  return (
    <motion.div
      className="fixed inset-0 z-40 flex items-center justify-center bg-[rgb(3_7_5/0.72)] px-4"
      initial={calm ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={calm ? undefined : { opacity: 0 }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-labelledby="map-title"
        className="w-[min(1120px,100%)]"
        initial={calm ? false : { y: 14, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 240, damping: 26 }}
      >
        <Sheet seed="trail-map" radius={20} className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="map-title" className="voice text-lg text-ink" style={{ ["--casual" as string]: 1, ["--voice-weight" as string]: 800 }}>
                {world.name}
              </h2>
              <p className="mt-1 text-sm text-ink-dim">
                {style.copy.mapHere}: <span className="font-bold text-ink">{here}</span>
              </p>
            </div>
            <InkButton ref={close} variant="quiet" onClick={onClose}>
              {style.copy.close}
            </InkButton>
          </div>

          <div className="-mx-1 mt-4 overflow-x-auto px-1 pb-2">
            <div className="relative min-w-[720px]">
              {/* the painted valley, dark; the lit painting shows through the light pools */}
              <div className="relative overflow-hidden rounded-lg" style={{ aspectRatio: `${world.width} / ${world.height}` }}>
                {map && (
                  <>
                    {/* the painting itself is decoration; the shrines and labels below carry the meaning */}
                    <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${map.dark})` }} />
                    <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${map.lit})`, maskImage: mask, WebkitMaskImage: mask }} />
                  </>
                )}
                <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_40px_rgb(0_0_0/0.7)]" />
                {concepts.map((c, i) => {
                  const x = xAt(i);
                  return (
                    <div key={c.id} className="absolute -translate-x-1/2 -translate-y-full" style={{ left: pct(x), top: pct(yAt(x)) }}>
                      <MapShrine level={levels[i] ?? 0} />
                    </div>
                  );
                })}
                {/* Gloam, waiting */}
                <motion.div
                  className="absolute -translate-x-1/2 -translate-y-full"
                  style={{ left: pct(xAt(stop) - 0.028), top: pct(yAt(xAt(stop)) + 0.02) }}
                  animate={calm ? undefined : { y: [0, -4, 0] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                >
                  <LogoMark tone="dark" className="h-10 w-10 drop-shadow-[0_2px_6px_rgb(0_0_0/0.8)]" title={`Gloam is at ${here}`} />
                </motion.div>
              </div>
              {/* the ideas, under their shrines */}
              <ol className="relative mt-2 h-10" aria-label={style.copy.candleLabel}>
                {concepts.map((c, i) => (
                  <li key={c.id} className="absolute w-28 -translate-x-1/2 text-center text-xs leading-tight" style={{ left: pct(xAt(i)) }}>
                    <span className={`font-bold ${lit[i] ? "text-[var(--color-lantern)]" : "text-ink"}`}>{c.name}</span>
                    <span className="block text-ink-dim">{style.copy.levelWords[levels[i] ?? 0]}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </Sheet>
      </motion.div>
    </motion.div>
  );
}

/** A tiny shrine with its candle, burning at the idea's level */
function MapShrine({ level }: { level: Level }) {
  const flame = [0, 0.35, 0.7, 1][level];
  return (
    <svg viewBox="0 0 30 40" className="h-9 w-7 overflow-visible drop-shadow-[0_2px_4px_rgb(0_0_0/0.7)]" aria-hidden="true">
      {level === 3 && <circle cx="15" cy="15" r="13" fill="var(--color-lantern)" opacity="0.3" />}
      <path d="M4 40 Q3 30 8 28 L22 28 Q27 30 26 40 Z" fill="#7c8f88" />
      <rect x="6" y="12" width="18" height="17" rx="4" fill="#93a49d" />
      <rect x="11" y="16" width="8" height="12" rx="3" fill="#2a3532" />
      <rect x="13" y="20" width="4" height="8" rx="1" fill={level === 3 ? "#f3e5c7" : "#a9a395"} />
      {level === 1 && <circle cx="15" cy="19" r="1.6" fill="var(--color-ember)" />}
      {level >= 2 && <path d={`M15 ${20 - 7 * flame} C ${15 + 3 * flame} ${20 - 4 * flame}, ${15 + 2.5 * flame} 20, 15 20 C ${15 - 2.5 * flame} 20, ${15 - 3 * flame} ${20 - 4 * flame}, 15 ${20 - 7 * flame} Z`} fill="var(--color-lantern)" />}
      <rect x="4" y="9" width="22" height="4" rx="1.5" fill="#a7b6af" />
    </svg>
  );
}
