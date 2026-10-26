"use client";

import type { CSSProperties, ReactNode } from "react";
import { tail } from "@/lib/ui/wobble";
import { Cut, useSize } from "./Cut";

/**
 * A panel of painted paper: hand-cut edge, a thin ink border, paper grain, a soft shadow underneath.
 * `tone` picks the paper: "night" for game panels, "slate" for where students write.
 */
export function Sheet({
  children,
  seed = "sheet",
  tone = "night",
  radius = 18,
  className = "",
  style,
  tailTo,
}: {
  children: ReactNode;
  seed?: string;
  tone?: "night" | "slate" | "day";
  radius?: number;
  className?: string;
  style?: CSSProperties;
  /** A speech tail from the panel's edge to this point (px, relative to the panel's top-left) */
  tailTo?: { x: number; y: number };
}) {
  const [box, { w, h }] = useSize<HTMLDivElement>();
  const fill = tone === "slate" ? "var(--t-panel-2, var(--t-panel))" : tone === "day" ? "var(--t-panel)" : "var(--t-panel)";
  let extra: string | undefined;
  if (tailTo && w && h) {
    // the tail leaves from the edge nearest the target
    const bx = Math.max(radius + 14, Math.min(w - radius - 14, tailTo.x));
    const by = Math.max(radius + 14, Math.min(h - radius - 14, tailTo.y));
    const fromLeft = tailTo.x < 0;
    const fromRight = tailTo.x > w;
    const fromTop = tailTo.y < 0;
    const [sx, sy] = fromLeft ? [6, by] : fromRight ? [w - 6, by] : fromTop ? [bx, 6] : [bx, h - 6];
    // a short tail that points at the speaker, never a long spike
    const dx = tailTo.x - sx;
    const dy = tailTo.y - sy;
    const len = Math.hypot(dx, dy) || 1;
    const reach = Math.min(len, 64);
    extra = tail(sx, sy, sx + (dx / len) * reach, sy + (dy / len) * reach, 26);
  }
  return (
    <div ref={box} className={`grain relative ${className}`} style={style}>
      <Cut w={w} h={h} seed={seed} radius={radius} wobble={1.6} fill={fill} stroke="var(--t-line)" strokeWidth={1.5} depth={6} depthFill="rgb(0 0 0 / 0.35)" extra={extra} />
      <div className="relative z-[2]">{children}</div>
    </div>
  );
}
