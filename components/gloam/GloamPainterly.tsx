"use client";

import { motion, useAnimate, type Transition } from "motion/react";
import { useEffect, useId, useRef, type CSSProperties } from "react";
import { useCalmMotion } from "@/lib/useCalmMotion";
import { lanternFill, POSES, type GloamMood, type Pose } from "./poses";
import { useBlink } from "./useBlink";

/**
 * Gloam, painterly style (high school): a soft, felted little creature lit by its own lantern.
 * Same rig and poses as every other skin (see poses.ts), drawn with real lighting:
 * the lantern is the light source, so as Gloam understands more, its face warms up,
 * its eyes catch the light and a rim light appears along its body.
 */
interface Props {
  mood: GloamMood;
  /** 0..1: how much Gloam understands. Drives the lantern AND the lighting on Gloam. */
  brightness: number;
  typingTick?: number;
  eurekaTick?: number;
  /** 0..1 how much idle motion this age style wants */
  motionScale?: number;
  className?: string;
}

const spring: Transition = { type: "spring", stiffness: 240, damping: 20, mass: 0.9 };
const pivot = (x: number, y: number): CSSProperties => ({ transformBox: "view-box", originX: `${x}px`, originY: `${y}px` }) as CSSProperties;

const GROUND = 300;
const L = { x: 172, y: 58 }; // lantern centre
const EYE_Y = 214;

export function GloamPainterly({ mood, brightness, typingTick = 0, eurekaTick = 0, motionScale = 1, className }: Props) {
  const reduced = useCalmMotion();
  const id = useId().replace(/:/g, "");
  const pose = POSES[mood];
  const blinking = useBlink(mood !== "asleep" && !reduced);
  const t: Transition = reduced ? { duration: 0 } : spring;
  const [scope, animate] = useAnimate();
  const lastTick = useRef(typingTick);
  const asleep = mood === "asleep";
  const glow = asleep ? 0 : brightness;
  const m = reduced ? 0 : motionScale;

  // A small attentive lean toward the keyboard on each keystroke
  useEffect(() => {
    if (reduced || typingTick === lastTick.current) return;
    lastTick.current = typingTick;
    animate(`#face-${id}`, { rotate: [0, 1.8, 0], y: [0, 1.5, 0] }, { duration: 0.24, ease: "easeOut" });
  }, [typingTick, reduced, animate, id]);

  // The hop when something clicks: a squash, a hop, a settle. Smaller for understated styles.
  useEffect(() => {
    if (reduced || eurekaTick === 0) return;
    const h = 30 * Math.max(0.6, motionScale);
    animate(
      `#hop-${id}`,
      { y: [0, 6, -h, 0, -h * 0.2, 0], scaleY: [1, 0.88, 1.06, 0.93, 1.02, 1], scaleX: [1, 1.08, 0.95, 1.06, 0.99, 1] },
      { duration: 1.05, times: [0, 0.12, 0.38, 0.62, 0.8, 1], ease: "easeOut" },
    );
  }, [eurekaTick, reduced, animate, id, motionScale]);

  const lidL = blinking ? 1 : pose.lidL;
  const lidR = blinking ? 1 : pose.lidR;
  const breathe = m
    ? { scaleY: [1, 1 + 0.025 * m, 1], scaleX: [1, 1 - 0.008 * m, 1], transition: { duration: mood === "thinking" ? 1.8 : 3.6, repeat: Infinity, ease: "easeInOut" as const } }
    : {};

  const g = (name: string) => `${name}-${id}`;
  return (
    <svg ref={scope} viewBox="0 -30 320 350" className={className} role="img" aria-label={`Gloam looks ${MOOD_WORDS[mood]}`}>
      <defs>
        {/* body: lit from the lantern (upper right), shadow lower left */}
        <radialGradient id={g("body")} cx="189" cy="195" r="150" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#d9677c" />
          <stop offset="0.45" stopColor="#b2445b" />
          <stop offset="0.85" stopColor="#6e2539" />
          <stop offset="1" stopColor="#4a1729" />
        </radialGradient>
        {/* warm lantern light falling on the body, fades in with understanding */}
        <radialGradient id={g("warm")} cx="0.78" cy="0.12" r="0.75">
          <stop offset="0" stopColor="#ffcf7a" stopOpacity="0.75" />
          <stop offset="0.5" stopColor="#f4b740" stopOpacity="0.22" />
          <stop offset="1" stopColor="#f4b740" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={g("blush")}>
          <stop offset="0" stopColor="#ff8a9b" stopOpacity="0.75" />
          <stop offset="1" stopColor="#ff8a9b" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={g("iris")} cx="0.42" cy="0.38" r="0.7">
          <stop offset="0" stopColor="#8a5a2b" />
          <stop offset="0.6" stopColor="#4a2c16" />
          <stop offset="1" stopColor="#1c110a" />
        </radialGradient>
        <linearGradient id={g("sclera")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c9bfb6" />
          <stop offset="0.35" stopColor="#efe8de" />
          <stop offset="1" stopColor="#f6f0e6" />
        </linearGradient>
        <radialGradient id={g("shadow")}>
          <stop offset="0" stopColor="#000" stopOpacity="0.55" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={g("halo")}>
          <stop offset="0" stopColor="#ffd98a" stopOpacity="0.9" />
          <stop offset="0.25" stopColor="#f4b740" stopOpacity="0.35" />
          <stop offset="1" stopColor="#f4b740" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={g("paper")} cx="0.5" cy="0.55" r="0.6">
          <stop offset="0" stopColor={glow > 0.04 ? "#fff3c9" : "#3a2a1d"} />
          <stop offset="0.45" stopColor={lanternFill(glow)} />
          <stop offset="1" stopColor={glow > 0.05 ? "#b8641c" : "#24170f"} />
        </radialGradient>
        <linearGradient id={g("stalk")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#3e5a46" />
          <stop offset="0.6" stopColor="#7d9f7f" />
          <stop offset="1" stopColor="#4f6e57" />
        </linearGradient>
        <clipPath id={g("bodyclip")}>
          <path d={BODY} />
        </clipPath>
      </defs>

      {/* soft contact shadow + the pool of lantern light on the ground */}
      <ellipse cx="160" cy={GROUND + 4} rx="78" ry="11" fill={`url(#${g("shadow")})`} />
      <motion.ellipse cx="170" cy={GROUND + 2} rx="120" ry="20" fill={`url(#${g("halo")})`} animate={{ opacity: glow * 0.55 }} transition={{ duration: reduced ? 0 : 1.4 }} />

      <motion.g id={`hop-${id}`} style={pivot(160, GROUND)}>
        <motion.g animate={{ rotate: pose.tilt }} transition={t} style={pivot(160, GROUND)}>
          {/* feet */}
          <ellipse cx="128" cy="294" rx="20" ry="9" fill="#4a1729" />
          <ellipse cx="192" cy="294" rx="20" ry="9" fill="#5b1f33" />

          <motion.g animate={breathe} style={pivot(160, GROUND - 4)}>
            {/* stalk + lantern sway as one piece */}
            <motion.g
              animate={m ? { rotate: mood === "thinking" ? [-4, 5, -4] : [-2 * m, 2.5 * m, -2 * m] } : {}}
              transition={{ duration: mood === "thinking" ? 1.3 : 4.6, repeat: Infinity, ease: "easeInOut" }}
              style={pivot(160, 150)}
            >
              <motion.circle cx={L.x} cy={L.y} r="120" fill={`url(#${g("halo")})`} animate={{ opacity: glow }} transition={{ duration: reduced ? 0 : 1.4 }} />
              <path d="M160 152 C 156 128, 178 122, 176 104 C 175 96, 173 92, 172 88" fill="none" stroke={`url(#${g("stalk")})`} strokeWidth="7.5" strokeLinecap="round" />
              <path d="M161 150 C 158 130, 176 124, 174 108" fill="none" stroke="#a9c7a6" strokeWidth="1.6" strokeLinecap="round" opacity="0.5" />
              {/* a small leaf: Gloam is part of this valley */}
              <path d="M165 128 C 152 120, 146 124, 143 131 C 152 134, 160 133, 165 128 Z" fill="#5f8466" />
              <path d="M165 128 C 156 127, 150 128, 144 131" fill="none" stroke="#3e5a46" strokeWidth="1" />
              <Lantern g={g} glow={glow} asleep={asleep} reduced={reduced} />
            </motion.g>

            {/* body */}
            <path d={BODY} fill={`url(#${g("body")})`} />
            <g clipPath={`url(#${g("bodyclip")})`}>
              <motion.rect x="40" y="140" width="240" height="160" fill={`url(#${g("warm")})`} animate={{ opacity: 0.25 + glow * 0.75 }} transition={{ duration: reduced ? 0 : 1.4 }} />
              {/* felt texture: short soft strokes, drawn once */}
              <g stroke="#ffffff" strokeOpacity="0.07" strokeWidth="1.2" strokeLinecap="round">
                {FUZZ.map(([x, y, x2, y2], i) => (
                  <line key={i} x1={x} y1={y} x2={x2} y2={y2} />
                ))}
              </g>
              {/* the darker underside */}
              <ellipse cx="150" cy="300" rx="110" ry="40" fill="#3a1020" opacity="0.35" />
            </g>
            {/* a tuft of fuzz where the stalk grows out */}
            <path d="M146 156 C 148 142 154 147 156 151 C 157 140 164 141 165 151 C 168 144 175 146 174 157" fill="#c25069" />
            <path d="M150 155 C 151 148 154 150 156 153 M161 152 C 162 146 165 147 166 153" fill="none" stroke="#e98a9b" strokeOpacity="0.5" strokeWidth="1.2" strokeLinecap="round" />
            {/* rim light where the lantern catches the edge */}
            <motion.path d={RIM} fill="none" stroke="#ffd48a" strokeWidth="2.5" strokeLinecap="round" animate={{ opacity: glow * 0.85 }} transition={{ duration: reduced ? 0 : 1.4 }} />
            {/* fuzzy silhouette */}
            <path d={BODY} fill="none" stroke="#e98a9b" strokeOpacity="0.18" strokeWidth="2" strokeDasharray="1.5 3.5" />

            {/* arms */}
            <motion.g animate={{ rotate: pose.armL }} transition={t} style={pivot(84, 236)}>
              <ellipse cx="76" cy="254" rx="12" ry="18" fill="#7a2a40" />
              <ellipse cx="73" cy="258" rx="6" ry="10" fill="#5b1f33" opacity="0.6" />
            </motion.g>
            <motion.g animate={{ rotate: -pose.armR }} transition={t} style={pivot(236, 236)}>
              <ellipse cx="244" cy="254" rx="12" ry="18" fill="#a5405a" />
              <motion.ellipse cx="248" cy="249" rx="5" ry="9" fill="#ffd48a" animate={{ opacity: glow * 0.35 }} />
            </motion.g>

            <g id={`face-${id}`} style={pivot(160, GROUND)}>
              <motion.ellipse cx="112" cy="243" rx="17" ry="10" fill={`url(#${g("blush")})`} animate={{ opacity: pose.cheek * 0.8 }} transition={t} />
              <motion.ellipse cx="208" cy="243" rx="17" ry="10" fill={`url(#${g("blush")})`} animate={{ opacity: pose.cheek * 0.8 }} transition={t} />

              <Eye g={g} cx={134} lid={lidL} pose={pose} t={t} blinking={blinking} glow={glow} />
              <Eye g={g} cx={186} lid={lidR} pose={pose} t={t} blinking={blinking} glow={glow} />

              {/* brows: tapered, soft */}
              <motion.g animate={{ y: pose.browY }} transition={t}>
                <motion.path d="M120 186 Q 133 179 147 184 Q 134 184 121 189 Z" fill="#3a1422" stroke="#3a1422" strokeWidth="3" strokeLinejoin="round" animate={{ rotate: pose.browL }} transition={t} style={pivot(134, 185)} />
                <motion.path d="M173 184 Q 187 179 200 186 Q 199 189 186 184 Z" fill="#3a1422" stroke="#3a1422" strokeWidth="3" strokeLinejoin="round" animate={{ rotate: pose.browR }} transition={t} style={pivot(186, 185)} />
              </motion.g>

              <Mouth g={g} pose={pose} t={t} />
            </g>
          </motion.g>
        </motion.g>
      </motion.g>

      {asleep && !reduced && <SleepyZs />}
    </svg>
  );
}

function Lantern({ g, glow, asleep, reduced }: { g: (n: string) => string; glow: number; asleep: boolean; reduced: boolean }) {
  const { x, y } = L;
  return (
    <g>
      {/* hook */}
      <path d={`M${x} ${y - 36} q -4 -6 0 -9 q 4 3 0 9`} fill="none" stroke="#2a2f2a" strokeWidth="2" />
      {/* metal cap */}
      <path d={`M${x - 14} ${y - 25} L ${x + 14} ${y - 25} L ${x + 10} ${y - 34} L ${x - 10} ${y - 34} Z`} fill="#2b302c" />
      <rect x={x - 16} y={y - 27} width="32" height="4" rx="1.5" fill="#3d443e" />
      {/* paper body */}
      <motion.ellipse
        cx={x}
        cy={y}
        rx="20"
        ry="25"
        fill={`url(#${g("paper")})`}
        animate={glow > 0 && !reduced ? { opacity: [1, 0.9, 1, 0.95, 1] } : { opacity: 1 }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* ribs */}
      <g fill="none" stroke="#3a2412" strokeOpacity={0.35 - glow * 0.15} strokeWidth="1.3">
        <path d={`M${x - 10} ${y - 23} Q ${x - 18} ${y} ${x - 10} ${y + 23}`} />
        <path d={`M${x} ${y - 25} L ${x} ${y + 25}`} />
        <path d={`M${x + 10} ${y - 23} Q ${x + 18} ${y} ${x + 10} ${y + 23}`} />
        <path d={`M${x - 19} ${y - 6} Q ${x} ${y - 3} ${x + 19} ${y - 6}`} />
        <path d={`M${x - 19} ${y + 8} Q ${x} ${y + 11} ${x + 19} ${y + 8}`} />
      </g>
      {/* the flame inside, once Gloam understands anything */}
      {glow > 0.04 && (
        <motion.path
          d={`M${x} ${y - 9} C ${x + 6} ${y - 1} ${x + 6} ${y + 6} ${x} ${y + 9} C ${x - 6} ${y + 6} ${x - 6} ${y - 1} ${x} ${y - 9} Z`}
          fill="#fff6d8"
          style={pivot(x, y + 9)}
          animate={reduced ? { scale: 0.6 + glow * 0.6 } : { scale: [0.6 + glow * 0.6, 0.66 + glow * 0.62, 0.58 + glow * 0.6], rotate: [0, -3, 2] }}
          transition={{ duration: 1.1, repeat: Infinity, repeatType: "mirror" }}
          opacity={0.6 + glow * 0.4}
        />
      )}
      <rect x={x - 11} y={y + 24} width="22" height="5" rx="2" fill="#2b302c" />
      {/* the ember: the one spark Gloam has before you teach it anything */}
      {glow <= 0.04 && !asleep && (
        <motion.circle
          cx={x}
          cy={y + 7}
          r="3.6"
          fill="#e07a2e"
          style={pivot(x, y + 7)}
          animate={reduced ? {} : { opacity: [0.35, 1, 0.5, 0.9, 0.35], scale: [0.8, 1.15, 0.9, 1, 0.8] }}
          transition={{ duration: 1.9, repeat: Infinity }}
        />
      )}
    </g>
  );
}

function Eye({ g, cx, lid, pose, t, blinking, glow }: { g: (n: string) => string; cx: number; lid: number; pose: Pose; t: Transition; blinking: boolean; glow: number }) {
  const cy = EYE_Y;
  const rx = 19;
  const ry = 22;
  const clip = `${g("eye")}-${cx}`;
  return (
    <g>
      <clipPath id={clip}>
        <ellipse cx={cx} cy={cy} rx={rx} ry={ry} />
      </clipPath>
      {/* socket shadow: fades as the eye closes, so a sleeping Gloam doesn't look like it's wearing goggles */}
      <motion.ellipse cx={cx} cy={cy + 1} rx={rx + 3} ry={ry + 3} fill="#4a1729" initial={false} animate={{ opacity: 0.45 * (1 - lid * 0.85) }} transition={blinking ? { duration: 0.07 } : t} />
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#${g("sclera")})`} />
      <g clipPath={`url(#${clip})`}>
        <motion.g animate={{ x: pose.gazeX * 1.1, y: pose.gazeY * 1.1, scale: pose.pupil }} transition={t} style={pivot(cx, cy)}>
          <circle cx={cx} cy={cy + 2} r="12" fill={`url(#${g("iris")})`} />
          <circle cx={cx} cy={cy + 2} r="6.2" fill="#0d0806" />
          <circle cx={cx - 4.5} cy={cy - 3.5} r="3.6" fill="#ffffff" opacity="0.95" />
          <circle cx={cx + 4} cy={cy + 5.5} r="1.6" fill="#ffffff" opacity="0.6" />
          {/* the lantern reflected in its eyes */}
          <motion.circle cx={cx + 5} cy={cy - 4} r="2.2" fill="#ffd48a" animate={{ opacity: glow }} />
        </motion.g>
        {/* eyelid slides down; the lash line rides its edge */}
        <motion.g initial={false} animate={{ y: lid * (ry * 2 + 4) }} transition={blinking ? { duration: 0.07 } : t}>
          <rect x={cx - rx - 4} y={cy - ry - 2 - (ry * 2 + 4)} width={rx * 2 + 8} height={ry * 2 + 4} fill={`url(#${g("body")})`} />
          <path d={`M${cx - rx - 2} ${cy - ry - 2} Q ${cx} ${cy - ry + 4} ${cx + rx + 2} ${cy - ry - 2}`} fill="none" stroke="#2a0d16" strokeWidth="2.6" strokeLinecap="round" />
        </motion.g>
      </g>
    </g>
  );
}

/** Mouth with a real inside: dark, with a tongue that shows when it's open */
function Mouth({ g, pose, t }: { g: (n: string) => string; pose: Pose; t: Transition }) {
  const d = mouth(pose.mouth);
  const clip = g("mouth");
  return (
    <g>
      <clipPath id={clip}>
        <motion.path initial={false} animate={{ d }} transition={t} />
      </clipPath>
      <motion.path initial={false} animate={{ d }} transition={t} fill="#2a0d16" stroke="#2a0d16" strokeWidth="2.5" strokeLinejoin="round" />
      <g clipPath={`url(#${clip})`}>
        <ellipse cx="160" cy={262 + Math.max(0, pose.mouth.bot - 10) * 0.5} rx="13" ry="9" fill="#d65a72" />
      </g>
    </g>
  );
}

function mouth(m: Pose["mouth"]): string {
  const cx = 160;
  const cy = 252;
  const f = (n: number) => n.toFixed(2);
  return `M ${f(cx - m.w)} ${f(cy + m.l)} Q ${f(cx)} ${f(cy + m.top)} ${f(cx + m.w)} ${f(cy + m.r)} Q ${f(cx)} ${f(cy + m.bot)} ${f(cx - m.w)} ${f(cy + m.l)} Z`;
}

function SleepyZs() {
  return (
    <g fontFamily="var(--font-voice)" fill="#8faf8a" fontWeight="600">
      {[0, 1, 2].map((i) => (
        <motion.text
          key={i}
          x="226"
          y="150"
          fontSize={13 + i * 5}
          animate={{ x: [226, 244 + i * 8], y: [150, 106 - i * 16], opacity: [0, 0.9, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, delay: i * 1.05, ease: "easeOut" }}
        >
          z
        </motion.text>
      ))}
    </g>
  );
}

const BODY = "M160 150 C 222 150 252 196 252 236 C 252 278 214 300 160 300 C 106 300 68 278 68 236 C 68 196 98 150 160 150 Z";
const RIM = "M196 158 C 228 172 248 200 251 232 C 252 252 246 268 234 280";

// Felt texture strokes, placed once. Rounded so the server and the browser draw exactly the same thing.
const FUZZ: [number, number, number, number][] = Array.from({ length: 140 }, (_, i) => {
  const r = (n: number) => Math.abs((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1);
  const x = 70 + r(1) * 180;
  const y = 152 + r(2) * 146;
  const a = r(3) * Math.PI * 2;
  const round = (n: number) => Math.round(n * 10) / 10;
  return [round(x), round(y), round(x + Math.cos(a) * 5), round(y + Math.sin(a) * 5)];
});

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
