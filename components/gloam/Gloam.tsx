"use client";

import { useCalmMotion } from "@/lib/useCalmMotion";
import { motion, useAnimate, type Transition } from "motion/react";
import { useEffect, useRef, type CSSProperties } from "react";
import { lanternFill, mouthPath, POSES, type GloamMood, type Pose } from "./poses";
import { useBlink } from "./useBlink";

interface GloamProps {
  mood: GloamMood;
  /** 0..1, how much Gloam understands overall. Drives the lantern. */
  brightness: number;
  /** Changes on every keystroke, so Gloam can react to typing */
  typingTick?: number;
  /** Changes when a concept clicks, to trigger the big hop */
  eurekaTick?: number;
  className?: string;
}

const spring: Transition = { type: "spring", stiffness: 260, damping: 18, mass: 0.8 };

/**
 * Rotate/scale around a point in the drawing's own coordinates.
 * (By default the browser would use each shape's bounding box, which puts pivots in the wrong place.)
 */
const pivot = (x: number, y: number): CSSProperties =>
  ({ transformBox: "view-box", originX: `${x}px`, originY: `${y}px` }) as CSSProperties;

// Key points of Gloam's body, in SVG units
const GROUND = 284;
const HEAD_TOP = 150;
const EYE_Y = 208;
const LANTERN = { x: 154, y: 64 };

/**
 * Gloam, hand-drawn in SVG and animated in code.
 * Everything visible is driven by a pose (see poses.ts) plus a few always-on behaviours:
 * breathing, blinking, lantern flicker, and reacting to typing.
 */
export function Gloam({ mood, brightness, typingTick = 0, eurekaTick = 0, className }: GloamProps) {
  const reduced = useCalmMotion();
  const pose = POSES[mood];
  const blinking = useBlink(mood !== "asleep" && !reduced);
  const t: Transition = reduced ? { duration: 0 } : spring;
  const [scope, animate] = useAnimate();
  const lastTick = useRef(typingTick);

  // Tiny nod on each keystroke: "I'm listening!"
  useEffect(() => {
    if (reduced || typingTick === lastTick.current) return;
    lastTick.current = typingTick;
    animate("#gloam-face", { rotate: [0, 2, 0] }, { duration: 0.22, ease: "easeOut" });
  }, [typingTick, reduced, animate]);

  // The big hop when something finally clicks
  useEffect(() => {
    if (reduced || eurekaTick === 0) return;
    animate(
      "#gloam-hop",
      { y: [0, 8, -50, 0, -12, 0], scaleY: [1, 0.84, 1.1, 0.88, 1.03, 1], scaleX: [1, 1.12, 0.93, 1.1, 0.99, 1] },
      { duration: 1.15, times: [0, 0.12, 0.38, 0.62, 0.8, 1], ease: "easeOut" },
    );
  }, [eurekaTick, reduced, animate]);

  const lidL = blinking ? 1 : pose.lidL;
  const lidR = blinking ? 1 : pose.lidR;
  const glow = mood === "asleep" ? 0 : brightness;
  const breathe = reduced
    ? {}
    : {
        scaleY: [1, 1.03, 1],
        scaleX: [1, 0.99, 1],
        transition: { duration: mood === "thinking" ? 1.6 : 3.4, repeat: Infinity, ease: "easeInOut" as const },
      };

  return (
    <svg ref={scope} viewBox="0 -12 260 312" className={className} role="img" aria-label={`Gloam looks ${moodWords[mood]}`}>
      <ellipse cx="130" cy={GROUND + 2} rx="62" ry="8" fill="var(--color-soot)" opacity="0.45" />

      <motion.g id="gloam-hop" style={pivot(130, GROUND)}>
        <motion.g animate={{ rotate: pose.tilt }} transition={t} style={pivot(130, GROUND)}>
          <ellipse cx="106" cy="279" rx="17" ry="9" fill="var(--color-rosehip-deep)" />
          <ellipse cx="154" cy="279" rx="17" ry="9" fill="var(--color-rosehip-deep)" />

          <motion.g animate={breathe} style={pivot(130, GROUND - 4)}>
            {/* stalk + lantern sway together */}
            <motion.g
              animate={reduced ? {} : { rotate: mood === "thinking" ? [-5, 6, -5] : [-2.5, 3, -2.5] }}
              transition={{ duration: mood === "thinking" ? 1.2 : 4.2, repeat: Infinity, ease: "easeInOut" }}
              style={pivot(130, HEAD_TOP + 4)}
            >
              <path d="M130 156 C 127 132, 150 128, 148 108 C 147 98, 151 92, 154 88" fill="none" stroke="var(--color-lichen)" strokeWidth="7" strokeLinecap="round" />
              <Lantern brightness={glow} asleep={mood === "asleep"} reduced={reduced} />
            </motion.g>

            {/* body */}
            <path
              d={`M130 ${HEAD_TOP} C 184 ${HEAD_TOP} 210 186 210 222 C 210 260 178 282 130 282 C 82 282 50 260 50 222 C 50 186 76 ${HEAD_TOP} 130 ${HEAD_TOP} Z`}
              fill="var(--color-rosehip)"
            />

            {/* arms: little mitts on the sides */}
            <motion.g animate={{ rotate: pose.armL }} transition={t} style={pivot(60, 226)}>
              <ellipse cx="54" cy="244" rx="11" ry="17" fill="var(--color-rosehip-deep)" />
            </motion.g>
            <motion.g animate={{ rotate: -pose.armR }} transition={t} style={pivot(200, 226)}>
              <ellipse cx="206" cy="244" rx="11" ry="17" fill="var(--color-rosehip-deep)" />
            </motion.g>

            <g id="gloam-face" style={pivot(130, GROUND)}>
              <motion.ellipse cx="82" cy="236" rx="12" ry="7" fill="var(--color-rosehip-deep)" animate={{ opacity: pose.cheek }} transition={t} />
              <motion.ellipse cx="178" cy="236" rx="12" ry="7" fill="var(--color-rosehip-deep)" animate={{ opacity: pose.cheek }} transition={t} />

              <Eye cx={106} lid={lidL} pose={pose} t={t} blinking={blinking} />
              <Eye cx={154} lid={lidR} pose={pose} t={t} blinking={blinking} />

              <motion.g animate={{ y: pose.browY }} transition={t}>
                <motion.line x1="96" y1="182" x2="116" y2="182" stroke="var(--color-soot)" strokeWidth="6.5" strokeLinecap="round" animate={{ rotate: pose.browL }} transition={t} style={pivot(106, 182)} />
                <motion.line x1="144" y1="182" x2="164" y2="182" stroke="var(--color-soot)" strokeWidth="6.5" strokeLinecap="round" animate={{ rotate: pose.browR }} transition={t} style={pivot(154, 182)} />
              </motion.g>

              <motion.path
                fill="var(--color-soot)"
                stroke="var(--color-soot)"
                strokeWidth="3"
                strokeLinejoin="round"
                initial={false}
                animate={{ d: mouthPath(pose.mouth) }}
                transition={t}
              />
            </g>
          </motion.g>
        </motion.g>
      </motion.g>

      {mood === "asleep" && !reduced && <SleepyZs />}
    </svg>
  );
}

function Lantern({ brightness, asleep, reduced }: { brightness: number; asleep: boolean; reduced: boolean }) {
  const { x, y } = LANTERN;
  return (
    <g>
      {/* light rings: flat, paper-cut style. Exactly as bright as Gloam's understanding. */}
      <motion.g animate={{ opacity: brightness }} transition={{ duration: reduced ? 0 : 1.2 }}>
        <circle cx={x} cy={y} r="74" fill="var(--color-lantern)" opacity="0.07" />
        <circle cx={x} cy={y} r="52" fill="var(--color-lantern)" opacity="0.12" />
        <circle cx={x} cy={y} r="35" fill="var(--color-lantern)" opacity="0.2" />
      </motion.g>
      <rect x={x - 12} y={y - 30} width="24" height="8" rx="2.5" fill="var(--color-moss-deep)" />
      <motion.ellipse
        cx={x}
        cy={y}
        rx="19"
        ry="23"
        initial={false}
        animate={{ fill: lanternFill(brightness), opacity: reduced || brightness === 0 ? 1 : [1, 0.86, 1, 0.93, 1] }}
        transition={{ fill: { duration: reduced ? 0 : 1.2 }, opacity: { duration: 2.6, repeat: Infinity, ease: "easeInOut" } }}
      />
      <path
        d={`M${x - 8} ${y - 21} Q ${x - 15} ${y} ${x - 8} ${y + 21} M${x + 8} ${y - 21} Q ${x + 15} ${y} ${x + 8} ${y + 21}`}
        fill="none"
        stroke="var(--color-soot)"
        strokeWidth="1.6"
        opacity="0.28"
      />
      <rect x={x - 9} y={y + 21} width="18" height="6" rx="2" fill="var(--color-moss-deep)" />
      {/* the ember: the one spark Gloam has before you teach it anything */}
      {brightness < 0.1 && !asleep && (
        <motion.circle
          cx={x}
          cy={y + 6}
          r="3.6"
          fill="var(--color-ember)"
          animate={reduced ? {} : { opacity: [0.4, 1, 0.55, 0.9, 0.4], scale: [0.8, 1.1, 0.9, 1, 0.8] }}
          transition={{ duration: 1.8, repeat: Infinity }}
          style={pivot(x, y + 6)}
        />
      )}
    </g>
  );
}

function Eye({ cx, lid, pose, t, blinking }: { cx: number; lid: number; pose: Pose; t: Transition; blinking: boolean }) {
  const cy = EYE_Y;
  const id = `gloam-eye-${cx}`;
  return (
    <g>
      <clipPath id={id}>
        <ellipse cx={cx} cy={cy} rx="17" ry="20" />
      </clipPath>
      <ellipse cx={cx} cy={cy} rx="17" ry="20" fill="var(--color-mist)" />
      <g clipPath={`url(#${id})`}>
        <motion.g animate={{ x: pose.gazeX, y: pose.gazeY, scale: pose.pupil }} transition={t} style={pivot(cx, cy)}>
          <circle cx={cx} cy={cy + 2} r="9.5" fill="var(--color-soot)" />
          <circle cx={cx - 3.2} cy={cy - 2.2} r="3.2" fill="var(--color-mist)" />
        </motion.g>
        {/* eyelid slides down from the top */}
        <motion.rect
          x={cx - 20}
          y={cy - 22}
          width="40"
          height="44"
          fill="var(--color-rosehip)"
          initial={false}
          animate={{ scaleY: lid }}
          transition={blinking ? { duration: 0.07 } : t}
          style={pivot(cx, cy - 22)}
        />
      </g>
    </g>
  );
}

function SleepyZs() {
  return (
    <g fontFamily="var(--font-voice)" fill="var(--color-lichen)" fontWeight="700">
      {[0, 1, 2].map((i) => (
        <motion.text
          key={i}
          x="190"
          y="150"
          fontSize={14 + i * 5}
          animate={{ x: [190, 208 + i * 8], y: [150, 104 - i * 18], opacity: [0, 1, 0] }}
          transition={{ duration: 3, repeat: Infinity, delay: i, ease: "easeOut" }}
        >
          z
        </motion.text>
      ))}
    </g>
  );
}

const moodWords: Record<GloamMood, string> = {
  confused: "confused",
  curious: "curious",
  skeptical: "not convinced yet",
  excited: "excited",
  sheepish: "a little embarrassed",
  proud: "proud",
  eureka: "amazed, it finally gets it",
  redirect: "like it wants to get back on track",
  thinking: "like it's thinking hard",
  listening: "like it's listening closely",
  asleep: "asleep",
};
