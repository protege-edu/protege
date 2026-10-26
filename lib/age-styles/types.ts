import type { RigSpec } from "@/lib/gloam-rig/spec";
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

/** The languages Gloam (and every screen around it) can speak. Lessons and classes each have one. */
export type Language = "en" | "fr";
export const LANGUAGES: Record<Language, string> = { en: "English", fr: "Français" };

/**
 * The adventure: a long painted panorama Gloam walks across, with a checkpoint shrine for each idea.
 * Each depth layer has a DARK painting and a LIT painting of the same thing; Gloam's lantern light
 * reveals the lit one. Layers go back to front: depth 0 = sky (barely moves), 1 = foreground.
 */
export interface JourneyWorld {
  name: string;
  width: number;
  height: number;
  layers: { id: string; dark: string; lit: string; depth: number }[];
  /** Where the path is down the painting (0..1), sampled across it (0..1) */
  path: [number, number][];
  /** Where the journey starts and ends across the painting (0..1); shrines are spread between */
  start: number;
  end: number;
  fog: string;
  firefly: string;
  /** How dark the screen's edges get (0..1, default 1 = the night valley's full vignette) */
  vignette?: number;
  /** The whole journey, small, for the trail map (dark and lit) */
  map?: { dark: string; lit: string };
  /** Short, hand-written things Gloam notices while walking between checkpoints (no AI) */
  travel: string[];
  /** The painted shrine that stands at each checkpoint; its candle (drawn in code) burns at the idea's level */
  shrine: {
    src: string;
    w: number;
    h: number;
    /** where it stands on the ground, and where the candle sits, in its own image */
    base: [number, number];
    candle: [number, number];
    /** how tall it is next to Gloam (fraction of Gloam's height) */
    scale: number;
  };
}

/** Problems a student can hit while joining (the server sends the code; each language words it) */
export type JoinError =
  | "code_wrong"
  | "nick_short"
  | "nick_long"
  | "nick_unsafe"
  | "nick_contact"
  | "nick_taken"
  | "class_gone"
  | "key_missing"
  | "key_locked"
  | "key_google"
  | "key_wrong"
  | "not_found"
  | "google_timeout";

/** Joining a class, and coming back (app/join). Gloam talks the student through it. */
/** "Ways to play" (components/access) and the microphone in the teach box */
export interface AccessCopy {
  /** the button that opens the panel, and its title */
  open: string;
  title: string;
  intro: string;
  voice: string;
  voiceHint: string;
  /** neither this device nor the teacher's laptop can turn speech into words */
  voiceMissing: string;
  voicePrivate: string;
  readAloud: string;
  readAloudChoices: [string, string, string];
  readAloudMissing: string;
  text: string;
  textChoices: [string, string, string];
  contrast: string;
  contrastHint: string;
  reading: string;
  readingChoices: [string, string, string];
  calm: string;
  calmHint: string;
  /** the device already asks for less motion */
  calmDevice: string;
  sound: string;
  done: string;
  micStart: string;
  micStop: string;
  micListening: string;
  micWorking: string;
  micDenied: string;
  micFailed: string;
  micEmpty: string;
}

/** Telling students Gloam is an AI, and what it remembers (title screen, join screen, "How this works") */
export interface AboutCopy {
  /** one line, under the title screen's buttons and on the join screen */
  aiNote: string;
  title: string;
  lines: string[];
}

export interface JoinCopy {
  codeTitle: string;
  codeLabel: string;
  codeHint: string;
  codeButton: string;
  codeWrong: string;
  whoTitle: string;
  whoHint: (className: string) => string;
  whoNew: string;
  nickTitle: string;
  nickLabel: string;
  nickHint: string;
  nickSurprise: string;
  nickButton: string;
  keyTitle: (size: number) => string;
  keyHint: string;
  /** "2 of 3" while picking */
  keyCount: (picked: number, size: number) => string;
  keyClear: string;
  keyRememberTitle: string;
  keyRememberHint: string;
  keyRememberButton: string;
  keyRedo: string;
  keyEnterTitle: (nickname: string) => string;
  keyEnterHint: string;
  /** after a teacher reset: the pictures they pick now become the new key */
  keyResetHint: string;
  google: string;
  googleNick: string;
  back: string;
  /** the server's problems in this language (missing ones: the server's English words are shown) */
  errors?: Partial<Record<JoinError, string>>;
  /** what a screen reader says for each secret picture, and around the picture pad */
  pictures: Record<"moon" | "fern" | "lantern" | "owl" | "star" | "mushroom" | "leaf" | "moth" | "stone", string>;
  pictureGroup: string;
  pictureOrder: string;
  slotEmpty: string;
  slotPicked: string;
  /** what Gloam says at each step (its own voice) */
  gloam: {
    code: string;
    typing: string;
    wrong: string;
    found: (className: string) => string;
    nick: string;
    key: string;
    remember: string;
    welcome: (nickname: string) => string;
    welcomeBack: (nickname: string) => string;
  };
}

/** The student's home ("your Gloam", app/me) */
export interface HomeCopy {
  title: (nickname: string) => string;
  level: (level: number) => string;
  levelHint: string;
  tricksTitle: string;
  trickNames: Record<"spin" | "hum" | "firefly" | "pose", string>;
  noTricks: string;
  lessonsTitle: string;
  lessonNew: string;
  lessonProgress: (lit: number, total: number) => string;
  lessonDone: string;
  start: string;
  keepGoing: string;
  visit: string;
  noLessons: string;
  journalTitle: string;
  journalEmpty: string;
  signOut: string;
  paused: string;
  /** Gloam greets the student (picked by the level, no randomness) */
  hello: (nickname: string) => string[];
}

export interface AgeStyle {
  /** the language every word and line is in (French versions come from getAgeStyle(id, "fr")) */
  language?: Language;
  id: AgeStyleId;
  /** Shown to teachers: "Grades 9–12" */
  label: string;
  /** For teachers, when they pick a grade: what this age's Gloam and world are like */
  teacherBlurb: string;
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
    /** The message was pasted from somewhere (a search result, an AI). Ask for their own words, kindly. */
    copied: Line[];
    /** When the AI fails twice */
    brainGlitch: Line[];
    /** Coming back to a lesson part-way (Gloam waited at its checkpoint) */
    welcomeBack: Line[];
    /** Gloam's lantern just grew (it levelled up from everything this student taught it) */
    levelUp: Line[];
    /** Short follow-ups the director adds when the AI's reply can't be used (said after Gloam's belief) */
    followUps: { why: string; missing: string; how: string; hm: string };
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
    forTeachers: string;
    chapter: (n: number) => string;
    /** The trail map (pause menu): its button, "Gloam is at", and the end of the trail */
    trailMap: string;
    mapHere: string;
    mapEnd: string;
    /** What Gloam learned to do at this level (lib/gloam-rig/brain.ts TRICKS), or null */
    trickLearned: (level: number) => string | null;
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
    /** Title screen of the practice lesson: the way into a real class */
    titleJoin: string;
    /** a student sent far too many messages too fast (Gloam asks for one at a time) */
    slowDown: string;
    /** what a screen reader calls the game world */
    valleyLabel: string;
    /** the button that reads Gloam's line aloud (age styles with input.readAloud) */
    readAloud: string;
    /** ways to start a sentence, to tap (age styles with the "choices" input); "…" marks where the student carries on */
    starters: string[];
    startersLabel: string;
    /** screen readers: where we are in Gloam's intro */
    introPart: (n: number, total: number) => string;
    /** the bottom of Gloam's journal: its level, and how much it's been taught (toGo: ideas to the next level, or null at the top) */
    journalLevel: (level: number) => string;
    /** the card when Gloam levels up */
    levelUpTitle: string;
    levelBadge: (level: number) => string;
    journalTaught: (light: number, toGo: number | null) => string;
    /** a busy class: other Gloams are thinking first (ahead = how many are in line before this one, 0 = next) */
    queued: (ahead: number) => string;
    /** ...and next to it, trying the practice lesson without a class */
    titlePractice: string;
    /** Signed in to a class: back to "your Gloam" (the student's home) */
    toMyGloam: string;
    join: JoinCopy;
    home: HomeCopy;
    access: AccessCopy;
    about: AboutCopy;
  };

  look: {
    /** Sets [data-age-style] on the page; colors, fonts and layout read it from CSS */
    theme: AgeStyleId;
    /** Is the world dark (light ink on night) or light (dark ink on paper)? Picks the logo's colours. */
    tone: "dark" | "light";
    /** How Gloam is drawn ("rig" = the animated painted rig in `rig`) */
    gloamSkin: "storybook" | "rig";
    /** This age's own animated Gloam: a painted body + rig file (see lib/gloam-rig) */
    rig?: RigSpec;
    /** 0..1, scales idle motion, hops, flicker */
    motion: number;
    /** Gloam's text gets bouncier (Shantell) or more casual (Recursive) with mood */
    voiceAxis: "bounce" | "casual";
    /** Show each candle's name under it (younger), or only on hover/tap (cleaner, older) */
    candleLabels: boolean;
    /** The adventure world (Phase 3). With it, Gloam walks from checkpoint to checkpoint. */
    world?: JourneyWorld;
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
