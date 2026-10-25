"use client";

import { motion, useAnimate, type Transition } from "motion/react";
import { useEffect, useId, useRef, type CSSProperties } from "react";
import { useCalmMotion } from "@/lib/useCalmMotion";
import { POSES, type GloamMood, type Pose } from "./poses";
import { useBlink } from "./useBlink";

/**
 * Gloam, hand-painted (high school style). A "cutout" rig like 2D games use:
 *   - the furry body and the vine stalk + lantern are PAINTED (art/gloam_rig.py cuts them from one painting)
 *   - the face is drawn in code on top, styled to match the painting, so Gloam can blink, glance,
 *     raise a brow, smirk and gasp for every emotion
 * The lantern has a painted unlit and lit version; the lit one fades in as Gloam understands more.
 */

// Measurements of the painted parts (from public/art/senior/gloam-rig.json)
export const PAINTED_RIG = {
  width: 504,
  height: 673,
  eyes: [
    [171.4, 369.4],
    [322.6, 369.4],
  ] as const,
  eye: { rx: 30, ry: 25 },
  mouth: [248.4, 391] as const,
  stalkBase: [248.4, 277.2] as const,
  lantern: [140.4, 172.8] as const,
  feetY: 653.8,
};

const BODY = "/art/senior/gloam-body.webp";
const STALK_LIT = "/art/senior/gloam-stalk-lit.webp";
const STALK_DARK = "/art/senior/gloam-stalk-dark.webp";

const spring: Transition = { type: "spring", stiffness: 240, damping: 20, mass: 0.9 };
const pivot = (x: number, y: number): CSSProperties => ({ transformBox: "view-box", originX: `${x}px`, originY: `${y}px` }) as CSSProperties;

interface Props {
  mood: GloamMood;
  brightness: number;
  typingTick?: number;
  eurekaTick?: number;
  motionScale?: number;
  className?: string;
}

export function GloamPainted({ mood, brightness, typingTick = 0, eurekaTick = 0, motionScale = 1, className }: Props) {
  const calm = useCalmMotion();
  const id = useId().replace(/:/g, "");
  const pose = POSES[mood];
  const blinking = useBlink(mood !== "asleep" && !calm);
  const t: Transition = calm ? { duration: 0 } : spring;
  const [scope, animate] = useAnimate();
  const lastTick = useRef(typingTick);
  const asleep = mood === "asleep";
  const glow = asleep ? 0 : brightness;
  const m = calm ? 0 : motionScale;
  const R = PAINTED_RIG;

  useEffect(() => {
    if (calm || typingTick === lastTick.current) return;
    lastTick.current = typingTick;
    animate(`#face-${id}`, { y: [0, 3, 0] }, { duration: 0.22, ease: "easeOut" });
  }, [typingTick, calm, animate, id]);

  useEffect(() => {
    if (calm || eurekaTick === 0) return;
    const h = 46 * Math.max(0.6, motionScale);
    animate(
      `#hop-${id}`,
      { y: [0, 10, -h, 0, -h * 0.2, 0], scaleY: [1, 0.86, 1.06, 0.92, 1.02, 1], scaleX: [1, 1.08, 0.95, 1.06, 0.99, 1] },
      { duration: 1.05, times: [0, 0.12, 0.38, 0.62, 0.8, 1], ease: "easeOut" },
    );
  }, [eurekaTick, calm, animate, id, motionScale]);

  const lidL = blinking ? 1 : pose.lidL;
  const lidR = blinking ? 1 : pose.lidR;
  const breathe = m
    ? { scaleY: [1, 1 + 0.022 * m, 1], scaleX: [1, 1 - 0.007 * m, 1], transition: { duration: mood === "thinking" ? 1.8 : 3.8, repeat: Infinity, ease: "easeInOut" as const } }
    : {};
  // the lit lantern painting fades in with understanding; nothing at all until Gloam gets something
  const litOpacity = glow <= 0.001 ? 0 : 0.35 + glow * 0.65;

  return (
    <svg ref={scope} viewBox={`0 -20 ${R.width} ${R.height + 20}`} className={className} role="img" aria-label={`Gloam looks ${MOOD_WORDS[mood]}`}>
      <defs>
        <radialGradient id={`shadow-${id}`}>
          <stop offset="0" stopColor="#000" stopOpacity="0.6" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`iris-${id}`} cx="0.5" cy="0.72" r="0.6">
          <stop offset="0" stopColor="#7a2a1e" />
          <stop offset="0.55" stopColor="#3a0e10" />
          <stop offset="1" stopColor="#0d0406" />
        </radialGradient>
        <linearGradient id={`lid-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c35a6e" />
          <stop offset="1" stopColor="#e07d8a" />
        </linearGradient>
        {/* Gloam's own shape, so light added to it never spills outside the fur */}
        <mask id={`body-${id}`} style={{ maskType: "alpha" }}>
          <image href={BODY} width={R.width} height={R.height} />
        </mask>
        <radialGradient id={`warm-${id}`} cx={R.lantern[0]} cy={R.lantern[1] + 60} r="330" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffc46a" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffc46a" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx={R.width / 2} cy={R.feetY + 4} rx="200" ry="22" fill={`url(#shadow-${id})`} />

      <motion.g id={`hop-${id}`} style={pivot(R.width / 2, R.feetY)}>
        <motion.g animate={{ rotate: pose.tilt * 0.8 }} transition={t} style={pivot(R.width / 2, R.feetY)}>
          <motion.g animate={breathe} style={pivot(R.width / 2, R.feetY)}>
            {/* stalk + lantern sway from where they grow out of the head */}
            <motion.g
              animate={m ? { rotate: mood === "thinking" ? [-3, 4, -3] : [-1.6 * m, 2 * m, -1.6 * m] } : {}}
              transition={{ duration: mood === "thinking" ? 1.4 : 4.8, repeat: Infinity, ease: "easeInOut" }}
              style={pivot(R.stalkBase[0], R.stalkBase[1])}
            >
              <image href={STALK_DARK} width={R.width} height={R.height} />
              <motion.image href={STALK_LIT} width={R.width} height={R.height} initial={false} animate={{ opacity: litOpacity }} transition={{ duration: calm ? 0 : 1.4 }} />
            </motion.g>

            <image href={BODY} width={R.width} height={R.height} />
            {/* the lantern's warm light on the top of its head */}
            <motion.rect width={R.width} height={R.height} fill={`url(#warm-${id})`} mask={`url(#body-${id})`} style={{ mixBlendMode: "soft-light" }} initial={false} animate={{ opacity: glow }} transition={{ duration: calm ? 0 : 1.4 }} />

            <g id={`face-${id}`}>
              {R.eyes.map(([cx, cy], i) => (
                <Eye key={i} id={`${id}-${i}`} cx={cx} cy={cy} lid={i === 0 ? lidL : lidR} pose={pose} t={t} blinking={blinking} glow={glow} side={i === 0 ? -1 : 1} />
              ))}
              <Brows pose={pose} t={t} />
              <Mouth id={id} pose={pose} t={t} />
            </g>
          </motion.g>
        </motion.g>
      </motion.g>

      {asleep && !calm && <SleepyZs />}
    </svg>
  );
}

function Eye({ id, cx, cy, lid, pose, t, blinking, glow, side }: { id: string; cx: number; cy: number; lid: number; pose: Pose; t: Transition; blinking: boolean; glow: number; side: number }) {
  const { rx, ry } = PAINTED_RIG.eye;
  return (
    <g>
      <clipPath id={`eye-${id}`}>
        <ellipse cx={cx} cy={cy} rx={rx} ry={ry} />
      </clipPath>
      {/* a soft dark socket so the eye sits IN the fur */}
      <ellipse cx={cx} cy={cy + 2} rx={rx + 5} ry={ry + 5} fill="#5a1626" opacity="0.35" />
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#0d0406" />
      <g clipPath={`url(#eye-${id})`}>
        <motion.g animate={{ x: pose.gazeX * 1.6, y: pose.gazeY * 1.4, scale: pose.pupil }} transition={t} style={pivot(cx, cy)}>
          <ellipse cx={cx} cy={cy + 3} rx={rx * 0.86} ry={ry * 0.92} fill={`url(#iris-${id.split("-")[0]})`} />
          <ellipse cx={cx} cy={cy + 2} rx={rx * 0.42} ry={ry * 0.5} fill="#050102" />
          {/* glossy highlights, like the painting: a big cool one and a small one */}
          <ellipse cx={cx - rx * 0.3} cy={cy - ry * 0.32} rx={rx * 0.24} ry={ry * 0.22} fill="#cfeee6" opacity="0.95" />
          <circle cx={cx + rx * 0.3} cy={cy + ry * 0.3} r={rx * 0.08} fill="#ffffff" opacity="0.7" />
          {/* the lantern reflected in its eye */}
          <motion.circle cx={cx + rx * 0.32} cy={cy - ry * 0.35} r={rx * 0.11} fill="#ffcf7a" initial={false} animate={{ opacity: glow * 0.9 }} />
        </motion.g>
        {/* eyelid: fur-coloured, slides down; the lash line rides its edge */}
        <motion.g initial={false} animate={{ y: lid * (ry * 2 + 6) }} transition={blinking ? { duration: 0.07 } : t}>
          <rect x={cx - rx - 6} y={cy - ry - 4 - (ry * 2 + 6)} width={rx * 2 + 12} height={ry * 2 + 6} fill={`url(#lid-${id.split("-")[0]})`} />
          <path d={`M${cx - rx - 3} ${cy - ry - 4} Q ${cx} ${cy - ry + 5} ${cx + rx + 3} ${cy - ry - 4}`} fill="none" stroke="#2a0a12" strokeWidth="3.2" strokeLinecap="round" />
        </motion.g>
      </g>
      {/* little outer lashes, like the painting */}
      <path d={`M${cx + side * rx * 0.92} ${cy - ry * 0.25} l ${side * 9} -5 M${cx + side * rx * 0.98} ${cy - ry * 0.02} l ${side * 10} -1`} stroke="#2a0a12" strokeWidth="2.2" strokeLinecap="round" />
    </g>
  );
}

/** Soft, slightly darker fur tufts for brows: they carry most of the attitude */
function Brows({ pose, t }: { pose: Pose; t: Transition }) {
  const [[lx, ly], [rx, ry]] = PAINTED_RIG.eyes;
  const y = (v: number) => v - PAINTED_RIG.eye.ry - 18;
  return (
    <motion.g animate={{ y: pose.browY * 1.3 }} transition={t} opacity="0.85">
      <motion.path d={`M${lx - 30} ${y(ly) + 4} Q ${lx} ${y(ly) - 9} ${lx + 30} ${y(ly)}`} fill="none" stroke="#5e1a2c" strokeWidth="8" strokeLinecap="round" animate={{ rotate: pose.browL }} transition={t} style={pivot(lx, y(ly))} />
      <motion.path d={`M${rx - 30} ${y(ry)} Q ${rx} ${y(ry) - 9} ${rx + 30} ${y(ry) + 4}`} fill="none" stroke="#5e1a2c" strokeWidth="8" strokeLinecap="round" animate={{ rotate: pose.browR }} transition={t} style={pivot(rx, y(ry))} />
    </motion.g>
  );
}

function Mouth({ id, pose, t }: { id: string; pose: Pose; t: Transition }) {
  const [cx, cy] = PAINTED_RIG.mouth;
  const k = 1.15;
  const mm = pose.mouth;
  const f = (n: number) => n.toFixed(2);
  const d = `M ${f(cx - mm.w * k)} ${f(cy + mm.l * k)} Q ${f(cx)} ${f(cy + mm.top * k)} ${f(cx + mm.w * k)} ${f(cy + mm.r * k)} Q ${f(cx)} ${f(cy + mm.bot * k)} ${f(cx - mm.w * k)} ${f(cy + mm.l * k)} Z`;
  return (
    <g>
      <clipPath id={`mouth-${id}`}>
        <motion.path initial={false} animate={{ d }} transition={t} />
      </clipPath>
      <motion.path initial={false} animate={{ d }} transition={t} fill="#3a0d18" stroke="#2a0a12" strokeWidth="2.4" strokeLinejoin="round" />
      <g clipPath={`url(#mouth-${id})`}>
        <ellipse cx={cx} cy={cy + 10 + Math.max(0, mm.bot - 10) * 0.6} rx="15" ry="10" fill="#d8566e" />
      </g>
    </g>
  );
}

function SleepyZs() {
  return (
    <g fontFamily="var(--t-voice-font)" fill="#a9c7b8" fontWeight="600">
      {[0, 1, 2].map((i) => (
        <motion.text
          key={i}
          x="330"
          y="250"
          fontSize={26 + i * 9}
          animate={{ x: [330, 360 + i * 14], y: [250, 170 - i * 30], opacity: [0, 0.9, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, delay: i * 1.05, ease: "easeOut" }}
        >
          z
        </motion.text>
      ))}
    </g>
  );
}

const MOOD_WORDS: Record<GloamMood, string> = {
  confused: "confused",
  curious: "curious",
  skeptical: "not convinced",
  excited: "excited",
  sheepish: "a little embarrassed",
  proud: "smug",
  eureka: "like it finally gets it",
  redirect: "like it wants to get back on track",
  thinking: "like it's thinking hard",
  listening: "like it's listening",
  asleep: "asleep",
};
