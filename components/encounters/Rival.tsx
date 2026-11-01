"use client";

import { AnimatePresence, motion, useAnimationControls } from "motion/react";
import { useEffect, useState } from "react";
import type { GloamBox } from "@/components/game/Stage";
import type { TeachSession } from "@/components/game/useTeachSession";
import type { AgeStyle } from "@/lib/age-styles";
import { gameLines } from "@/lib/age-styles/game-lines";
import { useCalmMotion } from "@/lib/useCalmMotion";

/** Each age's rival, painted like its Gloam (art/prompts.py RIVALS): it faces left in the painting */
const ART: Partial<Record<AgeStyle["id"], { src: string; w: number; h: number }>> = {
  senior: { src: "/art/senior/rival.webp", w: 517, h: 640 },
};

/**
 * The rival, in the world beside Gloam (turned to face it). It hops in when it arrives, puffs up when
 * the student's answer sounds like its own wrong idea, flinches at a good point, and flaps off in a huff
 * when it's beaten. It stays for Gloam's recital too (Gloam is presenting to it). Calm motion: it just appears.
 */
export function Rival({ s, style, gloam }: { s: TeachSession; style: AgeStyle; gloam: GloamBox | null }) {
  const calm = useCalmMotion();
  const art = ART[style.id];
  const e = s.encounter;
  const here = !!art && !!gloam && (e?.kind === "rival" || e?.kind === "recital");
  // it leaves in a huff when beaten: keep it on screen for its exit
  const [leaving, setLeaving] = useState(false);
  const [lastKind, setLastKind] = useState(e?.kind);
  if (e?.kind !== lastKind) {
    setLastKind(e?.kind);
    if ((lastKind === "rival" || lastKind === "recital") && !e) setLeaving(true);
    if (e) setLeaving(false);
  }
  if (!art || !gloam) return null;
  // beside Gloam, on the side away from its speech panel, feet on the same ground
  const h = Math.round(gloam.h * 0.78);
  const w = Math.round((h * art.w) / art.h);
  const left = Math.max(8, Math.round(gloam.cx - gloam.w * 0.5 - w * 1.08));
  const top = Math.round(gloam.top + gloam.h - h);
  return (
    <AnimatePresence>
      {(here || leaving) && (
        <motion.div
          key="rival"
          aria-hidden="true"
          className="pointer-events-none absolute z-10"
          style={{ left, top, width: w, height: h }}
          initial={calm ? { opacity: 0 } : { opacity: 0, x: -140, y: -40 }}
          animate={leaving ? (calm ? { opacity: 0 } : { opacity: 0, x: -360, y: -220, rotate: -18, transition: { duration: 1.1, ease: "easeIn" } }) : { opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ type: "spring", stiffness: 160, damping: 14 }}
          onAnimationComplete={() => leaving && setLeaving(false)}
        >
          <Bird src={art.src} s={s} calm={calm} name={gameLines(style.id, style.language).rival} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** The painting itself, with its reactions (a separate layer, so they add to the entrance and the idle bob) */
function Bird({ src, s, calm, name }: { src: string; s: TeachSession; calm: boolean; name: string }) {
  const react = useAnimationControls();
  const ev = s.gameEvent;
  useEffect(() => {
    if (calm || !ev || s.encounter?.kind !== "rival") return;
    // sounds like its own idea: it puffs up, smug. A good point: it flinches.
    if (ev.event === "miss") void react.start({ scale: [1, 1.08, 1.04, 1], rotate: [0, -4, -2, 0], transition: { duration: 0.8 } });
    else if (ev.event === "glance") void react.start({ x: [0, -10, 4, 0], rotate: [0, 3, 0], transition: { duration: 0.5 } });
  }, [ev, calm, react, s.encounter?.kind]);
  return (
    <motion.div className="h-full w-full" animate={react}>
      <motion.img
        src={src}
        alt={name}
        className="h-full w-full object-contain drop-shadow-[0_10px_8px_rgb(0_0_0/0.45)]"
        style={{ scaleX: -1, transformOrigin: "50% 100%" }}
        animate={calm ? undefined : { y: [0, -4, 0], rotate: [0, -1.5, 0] }}
        transition={calm ? undefined : { duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        draggable={false}
      />
    </motion.div>
  );
}
