"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { Gloam } from "@/components/gloam/Gloam";
import { GloamPainterly } from "@/components/gloam/GloamPainterly";
import type { GloamMood } from "@/components/gloam/poses";
import { Candles } from "@/components/scene/Candles";
import { Diorama } from "@/components/scene/Diorama";
import { NightValley } from "@/components/scene/NightValley";
import type { AgeStyle } from "@/lib/age-styles";
import type { Level } from "@/lib/lesson/types";
import type { ClientConcept } from "@/lib/lesson/types";
import { useCalmMotion } from "@/lib/useCalmMotion";

/**
 * The world: the valley, Gloam, the candles. The age style picks how it's drawn.
 * `focus` is where Gloam stands across the screen (0..1): off to the side on the title, centre while teaching.
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
  showCandles: boolean;
  children?: ReactNode;
}) {
  const calm = useCalmMotion();
  const painterly = style.look.gloamSkin === "painterly";
  const move = calm ? { duration: 0 } : { type: "spring" as const, stiffness: 60, damping: 18 };

  return (
    <section aria-label="Gloam's valley" className="relative h-full w-full overflow-hidden bg-bg">
      {painterly ? <NightValley brightness={brightness} cx={focus} /> : <Diorama brightness={brightness} />}

      {/* Gloam stands on the ground. It walks to centre stage when teaching starts. */}
      <motion.div
        className="absolute bottom-[16%] h-[66%] max-h-[500px] min-h-[180px] -translate-x-1/2 md:bottom-[17%]"
        initial={false}
        animate={{ left: `${focus * 100}%` }}
        transition={move}
        style={{ aspectRatio: painterly ? "320 / 350" : "260 / 312" }}
      >
        {painterly ? (
          <GloamPainterly mood={mood} brightness={brightness} typingTick={typingTick} eurekaTick={eurekaTick} motionScale={style.look.motion} className="h-full w-full" />
        ) : (
          <Gloam mood={mood} brightness={brightness} typingTick={typingTick} eurekaTick={eurekaTick} className="h-full w-full" />
        )}
      </motion.div>

      <motion.div
        className="absolute bottom-[3%] -translate-x-1/2"
        initial={false}
        animate={{ opacity: showCandles ? 1 : 0, y: showCandles ? 0 : 16, left: `${focus * 100}%` }}
        transition={calm ? { duration: 0 } : { opacity: { duration: 0.6 }, y: { duration: 0.6 }, left: move }}
        aria-hidden={!showCandles}
      >
        <Candles concepts={concepts} understanding={understanding} flash={flash} style={style} />
      </motion.div>

      {children}
    </section>
  );
}
