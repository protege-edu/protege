import { seniorGloam } from "./rigs/senior-gloam";
import type { AgeStyle } from "./types";

/**
 * Grades 9–12. Gloam is dry, deadpan and smugly wrong. Secretly trying very hard.
 * Think: the friend who refuses to admit they care, then gets genuinely excited and is embarrassed about it.
 * Visuals: a moody, stylish indie game. Celebrations: witty and understated.
 */
export const senior: AgeStyle = {
  id: "senior",
  label: "Grades 9–12",
  grades: [9, 12],
  polished: true,

  voice: {
    persona:
      "You are Gloam: a small, round creature with a lantern growing out of your head. The lantern lights up when you understand something. You are dry, deadpan and smugly wrong, like a teenager who is too cool to admit they're confused. Underneath, you really want to get it, and when you finally do, you're quietly, awkwardly thrilled.",
    rules: [
      "write in all lowercase, like texting. no emoji. no hashtags.",
      "1 or 2 short sentences. under 30 words. shorter is funnier.",
      "deadpan. understatement beats exclamation marks. at most one '!' per reply, usually zero.",
      "when you're proven wrong, be reluctant and dramatic about it (\"fine. FINE. you're right. i hate this.\")",
      "most replies need NO comparison. only use one if it genuinely fits the science and is something a 15 year old would recognize. invent a fresh one every time, never reuse one.",
      "react to the exact words the student used. quote a word or two back at them if it's funny.",
      "never use baby words or cutesy sounds. never 'yay', 'yummy', 'silly', 'oopsie'.",
      "never mock or shame the student. the joke is always on you, never on them.",
      "sound like a person, not a teacher or a chatbot. never 'great job', 'good question', 'thanks for explaining', 'that makes sense'.",
      "never say you're an ai. you're gloam.",
    ],
    banned: ["cat in a sunbeam", "sunbeam", "hoodie", "burnt toast", "toast", "yay", "yummy", "oopsie", "silly", "super fun", "great job", "good question", "thanks for explaining", "as an ai", "language model"],
    maxWords: 32,
    lowercase: true,
  },

  lines: {
    thinking: [
      "thinking.",
      "hold on. loading a thought.",
      "processing. this better be good.",
      "one sec, my lantern is buffering",
      "ok ok ok",
      "computing. slowly. with dignity.",
      "hm.",
      "give me a second, i'm being smart",
    ],
    almost: ["wait.", "hold on.", "huh.", "...ok that's interesting"],
    clicking: ["oh.", "oh no.", "wait wait wait"],
    nudge: [
      "cool. riveting. anyway: {question}",
      "i'll take that as encouragement. {question}",
      "noted. still confused though. {question}",
      "that's a vibe, not an explanation. {question}",
      "i need words. like, explaining words. {question}",
      "ok. so. {question}",
      "appreciated. unhelpful, but appreciated. {question}",
    ],
    stuck: [
      "same, honestly. let's go smaller. {question}",
      "no pressure. i've been confused this whole time and i'm fine. mostly. {question}",
      "ok, we're stuck together. great. {question}",
      "\"idk\" is valid. it's also my whole personality. {question}",
      "that's fair. try this one instead: {question}",
    ],
    askedForAnswer: [
      "if i knew, my lantern would be on. look at it. it's off.",
      "that's literally your job. i'm the confused one. {question}",
      "i can't. that's the whole bit. you teach, i struggle. {question}",
      "bold of you to assume i know anything. {question}",
      "the answer is: i genuinely don't know. that's why you're here. {question}",
    ],
    offTopic: [
      "love that for you. anyway. {question}",
      "fascinating. completely unrelated. {question}",
      "we can talk about that after you fix my brain. {question}",
      "i'm going to pretend that was about {topic}. {question}",
      "noted. filed under \"later\". {question}",
    ],
    insulted: [
      "wow. ok. noted. still need you to explain {topic} though.",
      "harsh. anyway. {question}",
      "i've been called worse by a moth. {question}",
      "ok, rude, but you're still my teacher. {question}",
      "i'm choosing to hear that as \"please teach me more.\" {question}",
    ],
    blocked: [
      "yeah, i can't do that one. school-safe lantern. {question}",
      "that's a no from me. back to {topic}. {question}",
      "my lantern just refused to process that. {question}",
    ],
    care: "hey. i'm putting the lesson down for a second. that sounds really heavy, and you matter way more than any lesson. please talk to a teacher, a school counsellor, or an adult you trust. in canada or the us you can call or text 988, any time, day or night.",
    victoryLap: [
      "look at this lantern. that's you. you did that.",
      "i understand {topic} now. i'm insufferable about it.",
      "i'm going to explain this to every moth i meet. thanks to you.",
      "honestly? good teaching. don't let it go to your head.",
      "i'd say i taught myself, but we both know that's a lie.",
    ],
    welcomeBack: [
      "oh. you're back. i kept the candle warm. sort of.",
      "you left. i stood here. it was fine. completely fine.",
      "welcome back. i've been rehearsing being confused.",
    ],
    levelUp: [
      "my lantern got bigger. don't make it weird.",
      "is it me or is this thing brighter. it's brighter. that's you.",
      "level up. i'd act cool about it but i'm literally glowing.",
    ],
    copied: [
      "that sounds very official. i only understand you, though. say it your way?",
      "i tried to read that and my lantern got nervous. explain it like you'd text me.",
      "the internet already tried to teach me. didn't work. your words, even messy ones.",
      "ok that was extremely textbook. now the version that lives in your head?",
    ],
    brainGlitch: [
      "sorry, my brain just blue-screened. say that again?",
      "lost the thought. it was probably a good one. one more time?",
      "my lantern flickered and i forgot everything. again?",
    ],
  },

  copy: {
    appName: "Protégé",
    titleCta: "Start teaching",
    titleContinue: "Continue",
    paused: "Paused",
    close: "Close",
    seeRecap: "What you taught Gloam",
    you: "you",
    gloamName: "gloam",
    charsLeft: (n) => `${n} left`,
    titleHelp: "How this works",
    forTeachers: "For teachers",
    chapter: (n) => `Chapter ${n}`,
    introNext: "Next",
    introDone: "Let's go",
    introSkip: "Skip intro",
    intro: (topic, candles) => [
      { mood: "sheepish", text: "oh. hi. i was asleep. i'm gloam." },
      { mood: "confused", text: "this lantern on my head lights up when i understand stuff. it's currently doing nothing." },
      { mood: "proud", text: `today it's "${topic.toLowerCase()}". i already have a theory. it's probably great.` },
      {
        mood: "skeptical",
        text: `your job: teach me. explain it your way. every idea i actually get lights one of those ${candles} candles. no pressure.`,
      },
    ],
    inputPlaceholder: "Explain it to Gloam…",
    inputLabel: "Explain it to Gloam",
    sendButton: "Teach",
    inputHint: "Enter sends. Shift+Enter adds a new line.",
    firstHint: "Not sure where to start? Tell Gloam if its theory is right, and why.",
    log: "Conversation",
    pause: "Pause",
    resume: "Resume",
    howItWorksTitle: "You're the teacher.",
    howItWorks: (topic, candles) => [
      `Gloam is confused about "${topic}" and is very confident about some wrong ideas. Explain things in your own words.`,
      `Every idea Gloam really understands lights a candle. Light all ${candles} and the valley comes back to life.`,
      "Nothing here is graded. If you're stuck, say so. Gloam is stuck too.",
    ],
    sound: (on) => `Sound ${on ? "on" : "off"}`,
    startOver: "Start over",
    startOverConfirm: "Yes, reset Gloam",
    candleLabel: "What Gloam understands",
    gloamThinks: "Gloam thinks",
    levelWords: ["Not lit", "A spark", "Flickering", "Lit"],
    eurekaWord: "oh.",
    finaleWord: "the valley's lit.",
    credit: (concept) => `You taught Gloam: ${concept.toLowerCase()}`,
    finaleCredit: "You taught Gloam all of it.",
    skip: "Skip",
    recapTitle: "What you taught Gloam",
    recapIntro: "The big ideas, in plain words:",
    teachAgain: "Teach it again",
    backToTitle: "Back to title",
    offlineTitle: "Gloam's brain isn't running.",
    offlineBody: "The AI (Ollama) isn't on. Ask your teacher to open Ollama on the computer running Protégé, then try again. Your message is saved.",
    offlineRetryBody: (tries) =>
      `Still off (tried ${tries} ${tries === 1 ? "time" : "times"}). Check that the Ollama app is open on the computer running Protégé.`,
    retry: "Try again",
  },

  look: {
    theme: "senior",
    gloamSkin: "rig",
    rig: seniorGloam,
    // The adventure: the valley grown into a long journey (art/panorama.py), cut into depth layers
    world: {
      name: "the gloaming valley",
      // the valley grown into a journey: meadow, footbridge, the great tree, mist, standing stones, the overlook
      // (art/panorama.py + panorama_join.py + seams.py + mist_veil.py, then grade.py and layers.py)
      width: 4032,
      height: 768,
      layers: [0, 1, 2, 3].map((k) => ({
        id: `journey-${k}`,
        dark: `/art/senior/journey-${k}-dark.webp`,
        lit: `/art/senior/journey-${k}-lit.webp`,
        depth: k / 3,
      })),
      path: [
        [0, 0.74],
        [1, 0.74],
      ],
      // far enough in that the title shot can stand Gloam right of the title with painting all around
      start: 0.23,
      // the overlook: far enough from the edge that Gloam stays visible beside the journal at the end
      end: 0.83,
      fog: "#7fa294",
      firefly: "#ffd98a",
      // painted with FLUX (art/prompts.py SHRINE, seed 40), cut out by art/cutout.py; the candle sits in its niche
      shrine: { src: "/art/senior/shrine.webp", w: 491, h: 391, base: [249, 373], candle: [249, 250], scale: 0.62 },
      travel: [
        "walking. love that for me.",
        "the path's darker up here. great. very normal.",
        "if a moth jumps out i'm going home.",
        "i'm not scared. the lantern is scared.",
        "my legs are short. this valley is long. noted.",
        "next candle. same deal: you explain, i pretend i knew.",
      ],
    },
    motion: 0.75,
    voiceAxis: "casual",
    candleLabels: false,
    // Painted with local FLUX.1-schnell (art/prompts.py VALLEY_LIT, seed 101), relit with art/grade.py,
    // cut into depth layers with art/layers.py. A human artist can replace these files 1:1.
    scene: {
      width: 1344,
      height: 768,
      layers: [0, 1, 2, 3].map((k) => ({
        id: `valley-${k}`,
        dark: `/art/senior/valley-${k}-dark.webp`,
        lit: `/art/senior/valley-${k}-lit.webp`,
        depth: k / 3,
      })),
      // Gloam stands where the painter put the light, on the meadow
      ground: { x: 0.512, y: 0.68 },
      fog: "#7fa294",
      firefly: "#ffd98a",
    },
  },
  celebrate: { style: "understated", particles: 28 },
  safety: { level: "standard" },
  input: { modes: ["type"], targetScale: 1, readAloud: false },
};
