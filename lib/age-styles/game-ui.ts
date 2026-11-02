import type { Feat } from "@/lib/game/feats";
import type { OutfitId, StashId } from "@/lib/game/stash";
import { gameLines } from "./game-lines";
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
  /** the line under its name when it arrives */
  bossIntro: string;
  /** clean hits in a row, on the boss card */
  combo: (n: number) => string;
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
  /** the end of a lesson: the feats this student earned, and what each one means */
  featsTitle: string;
  feats: Record<Feat, { name: string; why: string }>;
  /** Gloam's stash: things to buy with fireflies for Gloam's home */
  stashTitle: string;
  stashIntro: string;
  stash: Record<StashId, string>;
  buy: (price: number) => string;
  putOut: string;
  putAway: string;
  need: (n: number) => string;
  youHave: (n: number) => string;
  /** all the spots beside Gloam are taken */
  full: string;
  /** things Gloam wears (it can wear all of them at once), and things for its place */
  wearTitle: string;
  placeTitle: string;
  outfits: Record<OutfitId, string>;
  putOn: string;
  takeOff: string;
  /** what Gloam says when it puts on something new (hand-written, in its voice) */
  wore: string[];
  /** the whole-class boss the teacher starts from the projector */
  classBoss: string;
  classBossHint: string;
  /** this student's explanation hit it */
  classBossHit: string;
  /** the class beat it: this student helped, and gets fireflies for it */
  classBossBeaten: (n: number) => string;
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
    bossIntro: age === "senior" ? "it feeds on wrong ideas. you have the light." : little ? "Uh oh! It wants Gloam's light! Tell it the truth!" : "it feeds on wrong ideas. blast it with the truth!",
    combo: (n) => (little ? `${n} in a row!` : `${n} in a row`),
    bossPlaceholder: little ? "Tell the cloud the truth!" : "Hit it with the truth…",
    bossRounds: (cleared, total) => `${cleared} of ${total} wrong ideas cleared`,
    skip: little ? "Skip this one" : "Skip this one",
    pickedSaid: (line) => (little ? `This one is silly: "${line}"` : `This one's wrong: "${line}"`),
    orderSaid: little ? "I put the cards in order!" : "I put the cards in order.",
    stopSaid: "Stop!",
    jar: (n) => `${n} ${n === 1 ? "firefly" : "fireflies"} in Gloam's jar`,
    caught: (n) => `+${n}`,
    featsTitle: little ? "Your stickers" : "Feats",
    feats: featsEn(age),
    stashTitle: "Gloam's stash",
    stashIntro: age === "senior" ? "Fireflies you caught by teaching. Spend them on things for Gloam's place. It pretends not to care." : little ? "You caught these fireflies by teaching! Get Gloam a present!" : "You caught these by teaching. Get Gloam something for its spot!",
    stash: age === "senior" ? { books: "A stack of books", stool: "A mushroom stool", kite: "A patchwork kite", telescope: "A telescope", tent: "A little tent" } : { books: "A pile of books", stool: "A mushroom seat", kite: "A kite", telescope: "A telescope", tent: "A tent" },
    buy: (price) => `Get it for ${price}`,
    putOut: "Put it out",
    putAway: "Put it away",
    need: (n) => `${n} more ${n === 1 ? "firefly" : "fireflies"}`,
    youHave: (n) => `You have ${n} ${n === 1 ? "firefly" : "fireflies"}`,
    full: little ? "Gloam's spot is full! Put something away first." : "Three things fit beside Gloam. Put one away to put this out.",
    wearTitle: age === "senior" ? "Things Gloam will grudgingly wear" : little ? "Dress up Gloam!" : "Things for Gloam to wear",
    placeTitle: age === "senior" ? "Things for Gloam's spot" : little ? "Presents for Gloam's home" : "Things for Gloam's place",
    outfits:
      age === "senior"
        ? { glasses: "Round glasses", scarf: "A knitted scarf", beanie: "A slouchy beanie", cape: "A cape (for drama)" }
        : age === "middle"
          ? { glasses: "Giant glasses", scarf: "A scarf", beanie: "A beanie", cape: "A DRAMATIC CAPE" }
          : { glasses: "Funny glasses", scarf: "A stripy scarf", beanie: "A hat with a pom-pom", cape: "A super cape" },
    putOn: little ? "Put it on Gloam" : "Put it on",
    takeOff: "Take it off",
    wore:
      age === "senior"
        ? ["i look ridiculous. i love it. tell no one.", "fine. it's warm. that's the only reason.", "do not take a picture. ...okay, one picture."]
        : age === "middle"
          ? ["BEHOLD. THE NEW ME.", "I have never looked this good. Ever.", "This changes EVERYTHING."]
          : ["Ooh! Do I look fancy?", "I love it! Thank you!", "I feel so cozy!"],
    classBoss: age === "little" ? "The class cloud" : "The class Muddle",
    classBossHint: age === "senior" ? "It's on the projector. Every clear explanation in your class hits it." : little ? "Teach Gloam well to help your class zap it!" : "It's on the projector! Every clear explanation in your class blasts it!",
    classBossHit: age === "senior" ? "Hit. The class Muddle felt that." : age === "middle" ? "BAM! You hit the class Muddle!" : age === "little" ? "Zap! You helped your class!" : "You hit the class Muddle!",
    classBossBeaten: (n) => (age === "senior" ? `Your class beat the Muddle. +${n} fireflies for helping.` : age === "middle" ? `YOUR CLASS DESTROYED THE MUDDLE! +${n} fireflies!` : `Your class did it! +${n} fireflies!`),
  };
};

/** The feats' names: deadpan for high school, dramatic for 6-8, sticker-bright for the little ones */
function featsEn(age: AgeStyleId): GameUi["feats"] {
  const rival = gameLines(age, "en").rival;
  const R = rival[0].toUpperCase() + rival.slice(1);
  if (age === "senior")
    return {
      untouchable: { name: "Untouchable", why: "Beat the Muddle without a single miss." },
      bossBeaten: { name: "Fog clearer", why: "Beat the Muddle." },
      rivalFirstTry: { name: "Corvin, humbled", why: "Won the argument on the first try." },
      sharpEye: { name: "Peer reviewed", why: "Spotted Gloam's mistake straight away." },
      sawItComing: { name: "Saw it coming", why: "Got the what-if on the first try." },
      chain: { name: "Cause and effect", why: "Put the cards in order the first time." },
      objection: { name: "Objection sustained", why: "Stopped Gloam's mistake and fixed it first go." },
      noShortcuts: { name: "No shortcuts", why: "Won every challenge. Skipped nothing." },
    };
  if (age === "middle")
    return {
      untouchable: { name: "FLAWLESS", why: "Destroyed the Muddle without one miss!" },
      bossBeaten: { name: "Storm breaker", why: "Beat the Muddle!" },
      rivalFirstTry: { name: `${R}: defeated`, why: "Won the argument first try!" },
      sharpEye: { name: "Eagle eye", why: "Found Gloam's mistake instantly!" },
      sawItComing: { name: "Fortune teller", why: "Predicted the what-if first try!" },
      chain: { name: "Chain reaction", why: "Cards in order, first time!" },
      objection: { name: "OBJECTION!", why: "Stopped Gloam's mistake and fixed it!" },
      noShortcuts: { name: "No shortcuts", why: "Won every single challenge!" },
    };
  return {
    untouchable: { name: "Cloud buster!", why: "You popped the cloud and never missed!" },
    bossBeaten: { name: "Cloud popper!", why: "You beat the grumpy cloud!" },
    rivalFirstTry: { name: `Fooled ${R}!`, why: `You showed ${R} the truth right away!` },
    sharpEye: { name: "Super spotter!", why: "You found the silly note right away!" },
    sawItComing: { name: "Mind reader!", why: "You knew what would happen!" },
    chain: { name: "Card champ!", why: "You put the cards in order!" },
    objection: { name: "Stop sign!", why: "You stopped Gloam and fixed it!" },
    noShortcuts: { name: "Super teacher!", why: "You did every single challenge!" },
  };
}

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
    bossIntro: age === "senior" ? "elle se nourrit d'idées fausses. toi, t'as la lumière." : little ? "Oh non! Il veut la lumière de Gloam! Dis-lui la vérité!" : "elle se nourrit d'idées fausses. frappe-la avec la vérité!",
    combo: (n) => `${n} de suite`,
    bossPlaceholder: little ? "Dis la vérité au nuage!" : "Frappe-la avec la vérité…",
    bossRounds: (cleared, total) => `${cleared} idées fausses dissipées sur ${total}`,
    skip: "Passer celle-ci",
    pickedSaid: (line) => (little ? `Celle-ci est drôle : « ${line} »` : `Celle-ci est fausse : « ${line} »`),
    orderSaid: "J'ai mis les cartes en ordre.",
    stopSaid: "Stop!",
    jar: (n) => `${n} ${n <= 1 ? "luciole" : "lucioles"} dans le pot de Gloam`,
    caught: (n) => `+${n}`,
    featsTitle: little ? "Tes autocollants" : "Exploits",
    feats: featsFr(age),
    stashTitle: "La réserve de Gloam",
    stashIntro: age === "senior" ? "Les lucioles que t'as attrapées en enseignant. Dépense-les pour le coin de Gloam. Il fait semblant de s'en ficher." : little ? "Tu as attrapé ces lucioles en enseignant! Offre un cadeau à Gloam!" : "Tu les as attrapées en enseignant. Offre quelque chose à Gloam pour son coin!",
    stash: { books: "Une pile de livres", stool: "Un tabouret champignon", kite: "Un cerf-volant", telescope: "Un télescope", tent: "Une petite tente" },
    buy: (price) => `L'avoir pour ${price}`,
    putOut: "Le sortir",
    putAway: "Le ranger",
    need: (n) => `encore ${n} ${n <= 1 ? "luciole" : "lucioles"}`,
    youHave: (n) => `Tu as ${n} ${n <= 1 ? "luciole" : "lucioles"}`,
    full: little ? "Le coin de Gloam est plein! Range quelque chose d'abord." : "Trois choses tiennent à côté de Gloam. Ranges-en une pour sortir celle-ci.",
    wearTitle: age === "senior" ? "Ce que Gloam acceptera de porter (à contrecœur)" : little ? "Habille Gloam!" : "Des choses à porter pour Gloam",
    placeTitle: age === "senior" ? "Pour le coin de Gloam" : little ? "Des cadeaux pour la maison de Gloam" : "Des choses pour le coin de Gloam",
    outfits:
      age === "senior"
        ? { glasses: "Des lunettes rondes", scarf: "Un foulard tricoté", beanie: "Une tuque", cape: "Une cape (pour le drame)" }
        : age === "middle"
          ? { glasses: "Des lunettes géantes", scarf: "Un foulard", beanie: "Une tuque", cape: "UNE CAPE DRAMATIQUE" }
          : { glasses: "Des lunettes rigolotes", scarf: "Un foulard à rayures", beanie: "Une tuque à pompon", cape: "Une super cape" },
    putOn: little ? "La mettre à Gloam" : "La mettre",
    takeOff: "L'enlever",
    wore:
      age === "senior"
        ? ["j'ai l'air ridicule. j'adore. dis-le à personne.", "bon. c'est chaud. c'est la seule raison.", "pas de photo. ...bon, une photo."]
        : age === "middle"
          ? ["CONTEMPLEZ. LE NOUVEAU MOI.", "J'ai jamais été aussi beau. Jamais.", "Ça change TOUT."]
          : ["Oh! Je suis chic?", "J'adore! Merci!", "Je me sens tout douillet!"],
    classBoss: age === "little" ? "Le nuage de la classe" : "La Brume de la classe",
    classBossHint: age === "senior" ? "Elle est au projecteur. Chaque explication claire de ta classe la frappe." : little ? "Enseigne bien à Gloam pour aider ta classe à le chasser!" : "Elle est au projecteur! Chaque explication claire de ta classe la frappe!",
    classBossHit: age === "senior" ? "Touché. La Brume de la classe l'a senti." : age === "middle" ? "BAM! Tu as frappé la Brume de la classe!" : age === "little" ? "Zap! Tu as aidé ta classe!" : "Tu as frappé la Brume de la classe!",
    classBossBeaten: (n) => (age === "senior" ? `Ta classe a vaincu la Brume. +${n} lucioles pour ton aide.` : age === "middle" ? `TA CLASSE A PULVÉRISÉ LA BRUME! +${n} lucioles!` : `Ta classe a réussi! +${n} lucioles!`),
  };
};

function featsFr(age: AgeStyleId): GameUi["feats"] {
  const rival = gameLines(age, "fr").rival;
  const R = rival[0].toUpperCase() + rival.slice(1);
  if (age === "senior")
    return {
      untouchable: { name: "Intouchable", why: "La Brume vaincue sans un seul raté." },
      bossBeaten: { name: "Chasse-brume", why: "La Brume est vaincue." },
      rivalFirstTry: { name: "Corvin, remis à sa place", why: "Débat gagné du premier coup." },
      sharpEye: { name: "Révisé par les pairs", why: "L'erreur de Gloam repérée tout de suite." },
      sawItComing: { name: "Je l'avais vu venir", why: "Le « et si? » réussi du premier coup." },
      chain: { name: "Cause et effet", why: "Les cartes en ordre du premier coup." },
      objection: { name: "Objection retenue", why: "L'erreur de Gloam arrêtée et corrigée du premier coup." },
      noShortcuts: { name: "Aucun raccourci", why: "Tous les défis gagnés. Rien de sauté." },
    };
  if (age === "middle")
    return {
      untouchable: { name: "PARFAIT", why: "La Brume pulvérisée sans un raté!" },
      bossBeaten: { name: "Briseur de tempête", why: "La Brume est vaincue!" },
      rivalFirstTry: { name: `${R} : vaincu`, why: "Débat gagné du premier coup!" },
      sharpEye: { name: "Œil de lynx", why: "L'erreur de Gloam trouvée en un éclair!" },
      sawItComing: { name: "Voyant", why: "Le « et si? » deviné du premier coup!" },
      chain: { name: "Réaction en chaîne", why: "Les cartes en ordre du premier coup!" },
      objection: { name: "OBJECTION!", why: "L'erreur de Gloam arrêtée et corrigée!" },
      noShortcuts: { name: "Aucun raccourci", why: "Tous les défis gagnés!" },
    };
  return {
    untouchable: { name: "Chasse-nuage!", why: "Tu as fait éclater le nuage sans jamais rater!" },
    bossBeaten: { name: "Pop le nuage!", why: "Tu as battu le nuage grognon!" },
    rivalFirstTry: { name: `${R} attrapé!`, why: `Tu as montré la vérité à ${R} tout de suite!` },
    sharpEye: { name: "Super détective!", why: "Tu as trouvé la note drôle tout de suite!" },
    sawItComing: { name: "Liseur de pensées!", why: "Tu savais ce qui allait arriver!" },
    chain: { name: "Champion des cartes!", why: "Tu as mis les cartes en ordre!" },
    objection: { name: "Panneau stop!", why: "Tu as arrêté Gloam et corrigé!" },
    noShortcuts: { name: "Super prof!", why: "Tu as fait tous les défis!" },
  };
}

export function gameUi(age: AgeStyleId, lang: Language = "en"): GameUi {
  return lang === "fr" ? fr(age) : en(age);
}
