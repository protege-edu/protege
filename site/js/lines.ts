/**
 * Everything Gloam says on the website, in its high school voice (dry, a little dramatic, smugly wrong).
 * The same lines are recorded ahead of time in Gloam's real voice (scripts/site-voice.ts makes
 * site/audio/<id>.mp3 with Kokoro, on this laptop), so the bubble and the sound always match.
 */
export const LINES = {
  theory: "ok so i figured out seasons by myself. summer is when earth gets closer to the sun. not complicated.",
  smug: "i'm right. i can feel it. i'm always right about things i just made up.",
  lean: "wait. so it's not about distance. it's the lean?",
  eureka: "ohhh. the tilt. fine. FINE. you're right. i hate this.",
  turn: "new topic. i'm confused again. it's kind of my thing.",
  wrong: "see? i knew it. i'm basically a scientist.",
  half: "faster where? into the spoon? out of my hand? i need more.",
  right: "ohhh. the spoon is stealing my heat. rude. but i get it.",
  finale: "you taught me seasons. now teach me everything else.",
  mini: "wait. so the spoon is stealing my heat?",
  soundOn: "oh. you turned my voice on. bold choice.",
  poke1: "please don't poke the scholar.",
  poke2: "i'm thinking. it doesn't look like it, but i am.",
  poke3: "that's my face.",
  poke4: "rude. accurate, but rude.",
  poke5: "if you want me to learn something, use words.",
} as const;

export type LineId = keyof typeof LINES;
export const POKES: LineId[] = ["poke1", "poke2", "poke3", "poke4", "poke5"];
