import { POSES, type GloamMood } from "@/components/gloam/poses";
import { rng } from "@/lib/ui/wobble";
import { Spring } from "./physics";

/**
 * Gloam's animation brain. Every frame it turns "what's going on" (mood, typing, talking, a eureka,
 * walking, being ignored) into numbers for every moving part. The renderer just draws those numbers,
 * so the same brain can drive any Gloam art, in any age style.
 *
 * Layers, from the bottom up:
 *   base:     standing, walking (hop-walk), sitting, sleeping
 *   emotion:  the mood's pose (from components/gloam/poses.ts), sprung into
 *   extras:   breathing, blinking, glancing around, talking, reacting to typing
 *   moments:  the eureka jump, mood-change hops, waking up with a start
 * Everything chases its target through a spring, so nothing ever snaps.
 */

export interface BrainInput {
  mood: GloamMood;
  /** goes up by one on every keystroke in the notebook */
  typingTick: number;
  /** goes up by one on every "I get it" */
  eurekaTick: number;
  /** Gloam's line is being typed out right now (mouth moves) */
  talking: boolean;
  /** 0..1 how much Gloam understands (more light = more confident posture) */
  light: number;
  /** -1..1 sideways walking speed (the adventure moves Gloam between checkpoints) */
  walk: number;
  /** where to look, -1..1 each way (e.g. toward the notebook's caret); null = wherever the mood says */
  lookAt: { x: number; y: number } | null;
  /** the student can type right now (boredom only counts when it's their turn) */
  waiting: boolean;
  /** play less (reduced motion): no hops, no boredom, gentler everything */
  calm: boolean;
}

/** One frame of Gloam. Distances are in body heights; angles in radians. */
export interface Frame {
  x: number;
  y: number;
  squashX: number;
  squashY: number;
  tilt: number;
  armL: number;
  armR: number;
  footL: number;
  footR: number;
  lookX: number;
  lookY: number;
  lidL: number;
  lidR: number;
  pupil: number;
  browL: number;
  browR: number;
  browY: number;
  mouthOpen: number;
  mouthWidth: number;
  smile: number;
  mouthTilt: number;
  cheek: number;
  sit: number;
  sleep: number;
  /** 0..1: the inside-out glow of a eureka */
  glow: number;
  /** a nudge for the lantern (the renderer adds it to the pendulum) */
  lanternKick: number;
  /** "z" bubbles while asleep */
  snoring: boolean;
}

const D2R = Math.PI / 180;
// When Gloam gets bored (seconds of nobody typing on their turn)
export const BORED = { lookAround: 15, fiddle: 35, sit: 70, sleep: 120 };

export class GloamBrain {
  t = 0;
  private r = rng(91);
  private s: Record<string, Spring> = {};
  private blinkAt = 2;
  private blinkUntil = 0;
  private glanceAt = 1;
  private glance = { x: 0, y: 0 };
  private lastTyping = 0;
  private lastEureka = 0;
  private eurekaT = -99;
  private hopT = -99;
  private typedT = -99;
  private wakeT = -99;
  private idle = 0;
  private walkPhase = 0;
  private lastMood: GloamMood | null = null;
  private wasAsleep = false;

  private sp(name: string, x: number, stiffness = 120, damping = 14) {
    return (this.s[name] ??= new Spring(x, stiffness, damping));
  }

  update(dt: number, inp: BrainInput): Frame {
    dt = Math.min(dt, 1 / 20);
    this.t += dt;
    const t = this.t;
    const pose = POSES[inp.mood] ?? POSES.curious;
    let lanternKick = 0;

    // ---- events ----
    if (inp.typingTick !== this.lastTyping) {
      this.lastTyping = inp.typingTick;
      this.typedT = t;
      if (this.idle > BORED.sit) this.wakeT = t;
      this.idle = 0;
    }
    if (inp.eurekaTick !== this.lastEureka) {
      if (this.lastEureka !== 0 || inp.eurekaTick > 0) this.eurekaT = t;
      this.lastEureka = inp.eurekaTick;
      lanternKick += 4;
    }
    if (this.lastMood !== null && inp.mood !== this.lastMood && (inp.mood === "excited" || inp.mood === "proud" || inp.mood === "eureka")) this.hopT = t;
    this.lastMood = inp.mood;
    this.idle = inp.waiting && !inp.calm ? this.idle + dt : 0;

    // ---- the boredom ladder ----
    const bored = this.idle;
    const asleep = inp.mood === "asleep" || bored > BORED.sleep;
    const sitting = asleep || bored > BORED.sit;
    const fiddling = !sitting && bored > BORED.fiddle && Math.sin(t * 0.9) > -0.2;
    if (this.wasAsleep && !asleep) {
      this.wakeT = t;
      lanternKick += 3;
    }
    this.wasAsleep = asleep;

    // ---- blinking (sometimes twice) ----
    if (t > this.blinkAt) {
      this.blinkUntil = t + 0.11;
      const twice = this.r() < 0.22;
      this.blinkAt = t + (twice ? 0.24 : 1.8 + this.r() * 4);
    }
    const blink = t < this.blinkUntil ? 1 : 0;

    // ---- glancing around ----
    if (t > this.glanceAt) {
      const wide = bored > BORED.lookAround ? 1 : 0.35;
      this.glance = { x: (this.r() * 2 - 1) * wide, y: (this.r() * 2 - 1) * 0.4 * wide };
      this.glanceAt = t + (bored > BORED.lookAround ? 0.9 + this.r() * 1.4 : 1.4 + this.r() * 2.6);
    }

    // ---- moments (0..1 envelopes) ----
    const since = (x: number) => t - x;
    const env = (x: number, len: number) => (since(x) >= 0 && since(x) < len ? since(x) / len : -1);
    const eu = env(this.eurekaT, 2.4);
    const hop = env(this.hopT, 0.55);
    const wake = env(this.wakeT, 0.7);
    const typed = Math.exp(-since(this.typedT) * 2.2); // fades after each keystroke

    // ---- walking: a little hop-walk ----
    const walking = Math.abs(inp.walk) > 0.02;
    this.walkPhase += dt * (walking ? 9 : 0);
    const stepUp = walking ? Math.abs(Math.sin(this.walkPhase)) : 0;

    // ---- targets ----
    const conf = 0.7 + inp.light * 0.3;
    let y = 0;
    let squashY = 1;
    let squashX = 1;
    let tilt = pose.tilt * D2R;
    let armL = pose.armL * D2R;
    let armR = pose.armR * D2R;
    let lidL = Math.max(pose.lidL, blink);
    let lidR = Math.max(pose.lidR, blink);
    let lookX = pose.gazeX / 6 + this.glance.x * 0.5;
    let lookY = pose.gazeY / 6 + this.glance.y * 0.5;
    let pupil = pose.pupil;
    let browY = pose.browY / 8;
    let mouthOpen = Math.max(0, (pose.mouth.bot - 4) / 14);
    let mouthWidth = pose.mouth.w / 12;
    let smile = -(pose.mouth.l + pose.mouth.r) / 10;
    let glow = 0;
    let footL = 0;
    let footR = 0;

    // reacting to the student typing: lean in, watch the words
    if (typed > 0.05 && !asleep) {
      tilt += 0.06 * typed;
      squashY -= 0.02 * typed;
      lookY = lookY * (1 - typed) + 0.7 * typed;
      pupil += 0.1 * typed;
    }
    if (inp.lookAt && !asleep) {
      lookX = inp.lookAt.x;
      lookY = inp.lookAt.y;
    }

    // talking: the mouth moves with the words (two rhythms, so it never looks like a metronome)
    if (inp.talking && !asleep) {
      const flap = 0.5 + 0.5 * Math.sin(t * 17) * Math.sin(t * 7.3 + 1);
      mouthOpen = Math.max(mouthOpen, 0.15 + flap * 0.55);
      browY -= 0.08 * flap;
    }

    // fiddling with the lantern while waiting
    if (fiddling) {
      armR = 135 * D2R + Math.sin(t * 3) * 0.15;
      lookX = 0.65;
      lookY = -0.85;
      if (Math.sin(t * 3) > 0.97) lanternKick += 0.6;
    }

    // sitting and sleeping
    const sit = sitting ? 1 : 0;
    const sleep = asleep ? 1 : 0;
    if (sitting) {
      y += 0.05;
      squashY -= 0.06;
      squashX += 0.05;
      armL = 18 * D2R;
      armR = fiddling ? armR : 18 * D2R;
    }
    if (asleep) {
      lidL = lidR = 1;
      lookY = 0.4;
      browY = 0.15;
      mouthOpen = 0.12 + 0.08 * Math.sin(t * 1.3);
      tilt = Math.sin(t * 0.5) * 0.05 - 0.05;
      smile = 0.1;
    }

    // breathing (slower and deeper asleep)
    const breath = Math.sin(t * Math.PI * 2 * (asleep ? 0.18 : 0.27));
    squashY += breath * (asleep ? 0.03 : 0.013) * (inp.calm ? 0.5 : 1);
    squashX -= breath * (asleep ? 0.02 : 0.008) * (inp.calm ? 0.5 : 1);

    // standing taller as Gloam understands more
    squashY *= 0.985 + conf * 0.02;

    if (!inp.calm) {
      // a little hop when a mood lands (excited, proud)
      if (hop >= 0) {
        const k = Math.sin(hop * Math.PI);
        y -= 0.1 * k;
        squashY += hop < 0.15 ? -0.08 : 0.06 * k;
        squashX += hop < 0.15 ? 0.06 : -0.04 * k;
        if (hop < 0.05) lanternKick += 1.5;
      }
      // waking up with a start
      if (wake >= 0) {
        const k = Math.sin(wake * Math.PI);
        y -= 0.12 * k;
        lidL = lidR = 0;
        pupil = 0.75;
        browY = -0.6 * k;
        armL = armR = 120 * D2R * k;
      }
      // hop-walk: up on each step, squash on landing, arms swinging, feet taking turns
      if (walking) {
        y -= 0.05 * stepUp;
        squashY += (stepUp - 0.5) * 0.05;
        squashX -= (stepUp - 0.5) * 0.035;
        tilt += inp.walk * 0.1;
        armL += Math.sin(this.walkPhase) * 0.5;
        armR -= Math.sin(this.walkPhase) * 0.5;
        footL = Math.max(0, Math.sin(this.walkPhase));
        footR = Math.max(0, -Math.sin(this.walkPhase));
        lookX = Math.sign(inp.walk) * 0.6;
      }
      // EUREKA: crouch... freeze... LAUNCH, arms up, eyes huge, lit from inside
      if (eu >= 0) {
        if (eu < 0.12) {
          const k = eu / 0.12;
          squashY -= 0.16 * k;
          squashX += 0.12 * k;
          lidL = lidR = 0;
          pupil = 0.7;
        } else if (eu < 0.45) {
          const k = Math.sin(((eu - 0.12) / 0.33) * Math.PI);
          y -= 0.32 * k;
          squashY += 0.14 * k;
          squashX -= 0.1 * k;
          armL = armR = 150 * D2R;
          lidL = lidR = 0;
          pupil = 1.35;
          mouthOpen = 1;
          mouthWidth = 1.3;
          smile = 1;
          browY = -0.8;
        } else {
          const k = 1 - (eu - 0.45) / 0.55;
          armL = armR = (40 + 100 * k) * D2R;
          mouthOpen = Math.max(mouthOpen, 0.6 * k);
          smile = Math.max(smile, 0.8 * k);
          pupil = 1 + 0.3 * k;
        }
        glow = eu < 0.12 ? 0 : Math.min(1, (1 - eu) * 1.8);
      }
    }

    // ---- spring everything toward its target ----
    const f = (name: string, target: number, k = 120, d = 14) => this.sp(name, target, k, d).step(target, dt);
    const soft = inp.calm ? 0.5 : 1;
    return {
      x: 0,
      y: f("y", y, 260 * soft, 18),
      squashX: f("sx", squashX, 300, 14),
      squashY: f("sy", squashY, 300, 14),
      tilt: f("tilt", tilt, 90, 11),
      armL: f("armL", armL, 140, 12),
      armR: f("armR", armR, 140, 12),
      footL: f("footL", footL, 300, 20),
      footR: f("footR", footR, 300, 20),
      lookX: f("lookX", Math.max(-1, Math.min(1, lookX)), 220, 22),
      lookY: f("lookY", Math.max(-1, Math.min(1, lookY)), 220, 22),
      // eyelids are fast (blinks), so they barely spring
      lidL: f("lidL", lidL, 900, 60),
      lidR: f("lidR", lidR, 900, 60),
      pupil: f("pupil", pupil, 160, 16),
      browL: f("browL", pose.browL * D2R, 180, 16),
      browR: f("browR", pose.browR * D2R, 180, 16),
      browY: f("browY", browY, 180, 16),
      mouthOpen: f("mo", mouthOpen, 400, 26),
      mouthWidth: f("mw", mouthWidth, 200, 18),
      smile: f("smile", smile, 160, 16),
      mouthTilt: f("mt", (pose.mouth.l - pose.mouth.r) / 20, 160, 16),
      cheek: f("cheek", pose.cheek + glow * 0.4, 60, 12),
      sit: f("sit", sit, 40, 12),
      sleep: f("sleep", sleep, 30, 10),
      glow: f("glow", glow, 80, 14),
      lanternKick: inp.calm ? 0 : lanternKick,
      snoring: asleep,
    };
  }

  /** For tests and the lab page: pretend nobody typed for this long */
  setIdle(seconds: number) {
    this.idle = seconds;
  }
}
