"use client";

import { motion } from "motion/react";
import { useCalmMotion } from "@/lib/useCalmMotion";

/**
 * The journey at a glance: the path through the valley with one shrine per idea.
 * Lit shrines burn gold (understood). The moonlight ring is where Gloam is now.
 * Replaces "chapter 1" text: progress you can see, like a map, not a number.
 */
export function TrailStrip({ total, lit, current, label }: { total: number; lit: number; current: number; label: string }) {
  const calm = useCalmMotion();
  const W = 260;
  const H = 34;
  const xs = Array.from({ length: total }, (_, i) => 14 + (i * (W - 28)) / Math.max(1, total - 1));
  const yAt = (x: number) => H / 2 + Math.sin(x / 34) * 5;
  const path = xs.map((x, i) => `${i ? "L" : "M"}${x.toFixed(1)} ${yAt(x).toFixed(1)}`).join(" ");
  // the walked part of the path, up to where Gloam is
  const reached = xs[Math.min(current, total - 1)];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-9 w-[min(260px,52vw)] overflow-visible" role="img" aria-label={label}>
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
      {xs.map((x, i) => {
        const y = yAt(x);
        const isLit = i < lit;
        return (
          <g key={i}>
            {isLit && <circle cx={x} cy={y} r={9} fill="var(--color-lantern)" opacity={0.22} />}
            {/* a tiny shrine: a stone base and a candle flame when lit */}
            <path d={`M${x - 4.5} ${y + 5} L${x - 3.5} ${y - 1} L${x + 3.5} ${y - 1} L${x + 4.5} ${y + 5} Z`} fill={isLit ? "#d9c08a" : "var(--t-panel-2, var(--t-panel))"} stroke={isLit ? "none" : "var(--t-ink-dim)"} strokeWidth={1.2} />
            {isLit && <path d={`M${x} ${y - 9} C ${x + 3} ${y - 5}, ${x + 2.5} ${y - 2}, ${x} ${y - 1.5} C ${x - 2.5} ${y - 2}, ${x - 3} ${y - 5}, ${x} ${y - 9} Z`} fill="var(--color-lantern)" />}
            {i === current && (
              <motion.circle
                cx={x}
                cy={y + 1}
                r={9.5}
                fill="none"
                stroke="var(--t-moon, var(--t-focus))"
                strokeWidth={1.8}
                animate={calm ? undefined : { opacity: [0.95, 0.35, 0.95] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}
