"use client";

import { motion } from "motion/react";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Gloam } from "@/components/gloam/Gloam";
import { GloamPainterly } from "@/components/gloam/GloamPainterly";
import type { GloamMood } from "@/components/gloam/poses";
import { Candles } from "@/components/scene/Candles";
import { Diorama } from "@/components/scene/Diorama";
import { NightValley } from "@/components/scene/NightValley";
import type { AgeStyle } from "@/lib/age-styles";
import type { ClientConcept, Level } from "@/lib/lesson/types";
import { useCalmMotion } from "@/lib/useCalmMotion";

// The painted, GPU-rendered world only loads in the browser
const CinematicValley = dynamic(() => import("@/components/cinema/CinematicValley").then((m) => m.CinematicValley), { ssr: false });

// Where things are inside Gloam's drawing (fractions of its height)
const GLOAM_FEET = 0.943;
const GLOAM_LANTERN = 0.25;

/**
 * The world: the valley, Gloam, the candles. The age style picks how it's drawn.
 *   focus:    where Gloam stands across the screen (0..1)
 *   groundAt: where the ground line sits down the screen (0..1). The camera glides between shots:
 *             low on the title (big sky), higher while teaching (room for dialogue underneath).
 *   gloamScale: smaller Gloam for wide establishing shots
 */
export function Stage({
  style,
  mood,
  brightness,
  concepts,
  understanding,
  flash,
  typingTick,
  eurekaTick,
  focus,
  groundAt,
  gloamScale = 1,
  showCandles,
  children,
}: {
  style: AgeStyle;
  mood: GloamMood;
  brightness: number;
  concepts: ClientConcept[];
  understanding: Record<string, Level>;
  flash: string | null;
  typingTick: number;
  eurekaTick: number;
  focus: number;
  groundAt: number;
  gloamScale?: number;
  showCandles: boolean;
  children?: ReactNode;
}) {
  const calm = useCalmMotion();
  const painterly = style.look.gloamSkin === "painterly";
  const scene = style.look.scene;
  const box = useRef<HTMLElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Gloam is sized from the stage: big enough to be the star, never taller than the space above the ground
  const vh = size?.h ?? 0;
  const gloamH = Math.min(520, Math.max(170, vh * groundAt * 0.62)) * gloamScale;
  const groundY = vh * groundAt;
  const lanternY = groundY - gloamH * (GLOAM_FEET - GLOAM_LANTERN);
  const move = calm ? { duration: 0 } : { type: "spring" as const, stiffness: 55, damping: 18 };

  return (
    <section ref={box} aria-label="Gloam's valley" className="absolute inset-0 overflow-hidden bg-bg">
      {scene ? (
        <CinematicValley scene={scene} brightness={brightness} focus={focus} eurekaTick={eurekaTick} lanternY={lanternY} groundAt={groundAt} />
      ) : painterly ? (
        <NightValley brightness={brightness} cx={focus} />
      ) : (
        <Diorama brightness={brightness} />
      )}

      {size && (
        <>
          {/* Gloam stands on the ground and walks between shots */}
          <motion.div
            className="absolute -translate-x-1/2"
            initial={false}
            animate={{ left: `${focus * 100}%`, top: groundY - gloamH * GLOAM_FEET, height: gloamH }}
            transition={move}
            style={{ aspectRatio: painterly ? "320 / 350" : "260 / 312" }}
          >
            {painterly ? (
              <GloamPainterly mood={mood} brightness={brightness} typingTick={typingTick} eurekaTick={eurekaTick} motionScale={style.look.motion} className="h-full w-full" />
            ) : (
              <Gloam mood={mood} brightness={brightness} typingTick={typingTick} eurekaTick={eurekaTick} className="h-full w-full" />
            )}
          </motion.div>

          {/* the candles stand in a row on the ground, just in front of Gloam */}
          <motion.div
            className="absolute -translate-x-1/2"
            initial={false}
            animate={{ left: `${focus * 100}%`, top: groundY - (style.look.candleLabels ? 66 : 58), opacity: showCandles ? 1 : 0 }}
            transition={calm ? { duration: 0 } : { left: move, top: move, opacity: { duration: 0.6 } }}
            aria-hidden={!showCandles}
            style={{ pointerEvents: showCandles ? "auto" : "none" }}
          >
            <Candles concepts={concepts} understanding={understanding} flash={flash} style={style} gap={gloamH * 0.95} />
          </motion.div>
        </>
      )}

      {children}
    </section>
  );
}
