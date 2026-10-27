"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Where an element's visible part starts on screen right now (px), from layout: entrance animations
 * (transforms) don't move it; scrolling does, but never above the top of the box it scrolls in
 */
function layoutTop(el: HTMLElement): number {
  let y = 0;
  for (let e: HTMLElement | null = el; e; e = e.offsetParent as HTMLElement | null) y += e.offsetTop;
  for (let e = el.parentElement; e; e = e.parentElement) y -= e.scrollTop;
  for (let e = el.parentElement; e && e !== document.body; e = e.parentElement) {
    if (/auto|scroll|hidden/.test(getComputedStyle(e).overflowY)) {
      y = Math.max(y, layoutTop(e));
      break;
    }
  }
  return y;
}

/**
 * Where a block of words starts on screen, kept up to date as it grows (longer lines, bigger text), scrolls,
 * or the screen changes. Gloam stands above it (Stage's `floor`). Give the ref to the block; several screens can
 * share one: the newest block wins, and a block leaving only clears it if it's still the one measured.
 */
export function useWordsTop(): [(el: HTMLElement | null) => (() => void) | undefined, number | null] {
  const [el, setEl] = useState<HTMLElement | null>(null);
  const [top, setTop] = useState<number | null>(null);
  const ref = useCallback((node: HTMLElement | null) => {
    if (!node) return;
    setEl(node);
    return () => setEl((cur) => (cur === node ? null : cur));
  }, []);
  useEffect(() => {
    if (!el) {
      const t = requestAnimationFrame(() => setTop(null));
      return () => cancelAnimationFrame(t);
    }
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setTop(Math.round(layoutTop(el))));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    // any scrolling box the words are in
    window.addEventListener("scroll", measure, { capture: true, passive: true });
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, { capture: true });
    };
  }, [el]);
  return [ref, top];
}

/** The size of 1rem in px right now (Ways to play's bigger text changes it) */
export function useRem(): number {
  const [rem, setRem] = useState(16);
  useEffect(() => {
    const read = () => setRem(parseFloat(getComputedStyle(document.documentElement).fontSize) || 16);
    const first = requestAnimationFrame(read);
    // bigger text is a data attribute on <html>
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-text"] });
    window.addEventListener("resize", read);
    return () => {
      cancelAnimationFrame(first);
      mo.disconnect();
      window.removeEventListener("resize", read);
    };
  }, []);
  return rem;
}
