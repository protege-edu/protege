"use client";

import { motion } from "motion/react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Gloam } from "@/components/gloam/Gloam";
import { GloamPainted, PAINTED_RIG } from "@/components/gloam/GloamPainted";
import { GloamPainterly } from "@/components/gloam/GloamPainterly";
import type { GloamMood } from "@/components/gloam/poses";
import { Candles } from "@/components/scene/Candles";
import { Diorama } from "@/components/scene/Diorama";
import { NightValley } from "@/components/scene/NightValley";
import type { AgeStyle } from "@/lib/age-styles";
import type { ClientConcept, Level } from "@/lib/lesson/types";
import { useCalmMotion } from "@/lib/useCalmMotion";

// The painted, GPU-rendered worlds only load in the browser
const CinematicValley = dynamic(() => import("@/components/cinema/CinematicValley").then((m) => m.CinematicValley), { ssr: false });
const JourneyWorld = dynamic(() => import("@/components/cinema/JourneyWorld").then((m) => m.JourneyWorld), { ssr: false });

/** What the adventure needs to know (only used by age styles with a world + rig) */
export interface JourneyState {
  talking: boolean;
  waiting: boolean;
  level: number;
  /** each idea's level, in lesson order (one shrine each) */
  levels: number[];
  /** the shrine Gloam walks to: the first idea it doesn't get yet */
  stop: number;
  onWalking?: (walking: boolean) => void;
}

// Each Gloam skin's proportions: width/height, and where its feet and lantern are (fractions of its height;
// lanternDX is the lantern's offset from centre as a fraction of its width)
const PAINTED_H = PAINTED_RIG.height + 20; // the painted SVG adds 20 units above for the hop
const SKINS = {
  painted: {
    aspect: PAINTED_RIG.width / PAINTED_H,
    feet: (PAINTED_RIG.feetY + 20) / PAINTED_H,
    lantern: (PAINTED_RIG.lantern[1] + 20) / PAINTED_H,
    lanternDX: PAINTED_RIG.lantern[0] / PAINTED_RIG.width - 0.5,
  },
  painterly: { aspect: 320 / 350, feet: 0.943, lantern: 0.25, lanternDX: (172 - 160) / 320 },
  storybook: { aspect: 260 / 312, feet: 0.955, lantern: 0.135, lanternDX: (164 - 130) / 260 },
  // the animated rig draws itself inside the painted world (CinematicValley); these are its rough proportions
  rig: { aspect: 0.78, feet: 0.97, lantern: 0.1, lanternDX: -0.2 },
} as const;

export interface GloamBox {
  /** Gloam's centre across the screen, and the top of its box, in px */
  cx: number;
  top: number;
  w: number;
  h: number;
  stageW: number;
  stageH: number;
}

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
  onGloamBox,
  journey,
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
  /** Where Gloam is on screen (px), so speech panels can point at it */
  onGloamBox?: (box: GloamBox) => void;
  journey?: JourneyState;
  children?: ReactNode;
}) {
  const calm = useCalmMotion();
  const skin = style.look.gloamSkin;
  const painterly = skin === "painterly";
  const geo = SKINS[skin];
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
  // Phones get a slightly smaller Gloam and candle row so all five candles fit beside it
  const compact = (size?.w ?? 1000) < 640;
  const gloamH = Math.min(560, Math.max(180, vh * groundAt * (skin === "painted" ? (compact ? 0.6 : 0.72) : 0.62))) * gloamScale;
  const groundY = vh * groundAt;
  const lanternY = groundY - gloamH * (geo.feet - geo.lantern);
  const lanternDX = gloamH * geo.aspect * geo.lanternDX;
  const move = calm ? { duration: 0 } : { type: "spring" as const, stiffness: 55, damping: 18 };

  const gloamW = gloamH * geo.aspect;
  const gloamTop = groundY - gloamH * geo.feet;
  const cx = (size?.w ?? 0) * focus;
  // The adventure world draws Gloam itself (the animated rig) and reports where it is
  const world = useMemo(() => (style.look.world && style.look.rig ? { world: style.look.world, rig: style.look.rig } : null), [style]);
  useEffect(() => {
    if (!size || world) return;
    onGloamBox?.({ cx, top: gloamTop, w: gloamW, h: gloamH, stageW: size.w, stageH: size.h });
  }, [size, cx, gloamTop, gloamW, gloamH, onGloamBox, world]);
  // in the adventure, the shrines along the path (and the trail strip) are the candles
  const onJourneyBox = useCallback((b: GloamBox) => onGloamBox?.(b), [onGloamBox]);

  return (
    <section ref={box} aria-label="Gloam's valley" className="absolute inset-0 overflow-hidden bg-bg">
      {world && journey ? (
        <JourneyWorld
          world={world.world}
          rig={world.rig}
          mood={mood}
          typingTick={typingTick}
          eurekaTick={eurekaTick}
          talking={journey.talking}
          waiting={journey.waiting}
          light={brightness}
          level={journey.level}
          levels={journey.levels}
          stop={journey.stop}
          focus={focus}
          groundAt={groundAt}
          gloamHeight={gloamH * 0.95}
          onGloamBox={onJourneyBox}
          onWalking={journey.onWalking}
        />
      ) : scene ? (
        <CinematicValley scene={scene} brightness={brightness} focus={focus} eurekaTick={eurekaTick} lanternY={lanternY} lanternDX={lanternDX} groundAt={groundAt} />
      ) : painterly ? (
        <NightValley brightness={brightness} cx={focus} />
      ) : (
        <Diorama brightness={brightness} />
      )}

      {size && !world && (
        <>
          {/* Gloam stands on the ground and walks between shots */}
          <motion.div
            className="absolute -translate-x-1/2"
            initial={false}
            animate={{ left: `${focus * 100}%`, top: groundY - gloamH * geo.feet, height: gloamH }}
            transition={move}
            style={{ aspectRatio: geo.aspect }}
          >
            {skin === "painted" ? (
              <GloamPainted mood={mood} brightness={brightness} typingTick={typingTick} eurekaTick={eurekaTick} motionScale={style.look.motion} className="h-full w-full" />
            ) : painterly ? (
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
            style={{ pointerEvents: showCandles ? "auto" : "none", scale: compact ? 0.82 : 1 }}
          >
            <Candles concepts={concepts} understanding={understanding} flash={flash} style={style} gap={gloamH * geo.aspect * (compact ? 0.8 : 1.05)} />
          </motion.div>
        </>
      )}

      {children}
    </section>
  );
}
