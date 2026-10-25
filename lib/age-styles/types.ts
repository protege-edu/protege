import type { Emotion } from "@/lib/ai/schemas";

/**
 * An age style is ONE profile that controls how Protégé feels for an age group:
 * Gloam's personality and jokes, every word on screen, the visuals, the celebrations,
 * safety strictness and how students give input.
 *
 * The teacher's grade level picks the style. Nothing in the app is hard-wired to one age:
 * if you find age-specific text or visuals outside lib/age-styles/, it's a bug.
 */
export type AgeStyleId = "little" | "junior" | "middle" | "senior";

/** A line can use {topic} (the lesson title) and {question} (Gloam's next question). */
export type Line = string;

/**
 * A painted world in layers. Each layer has a DARK painting and a LIT painting of the same thing;
 * Gloam's lantern light reveals the lit one, spreading further the more Gloam understands.
 */
export interface CinematicScene {
  /** Size the paintings were made at (all layers share it) */
  width: number;
  height: number;
  /** Back to front. depth 0 = sky (barely moves), 1 = foreground (moves most with the camera) */
  layers: { id: string; dark: string; lit: string; depth: number }[];
  /** Where Gloam's feet are in the painting (0..1), so the light and Gloam line up with the ground */
  ground: { x: number; y: number };
  /** Colour grade and mood */
  fog: string;
  firefly: string;
}

export interface AgeStyle {
  id: AgeStyleId;
  /** Shown to teachers: "Grades 9–12" */
  label: string;
  grades: [number, number];
  /** false = exists so nothing is hard-wired, but not polished yet */
  polished: boolean;

  voice: {
    /** Who Gloam is at this age. Goes into the AI prompt. */
    persona: string;
    /** Concrete style rules for the AI */
    rules: string[];
    /** The AI may never use these (overused jokes, babyish words, etc.) */
    banned: string[];
    maxWords: number;
    /** Lowercase everything Gloam says (deadpan high school texting style) */
    lowercase: boolean;
  };

  /** Hand-written lines. These carry most of the personality, the AI only fills gaps. */
  lines: {
    thinking: Line[];
    /** Gloam reacting before its words arrive, when the judge says something clicked */
    almost: Line[];
    clicking: Line[];
    /** Student said nothing to work with ("yea", "hey", "ok") */
    nudge: Line[];
    stuck: Line[];
    askedForAnswer: Line[];
    offTopic: Line[];
    insulted: Line[];
    /** Blocked (swearing, inappropriate) */
    blocked: Line[];
    /** Student is in distress. Never a joke. */
    care: string;
    victoryLap: Line[];
    /** When the AI fails twice */
    brainGlitch: Line[];
  };

  /** Every word on screen comes from here */
  copy: {
    appName: string;
    titleCta: string;
    titleContinue: string;
    paused: string;
    close: string;
    seeRecap: string;
    you: string;
    gloamName: string;
    charsLeft: (n: number) => string;
    titleHelp: string;
    chapter: (n: number) => string;
    introNext: string;
    introDone: string;
    introSkip: string;
    intro: (topic: string, candles: number) => { mood: Emotion | "asleep"; text: string }[];
    inputPlaceholder: string;
    inputLabel: string;
    sendButton: string;
    inputHint: string;
    firstHint: string;
    log: string;
    pause: string;
    resume: string;
    howItWorksTitle: string;
    howItWorks: (topic: string, candles: number) => string[];
    sound: (on: boolean) => string;
    startOver: string;
    startOverConfirm: string;
    candleLabel: string;
    gloamThinks: string;
    levelWords: [string, string, string, string];
    eurekaWord: string;
    finaleWord: string;
    credit: (concept: string) => string;
    finaleCredit: string;
    skip: string;
    recapTitle: string;
    recapIntro: string;
    teachAgain: string;
    backToTitle: string;
    offlineTitle: string;
    offlineBody: string;
    offlineRetryBody: (tries: number) => string;
    retry: string;
  };

  look: {
    /** Sets [data-age-style] on the page; colors, fonts and layout read it from CSS */
    theme: AgeStyleId;
    /** How Gloam is drawn */
    gloamSkin: "storybook" | "painterly" | "painted";
    /** 0..1, scales idle motion, hops, flicker */
    motion: number;
    /** Gloam's text gets wider (Martian Mono) or bouncier (Shantell) with mood */
    voiceAxis: "bounce" | "width";
    /** Show each candle's name under it (younger), or only on hover/tap (cleaner, older) */
    candleLabels: boolean;
    /** The painted, cinematic world. Without it, the simpler vector valley is used. */
    scene?: CinematicScene;
  };

  celebrate: {
    /** "full" plays the long cinematic for the first idea and the finale */
    style: "big" | "understated";
    particles: number;
  };

  safety: {
    /** "strict" also blocks mild words and redirects any off-topic chat immediately */
    level: "strict" | "standard";
  };

  input: {
    /** Later: "choices" (tap answers) and "voice". Keep the door open. */
    modes: ("type" | "choices" | "voice")[];
    /** Touch target scale. Little kids get bigger buttons. */
    targetScale: number;
    readAloud: boolean;
  };
}
