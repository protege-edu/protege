"use client";

import { forwardRef, useState, type ButtonHTMLAttributes, type PointerEvent, type ReactNode } from "react";
import { seedOf, wobblyRect } from "@/lib/ui/wobble";
import { useCalmMotion } from "@/lib/useCalmMotion";
import { useSize } from "./Cut";

type Variant = "primary" | "quiet" | "ghost";
type Size = "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

/**
 * Protégé's button: a piece of cut paper.
 *   primary: Gloam's colour, sitting on a darker layer (real depth). Pressing pushes it down onto that layer.
 *   quiet:   a hand-drawn outline that fills in on hover.
 *   ghost:   just words, with a hand-drawn underline on hover.
 * A tap sends a ripple of moonlight through the paper (it shows the press landed).
 * Keyboard focus draws a moonlight outline that follows the same cut edge.
 */
export const InkButton = forwardRef<HTMLButtonElement, Props>(function InkButton({ variant = "primary", size = "md", children, className = "", onPointerDown, disabled, ...rest }, ref) {
  const [box, { w, h }] = useSize<HTMLSpanElement>();
  const calm = useCalmMotion();
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const seed = seedOf(typeof children === "string" ? children : variant);
  const depth = variant === "primary" ? 4 : 0;
  const radius = size === "lg" ? 14 : 11;
  const shape = w && h ? wobblyRect(w, h, { radius, wobble: 1.4, seed }) : "";
  const ring = w && h ? wobblyRect(w, h, { radius, wobble: 1.4, seed, inset: 5 }) : "";
  const clip = `cut-${seed}`;

  const press = (e: PointerEvent<HTMLButtonElement>) => {
    onPointerDown?.(e);
    if (calm || disabled) return;
    const r = e.currentTarget.getBoundingClientRect();
    const id = performance.now();
    setRipples((xs) => [...xs.slice(-2), { id, x: e.clientX - r.left, y: e.clientY - r.top }]);
    setTimeout(() => setRipples((xs) => xs.filter((x) => x.id !== id)), 700);
  };

  const pad = size === "lg" ? "min-h-13 px-8 text-md" : "min-h-11 px-5 text-sm";
  const ink = variant === "primary" ? "text-accent-ink" : "text-ink";

  return (
    <button
      ref={ref}
      disabled={disabled}
      onPointerDown={press}
      className={`group relative inline-flex shrink-0 cursor-pointer items-center justify-center font-bold outline-none select-none disabled:cursor-not-allowed disabled:opacity-45 ${pad} ${ink} ${className}`}
      style={{ marginBottom: depth }}
      {...rest}
    >
      <span ref={box} aria-hidden="true" className="absolute inset-0">
        {shape && (
          <svg className="absolute overflow-visible" style={{ left: 0, top: 0, width: w, height: h + depth }} viewBox={`0 0 ${w} ${h + depth}`}>
            <defs>
              <clipPath id={clip}>
                <path d={shape} />
              </clipPath>
            </defs>
            {/* focus: a moonlight outline around the cut edge */}
            <path d={ring} fill="none" stroke="var(--t-focus)" strokeWidth={2.5} className="opacity-0 group-focus-visible:opacity-100" />
            {variant === "primary" && <path d={shape} transform={`translate(0 ${depth})`} fill="var(--t-accent-deep, var(--t-accent-hover))" />}
            <g className={`transition-transform duration-100 ease-out ${variant === "primary" && !disabled ? "group-active:translate-y-[3px]" : ""}`}>
              {variant === "primary" && <path d={shape} fill="var(--t-accent)" className="transition-[fill] duration-150 group-hover:fill-[var(--t-accent-hover)]" />}
              {variant === "quiet" && (
                <path d={shape} fill="var(--t-chip)" fillOpacity={0} stroke="var(--t-line)" strokeWidth={1.5} className="transition-[fill-opacity,stroke] duration-150 group-hover:fill-opacity-100 group-hover:stroke-[var(--t-ink-dim)]" />
              )}
              {variant === "ghost" && <path d={`M6 ${h - 9} Q ${w / 2} ${h - 6.5} ${w - 6} ${h - 9.5}`} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" className="opacity-0 transition-opacity group-hover:opacity-60" />}
              <g clipPath={`url(#${clip})`}>
                {ripples.map((r) => (
                  <circle key={r.id} cx={r.x} cy={r.y} r={4} fill="var(--t-moon, #8ec5dc)" className="ink-ripple" style={{ transformOrigin: `${r.x}px ${r.y}px` }} />
                ))}
              </g>
            </g>
          </svg>
        )}
      </span>
      <span className={`relative transition-transform duration-100 ease-out ${variant === "primary" && !disabled ? "group-active:translate-y-[3px]" : ""}`}>{children}</span>
    </button>
  );
});
