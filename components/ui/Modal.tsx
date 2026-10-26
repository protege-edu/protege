"use client";

import { motion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { Sheet } from "@/components/ui/Sheet";
import { useCalmMotion } from "@/lib/useCalmMotion";

/** Everything a keyboard can reach (radio groups keep only their chosen option in the Tab order) */
const FOCUSABLE = 'button:not([disabled]):not([tabindex="-1"]), [href], textarea, input, select, [tabindex="0"]';

/**
 * The panel shell (pause, help, log, Ways to play): a dialog that keeps keyboard focus inside,
 * closes with Escape or a click outside, and gives focus back to whatever had it.
 * `side` slides it in from the right as a tall drawer.
 */
/**
 * A dialog's keyboard rules: focus starts inside it, Tab and Shift+Tab stay inside it, Escape closes it.
 * (`first`: what gets focus first; otherwise the first thing a keyboard can reach.)
 */
export function useTrapFocus(box: RefObject<HTMLElement | null>, onClose: () => void, active = true, first?: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!active) return;
    (first?.current ?? box.current?.querySelector<HTMLElement>(FOCUSABLE))?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && box.current) {
        const items = [...box.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
        if (!items.length) return;
        const [a, z] = [items[0], items[items.length - 1]];
        if (e.shiftKey && (document.activeElement === a || !box.current.contains(document.activeElement))) {
          e.preventDefault();
          z.focus();
        } else if (!e.shiftKey && (document.activeElement === z || !box.current.contains(document.activeElement))) {
          e.preventDefault();
          a.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [box, onClose, active, first]);
}

export function Modal({ onClose, label, children, side = false }: { onClose: () => void; label: string; children: ReactNode; side?: boolean }) {
  const calm = useCalmMotion();
  const box = useRef<HTMLDivElement>(null);
  // Panels are drawn at the top of the page (a moving or zoomed parent would trap a "fixed" panel inside it),
  // but inside the page's own theme, so they keep its colours: find that wrapper from where we are.
  const anchor = useRef<HTMLSpanElement>(null);
  const [host, setHost] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => {
    setHost(anchor.current?.closest<HTMLElement>("[data-age-style], [data-theme]") ?? document.body);
  }, []);
  // give focus back to whatever had it (the notebook) when the panel closes
  const returnTo = useRef<HTMLElement | null>(typeof document === "undefined" ? null : (document.activeElement as HTMLElement | null));
  useEffect(() => {
    const back = returnTo.current;
    return () => {
      if (back && document.contains(back)) back.focus({ preventScroll: true });
    };
  }, []);
  useTrapFocus(box, onClose, !!host);

  if (!host) return <span ref={anchor} hidden />;
  return createPortal(
    <motion.div
      className={`fixed inset-0 z-40 flex ${side ? "justify-end" : "items-center justify-center"} bg-[rgb(3_7_5/0.72)]`}
      initial={calm ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={calm ? undefined : { opacity: 0 }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        initial={calm ? false : side ? { x: 40, opacity: 0 } : { y: 12, opacity: 0 }}
        animate={{ x: 0, y: 0, opacity: 1 }}
        exit={calm ? undefined : side ? { x: 40, opacity: 0 } : { y: 8, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        className={side ? "flex h-full w-full max-w-[min(30rem,100%)] flex-col p-3" : "max-h-[calc(100dvh-24px)] w-[min(27rem,calc(100%-32px))] overflow-y-auto"}
      >
        <Sheet seed={label} radius={20} className={side ? "flex min-h-0 flex-1 flex-col" : "p-6"}>
          {side ? <div className="flex h-[calc(100dvh-24px)] flex-col">{children}</div> : children}
        </Sheet>
      </motion.div>
    </motion.div>,
    host,
  );
}
