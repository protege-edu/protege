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
  nosy: "nothing leaves the laptop. i checked. i'm very nosy.",
  bonk: "nope. stays here.",
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

/** The same lines in French (Gloam's French voice: casual Canadian French, still dry, still smugly wrong) */
export const LINES_FR: Record<LineId, string> = {
  theory: "ok, j'ai compris les saisons tout seul. l'été, c'est quand la terre se rapproche du soleil. c'est pas compliqué.",
  smug: "j'ai raison. je le sens. j'ai toujours raison quand j'invente des affaires.",
  lean: "attends. donc c'est pas une question de distance. c'est l'inclinaison?",
  eureka: "ohhh. l'inclinaison. bon. BON. t'as raison. je déteste ça.",
  turn: "nouveau sujet. je suis encore mêlé. c'est un peu mon truc.",
  wrong: "tu vois? je le savais. je suis pratiquement un scientifique.",
  half: "plus vite où? dans la cuillère? hors de ma main? il m'en faut plus.",
  right: "ohhh. la cuillère me vole ma chaleur. impoli. mais je comprends.",
  finale: "tu m'as appris les saisons. maintenant, apprends-moi tout le reste.",
  nosy: "rien ne quitte le portable. j'ai vérifié. je suis très fouineux.",
  bonk: "non. ça reste ici.",
  mini: "attends. donc la cuillère me vole ma chaleur?",
  soundOn: "oh. t'as allumé ma voix. choix audacieux.",
  poke1: "touche pas au savant, s'il te plaît.",
  poke2: "je réfléchis. ça paraît pas, mais je réfléchis.",
  poke3: "ça, c'est ma face.",
  poke4: "impoli. vrai, mais impoli.",
  poke5: "si tu veux m'apprendre quelque chose, utilise des mots.",
};

/** Gloam's lines in the page's language */
export const linesFor = (lang: string): Record<LineId, string> => (lang === "fr" ? LINES_FR : LINES);
