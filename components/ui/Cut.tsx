"use client";

import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import { seedOf, wobblyRect } from "@/lib/ui/wobble";

/** The element's size in px, kept up to date (for drawing shapes that fit it exactly) */
export function useSize<T extends HTMLElement>(): [RefObject<T | null>, { w: number; h: number }] {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setSize((s) => (s.w === el.offsetWidth && s.h === el.offsetHeight ? s : { w: el.offsetWidth, h: el.offsetHeight }));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size];
}

interface CutProps {
  w: number;
  h: number;
  /** Anything stable (the label) so the same thing always gets the same edge */
  seed?: string;
  radius?: number;
  wobble?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  /** A darker copy underneath, offset down: the stacked-paper depth of buttons */
  depth?: number;
  depthFill?: string;
  /** Extra paths drawn with the same fill (a speech tail) */
  extra?: string;
  className?: string;
}

/**
 * A hand-cut shape that fills its parent (position the parent relatively).
 * Decorative only: hidden from screen readers.
 */
export function Cut({ w, h, seed = "cut", radius = 12, wobble = 1.3, fill = "var(--t-panel)", stroke, strokeWidth = 1.5, depth = 0, depthFill, extra, className = "" }: CutProps) {
  if (!w || !h) return null;
  const s = seedOf(seed);
  const d = wobblyRect(w, h, { radius, wobble, seed: s });
  // room around the shape for the depth layer, and for a speech tail reaching out of it
  const pad = extra ? 200 : Math.max(8, depth + 4);
  return (
    <svg
      aria-hidden="true"
      className={`pointer-events-none absolute overflow-visible ${className}`}
      style={{ left: -pad, top: -pad, width: w + pad * 2, height: h + pad * 2 }}
      viewBox={`${-pad} ${-pad} ${w + pad * 2} ${h + pad * 2}`}
    >
      {depth > 0 && <path d={wobblyRect(w, h, { radius, wobble, seed: s + 1 })} transform={`translate(0 ${depth})`} fill={depthFill ?? "rgb(0 0 0 / 0.45)"} />}
      {extra && <path d={extra} fill={fill} stroke={stroke} strokeWidth={stroke ? strokeWidth : 0} strokeLinejoin="round" />}
      <path d={d} fill={fill} stroke={stroke} strokeWidth={stroke ? strokeWidth : 0} strokeLinejoin="round" />
      {/* cover the tail's inner stroke so panel + tail read as one shape */}
      {extra && stroke && <path d={extra} fill={fill} stroke="none" transform="scale(1)" />}
    </svg>
  );
}
