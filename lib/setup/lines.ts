/**
 * What Gloam says while Protégé sets itself up on the teacher's laptop (app/setup). The teacher's first
 * meeting with Gloam: dry, a little dramatic, never in the way. The facts (sizes, time left) are always in
 * plain words beside these, never only in Gloam's voice.
 */
export const SETUP_LINES = {
  /** first ever start, before anything */
  hello: "oh. hi. i'm Gloam. i'm asleep. mostly.",
  /** Gloam's brain is being found or started */
  checking: "looking for my brain. it's around here somewhere.",
  /** Ollama's installer is downloading */
  brainDownload: [
    "downloading my brain. it's big. i'm worth it.",
    "this is the part where i get smart. eventually.",
    "you can do other things. i'll be here. growing a brain.",
  ],
  brainInstall: "installing my brain. please don't watch, it's personal.",
  brainStart: "brain installed. turning it on. hold on.",
  /** the model is downloading (the long wait): one at a time, slowly */
  model: [
    "learning how to be confused. it's a skill.",
    "some of this is words. most of it is numbers. i don't like the numbers.",
    "i'm not sleeping. i'm downloading. it looks the same.",
    "fun fact: i don't know any facts yet. that's your job.",
    "almost done. that was a lie. i don't know how long this takes.",
    "while you wait: think of something to teach me. something i'll get wrong.",
  ],
  /** the teacher pokes Gloam while it's asleep */
  poked: ["mm. five more minutes.", "i'm up. i'm up. i'm not up.", "rude. accurate, but rude."],
  /** the teacher pokes Gloam while it's awake */
  pokedAwake: ["yes. hello. i'm right here.", "careful. this is a scholar.", "that's my face."],
  account: "while i download, make your account. i'd do it, but i don't have hands. well. i have small hands.",
  voices: "i can also talk out loud. and listen. it's optional. like my opinions.",
  error: "okay. that didn't work. not my fault. probably.",
  /** everything's ready */
  awake: "ok. i'm awake. teach me something. i'm ready to be wrong about it.",
  /** a later start: everything was already set up */
  welcomeBack: "oh. it's you. hi.",
};

/** One of a set of lines, picked by how long we've been waiting (so it changes slowly, not every poll) */
export function lineFor(lines: string[], seconds: number, every = 22): string {
  return lines[Math.floor(seconds / every) % lines.length];
}
