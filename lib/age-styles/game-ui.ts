import type { AgeStyleId, Language } from "./types";

/**
 * The words on the game layer's screens (not what the characters say: that's game-lines.ts).
 * Plain, sentence case, and buttons say exactly what they do. Per age, in English and French.
 */
export interface GameUi {
  notebookTitle: string;
  notebookHint: string;
  notebookFix: string;
  rivalHint: string;
  rivalPlaceholder: string;
  whatifTitle: string;
  whatifPlaceholder: string;
  recitalTitle: string;
  stop: string;
  recitalPlaceholder: string;
  orderTitle: string;
  orderHint: string;
  orderDone: string;
  orderPlaceholder: string;
  moveUp: (card: string) => string;
  moveDown: (card: string) => string;
  bossTitle: string;
  bossPlaceholder: string;
  /** the boss's rounds, as fog that clears (no numbers on screen; this is for screen readers) */
  bossRounds: (cleared: number, total: number) => string;
  skip: string;
  /** how a move reads in the conversation */
  pickedSaid: (line: string) => string;
  orderSaid: string;
  stopSaid: string;
  /** the jar */
  jar: (n: number) => string;
  caught: (n: number) => string;
}

const en = (age: AgeStyleId): GameUi => {
  const little = age === "little" || age === "junior";
  return {
    notebookTitle: "Gloam's notes",
    notebookHint: little ? "One line is silly. Tap it!" : "One of these is wrong. Tap it.",
    notebookFix: little ? "What should it say?" : "Fix Gloam's note…",
    rivalHint: little ? "Who's right? Tell Gloam!" : "Win Gloam back. Explain why that's wrong.",
    rivalPlaceholder: little ? "Tell Gloam why…" : "Win Gloam back…",
    whatifTitle: "What if…?",
    whatifPlaceholder: little ? "What would happen?" : "What would happen, and why?",
    recitalTitle: little ? "Gloam's show" : "Gloam's presentation",
    stop: "Stop!",
    recitalPlaceholder: little ? "What did Gloam get wrong?" : "What's wrong with it?",
    orderTitle: little ? "Gloam's cards" : "Put it in order",
    orderHint: little ? "Put the cards in order!" : "Move the cards into the right order.",
    orderDone: little ? "This is the order!" : "Check the order",
    orderPlaceholder: little ? "Why does this come next?" : "Why does one lead to the next?",
    moveUp: (card) => `Move earlier: ${card}`,
    moveDown: (card) => `Move later: ${card}`,
    bossTitle: little ? "The grumpy cloud" : "The Muddle",
    bossPlaceholder: little ? "Tell the cloud the truth!" : "Hit it with the truth…",
    bossRounds: (cleared, total) => `${cleared} of ${total} wrong ideas cleared`,
    skip: little ? "Skip this one" : "Skip this one",
    pickedSaid: (line) => (little ? `This one is silly: "${line}"` : `This one's wrong: "${line}"`),
    orderSaid: little ? "I put the cards in order!" : "I put the cards in order.",
    stopSaid: "Stop!",
    jar: (n) => `${n} ${n === 1 ? "firefly" : "fireflies"} in Gloam's jar`,
    caught: (n) => `+${n}`,
  };
};

const fr = (age: AgeStyleId): GameUi => {
  const little = age === "little" || age === "junior";
  return {
    notebookTitle: "Les notes de Gloam",
    notebookHint: little ? "Une ligne est drôle. Touche-la!" : "Une de ces lignes est fausse. Touche-la.",
    notebookFix: little ? "Elle devrait dire quoi?" : "Corrige la note de Gloam…",
    rivalHint: little ? "Qui a raison? Dis-le à Gloam!" : "Ramène Gloam de ton bord. Explique pourquoi c'est faux.",
    rivalPlaceholder: little ? "Dis à Gloam pourquoi…" : "Ramène Gloam de ton bord…",
    whatifTitle: "Et si…?",
    whatifPlaceholder: little ? "Qu'est-ce qui arriverait?" : "Qu'est-ce qui arriverait, et pourquoi?",
    recitalTitle: little ? "Le spectacle de Gloam" : "La présentation de Gloam",
    stop: "Stop!",
    recitalPlaceholder: little ? "Qu'est-ce que Gloam a mal dit?" : "Qu'est-ce qui cloche?",
    orderTitle: little ? "Les cartes de Gloam" : "Remets en ordre",
    orderHint: little ? "Mets les cartes en ordre!" : "Place les cartes dans le bon ordre.",
    orderDone: little ? "C'est le bon ordre!" : "Vérifier l'ordre",
    orderPlaceholder: little ? "Pourquoi celle-ci vient après?" : "Pourquoi l'une mène à l'autre?",
    moveUp: (card) => `Placer plus tôt : ${card}`,
    moveDown: (card) => `Placer plus tard : ${card}`,
    bossTitle: little ? "Le nuage grognon" : "La Brume",
    bossPlaceholder: little ? "Dis la vérité au nuage!" : "Frappe-la avec la vérité…",
    bossRounds: (cleared, total) => `${cleared} idées fausses dissipées sur ${total}`,
    skip: "Passer celle-ci",
    pickedSaid: (line) => (little ? `Celle-ci est drôle : « ${line} »` : `Celle-ci est fausse : « ${line} »`),
    orderSaid: "J'ai mis les cartes en ordre.",
    stopSaid: "Stop!",
    jar: (n) => `${n} ${n <= 1 ? "luciole" : "lucioles"} dans le pot de Gloam`,
    caught: (n) => `+${n}`,
  };
};

export function gameUi(age: AgeStyleId, lang: Language = "en"): GameUi {
  return lang === "fr" ? fr(age) : en(age);
}
