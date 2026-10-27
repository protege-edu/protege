"use client";

import { motion } from "motion/react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Gloam } from "@/components/gloam/Gloam";
import type { GloamMood } from "@/components/gloam/poses";
import { Candles } from "@/components/scene/Candles";
import { Diorama } from "@/components/scene/Diorama";
import type { AgeStyle } from "@/lib/age-styles";
import type { ClientConcept, Level } from "@/lib/lesson/types";
import { useCalmMotion } from "@/lib/useCalmMotion";

// The painted, GPU-rendered worlds only load in the browser
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
  /** test mode: goes up by one to make Gloam doze off right away */
  dozeTick?: number;
}

// Each Gloam skin's proportions: width/height, and where its feet and lantern are (fractions of its height;
// lanternDX is the lantern's offset from centre as a fraction of its width)
const SKINS = {
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

/** Never smaller than this (px): Gloam is the star, even on a phone with the biggest text */
const SMALLEST = 110;

/**
 * Where Gloam's ground goes and how tall it is. Normally from the shot (groundAt, gloamScale). With a
 * floor (the top of the words underneath), the ground rises so Gloam's whole box stays above it, and with
 * a ceiling (the top bar), Gloam shrinks so its head stays under it.
 */
export function fitGloam({
  vh,
  groundAt,
  gloamScale,
  feet,
  floor,
  ceiling = 0,
  stand = false,
}: {
  vh: number;
  groundAt: number;
  gloamScale: number;
  feet: number;
  floor?: number | null;
  ceiling?: number;
  /** stacked layouts: Gloam stands right on the words (not only moved up when they'd cover it) */
  stand?: boolean;
}) {
  const sized = (ground: number) => Math.min(560, Math.max(180, vh * ground * 0.62)) * gloamScale;
  let groundY = vh * groundAt;
  let gloamH = sized(groundAt);
  if (floor != null && vh > 0) {
    // the box reaches a little below the feet (the shadow): keep all of it above the floor, with a gap
    const highest = floor - 12 - gloamH * (1 - feet);
    if (groundY > highest || stand) {
      groundY = Math.max(ceiling + SMALLEST * feet, highest);
      gloamH = Math.min(gloamH, sized(groundY / vh));
    }
    // head under the ceiling
    gloamH = Math.max(SMALLEST, Math.min(gloamH, (groundY - ceiling) / feet));
  }
  return { groundY, gloamH };
}

/**
 * The world: the valley, Gloam, the candles. The age style picks how it's drawn.
 *   focus:    where Gloam stands across the screen (0..1)
 *   groundAt: where the ground line sits down the screen (0..1). The camera glides between shots:
 *             low on the title (big sky), higher while teaching (room for dialogue underneath).
 *   gloamScale: smaller Gloam for wide establishing shots
 *   floor / ceiling: where the words start below Gloam and where the top bar ends above it (px). Gloam
 *             stands on the floor and shrinks to fit between them, so words never cover it, whatever
 *             the screen or the text size. (Pages that scroll start their scrolling box below Gloam.)
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
  floor,
  ceiling = 0,
  stand,
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
  floor?: number | null;
  ceiling?: number;
  stand?: boolean;
  children?: ReactNode;
}) {
  const calm = useCalmMotion();
  const skin = style.look.gloamSkin;
  const geo = SKINS[skin];
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
  const fit = fitGloam({ vh, groundAt, gloamScale, feet: geo.feet, floor, ceiling, stand });
  const gloamH = fit.gloamH;
  const groundY = fit.groundY;
  const groundShare = vh ? groundY / vh : groundAt;
  const move = calm ? { duration: 0 } : { type: "spring" as const, stiffness: 55, damping: 18 };

  const gloamW = gloamH * geo.aspect;
  const gloamTop = groundY - gloamH * geo.feet;
  const cx = (size?.w ?? 0) * focus;
  // The adventure world draws Gloam itself (the animated rig) and reports where it is
  const world = useMemo(() => (style.look.world && style.look.rig ? { world: style.look.world, rig: style.look.rig } : null), [style]);
  // where Gloam is right now, also marked in the page (an invisible box) so checks can make sure nothing covers it
  const [mark, setMark] = useState<GloamBox | null>(null);
  useEffect(() => {
    if (!size || world) return;
    const b = { cx, top: gloamTop, w: gloamW, h: gloamH, stageW: size.w, stageH: size.h };
    onGloamBox?.(b);
    void Promise.resolve().then(() => setMark(b));
  }, [size, cx, gloamTop, gloamW, gloamH, onGloamBox, world]);
  // in the adventure, the shrines along the path (and the trail strip) are the candles
  const onJourneyBox = useCallback(
    (b: GloamBox) => {
      onGloamBox?.(b);
      // (only moves worth redrawing for: this can be called every frame while Gloam walks)
      setMark((m) => (m && Math.abs(m.cx - b.cx) < 6 && Math.abs(m.top - b.top) < 6 && Math.abs(m.h - b.h) < 6 ? m : b));
    },
    [onGloamBox],
  );

  return (
    <section ref={box} aria-label={style.copy.valleyLabel} className="absolute inset-0 overflow-hidden bg-bg">
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
          groundAt={groundShare}
          gloamHeight={gloamH * 0.95}
          onGloamBox={onJourneyBox}
          onWalking={journey.onWalking}
          dozeTick={journey.dozeTick}
        />
      ) : (
        <Diorama brightness={brightness} />
      )}
      {mark && <div data-gloam-box aria-hidden="true" className="pointer-events-none absolute" style={{ left: mark.cx - mark.w / 2, top: mark.top, width: mark.w, height: mark.h }} />}

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
            <Gloam mood={mood} brightness={brightness} typingTick={typingTick} eurekaTick={eurekaTick} className="h-full w-full" />
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
