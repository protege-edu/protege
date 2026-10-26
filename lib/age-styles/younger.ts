import type { AgeStyle } from "./types";

/**
 * The younger age styles. They exist so nothing in the app is hard-wired to high school,
 * but they are NOT polished yet (polished: false). Phase 1 only polishes "senior".
 */

const storybookCopy = (big: boolean): AgeStyle["copy"] => ({
  appName: "Protégé",
  titleCta: big ? "Let's play!" : "Start teaching",
  titleContinue: big ? "Keep playing" : "Continue",
  paused: "Paused",
  close: "Close",
  seeRecap: "What you taught Gloam",
  you: "You",
  gloamName: "Gloam",
  charsLeft: (n) => `${n} letters left`,
  titleHelp: big ? "What do I do?" : "How this works",
  forTeachers: "For teachers",
  chapter: (n) => `Chapter ${n}`,
  trailMap: "Map",
  mapHere: "Gloam is at",
  mapEnd: "the end of the path!",
  trickLearned: (level) =>
    ({
      2: "New trick: Gloam can twirl its lantern!",
      3: "New trick: Gloam hums a little song!",
      4: "New trick: Gloam has a firefly friend!",
      5: "New trick: Gloam does a big ta-da pose!",
    })[level] ?? null,
  introNext: "Next",
  introDone: big ? "Let's go!" : "Let's start",
  introSkip: "Skip",
  intro: (topic, candles) => [
    { mood: "sheepish", text: big ? "Oh! Hi! I'm Gloam. I was napping." : "Oh! Hi. I'm Gloam. Sorry, I was asleep. I do that a lot." },
    { mood: "confused", text: big ? "See my lantern? It glows when I learn things. Right now it's dark." : "See the lantern on my head? It glows when I understand stuff. Right now it's... not glowing." },
    { mood: "skeptical", text: big ? `Today we learn about "${topic}". I have some ideas. They might be wrong!` : `Today's thing is "${topic}". I have some theories. They might be bad.` },
    { mood: "excited", text: big ? `You teach me! Every time I learn something, a candle lights up. There are ${candles}!` : `So here's the deal: YOU teach ME. Every idea I get lights one of the ${candles} candles.` },
  ],
  inputPlaceholder: big ? "Tell Gloam…" : "Explain it to Gloam in your own words…",
  inputLabel: "Explain it to Gloam",
  sendButton: big ? "Tell Gloam" : "Teach Gloam",
  inputHint: big ? "" : "Press Enter to send. Shift+Enter adds a new line.",
  firstHint: big ? "Is Gloam right? Tell it why!" : "Not sure how to start? Tell Gloam if its theory is right, and why.",
  log: "Conversation",
  pause: "Pause",
  resume: "Keep going",
  howItWorksTitle: "You're the teacher!",
  howItWorks: (topic, candles) => [
    `Gloam is mixed up about "${topic}". Help it understand by explaining in your own words.`,
    `When Gloam understands something, a candle lights up. Light all ${candles}!`,
    "There are no wrong turns. If you're stuck, tell Gloam. It's stuck too.",
  ],
  sound: (on) => `Sound: ${on ? "on" : "off"}`,
  startOver: "Start over",
  startOverConfirm: "Yes, start over",
  candleLabel: "What Gloam understands",
  gloamThinks: "Gloam thinks:",
  levelWords: ["Not lit yet", "A little spark", "Flickering", "Lit"],
  eurekaWord: "OHHHH!",
  finaleWord: "THE WHOLE VALLEY!",
  credit: (concept) => `You taught Gloam: ${concept.toLowerCase()}!`,
  finaleCredit: "You taught Gloam everything!",
  skip: "Skip",
  recapTitle: "What you taught Gloam",
  recapIntro: "Here are the big ideas:",
  teachAgain: "Teach Gloam again",
  backToTitle: "Back to the start",
  offlineTitle: "Gloam fell asleep.",
  offlineBody: "Gloam's brain (the AI) isn't running. Ask your teacher to start Ollama, then press Try again.",
  offlineRetryBody: (tries) => `Still asleep (tried ${tries} ${tries === 1 ? "time" : "times"}). Ask your teacher to check Ollama.`,
  retry: "Try again",
  titleJoin: big ? "Find my class" : "Join your class",
  slowDown: big ? "Whoa! One at a time, please!" : "whoa, slow down! one at a time. my brain is tiny.",
  journalLevel: (level) => `Gloam's lantern: level ${level}`,
  levelUpTitle: big ? "Gloam's lantern got bigger!" : "Gloam's lantern grew!",
  levelBadge: (level) => `Level ${level}!`,
  journalTaught: (light, toGo) =>
    big
      ? `You taught Gloam ${light} ${light === 1 ? "thing" : "things"}!${toGo !== null ? ` ${toGo} more and its lantern gets bigger!` : ""}`
      : `You've taught Gloam ${light} ${light === 1 ? "idea" : "ideas"} so far.${toGo !== null ? ` ${toGo} more and its lantern grows again.` : ""}`,
  queued: (ahead) =>
    big
      ? ahead === 0
        ? "I'm next! Here I go…"
        : `${ahead} Gloams are thinking first. Then me!`
      : ahead === 0
        ? "i'm next! warming up my brain…"
        : `${ahead} gloams in line ahead of me. i'm doing stretches.`,
  titlePractice: big ? "Just play" : "Practice first",
  toMyGloam: "My Gloam",
  join: {
    codeTitle: big ? "Find your class" : "Join your class",
    codeLabel: "Class code",
    codeHint: big ? "Your teacher will show you. It looks like GLOW-42." : "Your teacher has it. It looks like GLOW-42.",
    codeButton: big ? "Go!" : "Find my class",
    codeWrong: big ? "Hmm, that code didn't work. Ask your teacher to check it." : "That code doesn't open a class. Check it with your teacher.",
    whoTitle: big ? "Which one is you?" : "Which one are you?",
    whoHint: (name) => (big ? `${name}! Tap your name.` : `${name}! Tap your nickname, then your secret pictures.`),
    whoNew: big ? "I'm new!" : "I'm new here",
    nickTitle: big ? "Pick a fun name" : "Pick a nickname",
    nickLabel: big ? "Fun name" : "Nickname",
    nickHint: big ? "Not your real name! Tap \"Surprise me\" for one." : "Not your real name. It's what Gloam and your class will see.",
    nickSurprise: "Surprise me",
    nickButton: big ? "That's me!" : "That's me",
    keyTitle: (n) => (big ? `Pick ${n} secret pictures` : `Pick ${n} secret pictures`),
    keyHint: big ? "Remember them! They let you back in." : "In order. They're how you get back in, so keep them secret.",
    keyCount: (picked, n) => `${picked} of ${n}`,
    keyClear: "Start over",
    keyRememberTitle: big ? "Your secret pictures!" : "Remember these, in this order",
    keyRememberHint: big ? "Next time, tap your name, then these." : "Next time, tap your nickname and these pictures.",
    keyRememberButton: big ? "I'll remember!" : "I'll remember",
    keyRedo: big ? "Pick again" : "Pick different ones",
    keyEnterTitle: (nick) => (big ? `Hi ${nick}! Tap your secret pictures.` : `${nick}, your secret pictures?`),
    keyEnterHint: big ? "In order!" : "Tap them in order.",
    keyResetHint: big ? "Your teacher gave you new pictures to pick. Pick them and remember them!" : "Your teacher reset your pictures. Pick new ones, in order, and remember them.",
    google: "Continue with Google",
    googleNick: "Google only tells Protégé it's you. Pick the nickname your class will see.",
    back: "Back",
    pictures: { moon: "Moon", fern: "Fern", lantern: "Lantern", owl: "Owl", star: "Star", mushroom: "Mushroom", leaf: "Leaf", moth: "Moth", stone: "Stones" },
    pictureGroup: "Secret pictures",
    pictureOrder: "Your secret pictures, in order",
    slotEmpty: "empty",
    slotPicked: "picked",
    gloam: big
      ? {
          code: "Hi! What's your class code?",
          typing: "Ooh, letters!",
          wrong: "Hmm! That one didn't work.",
          found: (name) => `${name}! Yay!`,
          nick: "What should I call you?",
          key: "Pick your secret pictures! I won't peek.",
          remember: "Can you remember them? I can't!",
          welcome: (nick) => `Hi ${nick}! I'm Gloam!`,
          welcomeBack: (nick) => `${nick}! You came back! Yay!`,
        }
      : {
          code: "a code! very secret. very official.",
          typing: "ooh, keep going…",
          wrong: "nope. that code is a mystery to me too.",
          found: (name) => `${name}! i've heard great things. probably.`,
          nick: "pick a good one. i'll be yelling it a lot.",
          key: "secret pictures! i'm not looking. okay i'm looking a little.",
          remember: "i already forgot them. you better not!",
          welcome: (nick) => `${nick}! what a name. i'm gloam!`,
          welcomeBack: (nick) => `${nick}!! you're back! i totally didn't miss you. (i did.)`,
        },
  },
  home: {
    title: (nick) => `${nick}'s Gloam`,
    level: (level) => `Level ${level}`,
    levelHint: big ? "Gloam's lantern grows when you teach it!" : "Its lantern grows with every idea you teach it.",
    tricksTitle: big ? "Gloam can…" : "Tricks Gloam knows",
    trickNames: big
      ? { spin: "Twirl its lantern", hum: "Hum a song", firefly: "Play with a firefly", pose: "Do a ta-da pose" }
      : { spin: "Twirls its lantern", hum: "Hums a little song", firefly: "Has a firefly friend", pose: "Does a big pose" },
    noTricks: big ? "No tricks yet. Teach Gloam to see one!" : "No tricks yet. Teach it a few ideas and see what happens!",
    lessonsTitle: big ? "Things to teach" : "Lessons",
    lessonNew: "New",
    lessonProgress: (lit, total) => `${lit} of ${total} ${big ? "candles" : "ideas"} lit`,
    lessonDone: big ? "All done!" : "All lit",
    start: big ? "Let's go!" : "Start",
    keepGoing: "Keep going",
    visit: big ? "Play again" : "Visit again",
    noLessons: big ? "Nothing here yet. Your teacher will add something soon!" : "Nothing to teach yet. Your teacher will add a lesson.",
    journalTitle: big ? "Things you taught Gloam" : "What you've taught Gloam",
    journalEmpty: big ? "Nothing yet! When you teach Gloam, it goes here." : "Empty for now. Every idea you teach Gloam gets written here.",
    signOut: big ? "I'm done" : "Sign out",
    paused: big ? "Your teacher paused the game. Gloam is having a nap!" : "Your teacher paused the class. Gloam is napping until they're back.",
    hello: (nick) =>
      big
        ? [`Hi ${nick}! Let's learn!`, "You're back! I missed you!", "Look, my lantern got bigger!", "I'm ready! Are you?"]
        : [`${nick}! finally. i have SO many wrong ideas to show you.`, "you're back! i practised. it didn't help.", "my lantern's bigger than last time. that's your fault.", "ready when you are. i am not ready."],
  },
});

const storybookLines = (simple: boolean): AgeStyle["lines"] => ({
  thinking: simple ? ["Hmm…", "Thinking…", "Let me think!"] : ["hmm…", "thinking so hard my stalk hurts", "processing… processing… ow."],
  almost: ["Ooh?", "Wait…"],
  clicking: ["WAIT.", "Ooh ooh ooh!"],
  nudge: ["Okay! {question}", "Ooh, tell me more! {question}", "I'm listening! {question}"],
  stuck: ["That's okay! I'm stuck too. {question}", "Let's try an easier one. {question}"],
  askedForAnswer: ["I don't know it! That's why I need you. {question}", "If I knew, my lantern would glow! {question}"],
  offTopic: ["Ha! Back to {topic}? {question}", "That sounds fun! But I'm still stuck on {topic}. {question}"],
  insulted: ["Hey, that's not nice! But I still need your help. {question}", "Ouch! I forgive you. {question}"],
  blocked: ["Let's keep it school-friendly! {question}", "Hmm, let's talk about {topic} instead. {question}"],
  care: "That sounds really hard. Please tell your teacher or a grown-up you trust how you're feeling. They want to help.",
  victoryLap: ["Look how bright my lantern is! You did that!", "I understand it now, because of you!"],
  welcomeBack: simple ? ["You came back! I waited by the candle!"] : ["you're back! i saved your spot by the candle."],
  levelUp: simple ? ["My lantern got BIGGER! Because of you!"] : ["whoa, my lantern grew! that's all your teaching!"],
  copied: simple
    ? ["Those are big words! Can you tell me in your words?", "Hmm, say it like you'd tell a friend!"]
    : ["whoa, that sounds like a textbook. say it your way? i learn better from you.", "that's a lot of fancy words. how would YOU explain it?"],
  brainGlitch: ["Oops, I got mixed up. Can you say that again?"],
});

export const little: AgeStyle = {
  id: "little",
  label: "Grades K–2",
  teacherBlurb: "A gentle, silly Gloam with tiny words, big buttons and 2 secret pictures to sign in.",
  grades: [0, 2],
  polished: false,
  voice: {
    persona: "You are Gloam, a small, round, friendly creature with a lantern on your head. You are silly, playful and gentle, like a funny friend in a picture book.",
    rules: ["use very short, simple words a 6 year old knows.", "1 or 2 very short sentences, under 15 words.", "be warm, silly and kind.", "never mock the student."],
    banned: ["stupid", "dumb", "hate"],
    maxWords: 15,
    lowercase: false,
  },
  lines: storybookLines(true),
  copy: storybookCopy(true),
  look: { theme: "little", tone: "light", gloamSkin: "storybook", motion: 1, voiceAxis: "bounce", candleLabels: true },
  celebrate: { style: "big", particles: 60 },
  safety: { level: "strict" },
  input: { modes: ["type", "choices", "voice"], targetScale: 1.4, readAloud: true },
};

export const junior: AgeStyle = {
  ...little,
  id: "junior",
  label: "Grades 3–5",
  teacherBlurb: "A playful, slightly silly Gloam with simple words and big buttons.",
  grades: [3, 5],
  voice: {
    persona: "You are Gloam, a small, round creature with a lantern on your head. You are playful, curious and a bit silly.",
    rules: ["use simple words a 9 year old knows.", "1 to 2 short sentences, under 22 words.", "be funny and kind.", "never mock the student."],
    banned: ["stupid", "dumb", "hate"],
    maxWords: 22,
    lowercase: false,
  },
  look: { theme: "junior", tone: "light", gloamSkin: "storybook", motion: 1, voiceAxis: "bounce", candleLabels: true },
  input: { modes: ["type", "choices"], targetScale: 1.2, readAloud: true },
};

export const middle: AgeStyle = {
  id: "middle",
  label: "Grades 6–8",
  teacherBlurb: "A goofy, dramatic Gloam who loves its own bad theories.",
  grades: [6, 8],
  polished: false,
  voice: {
    persona: "You are Gloam: a small, round, dramatic creature with a lantern on your head. You are goofy, theatrical and confidently wrong, and you love your own bad theories.",
    rules: ["talk like a 12 year old: casual, short sentences, some CAPS for drama.", "1 to 3 short sentences, under 40 words.", "never mock the student.", "never say you're an AI."],
    banned: ["cat in a sunbeam", "hoodie", "burnt toast"],
    maxWords: 40,
    lowercase: false,
  },
  lines: storybookLines(false),
  copy: storybookCopy(false),
  look: { theme: "middle", tone: "light", gloamSkin: "storybook", motion: 1, voiceAxis: "bounce", candleLabels: true },
  celebrate: { style: "big", particles: 40 },
  safety: { level: "standard" },
  input: { modes: ["type"], targetScale: 1, readAloud: false },
};
