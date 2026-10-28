import type { AccessVoice } from "./access-copy";
import type { LostCopy } from "./types";

/**
 * The lost page: a link that leads nowhere, a lesson that was taken down, or something that broke.
 * Gloam searches the dark valley with the student (their pointer is a pool of moonlight) and says what it
 * finds at each hiding spot. The way out (the buttons) is always there from the first second.
 */
const en: Record<AccessVoice, LostCopy> = {
  senior: {
    missing: {
      title: "There's nothing at this address.",
      body: "The link might have a typo, or what it pointed to was moved. Check the address, or head back from here.",
      lines: [
        "ok. the page isn't here. i looked. briefly.",
        "this is where the page should be. it's not. i'm as shocked as you are.",
        "the page is gone. i didn't take it. check my pockets. i don't have pockets.",
      ],
    },
    gone: {
      title: "This lesson isn't here anymore.",
      body: "Your teacher took it down, or they're still working on it. Everything you taught Gloam is saved. Ask your teacher which lesson to open.",
      lines: ["there was a lesson here. your teacher put it away. i was just getting good at it.", "the lesson left. it didn't even say bye."],
    },
    broke: {
      title: "Something went wrong on this page.",
      body: "It's not something you did. Nothing you taught Gloam is lost. Try again, and if it keeps happening, tell your teacher.",
      lines: ["something broke. i was nowhere near it. probably.", "i pressed one button. ONE. ok, try again."],
    },
    join: "Join your class",
    teacher: "Teacher home",
    retry: "Try again",
    start: "Back to the start",
    spots: {
      rock: { label: "Look under the rock", line: "not under the rock. i checked under the rock. twice." },
      bush: { label: "Look in the bush", line: "not in the bush. there's a beetle in there. he doesn't know either." },
      sign: { label: "Read the signpost", line: "the sign says \"pages: that way.\" that way is a cliff. i'm not doing that." },
    },
    shrine: { label: "Look at the empty shrine", line: "the lesson's candle was right here. now it's just a candle holder. emotionally, same thing." },
    giveUp: "fine. FINE. it's gone. i hate this. the buttons go places, though.",
    poke: ["i'm looking. this is my looking face.", "you're shining the moon right in my eyes.", "if you find it, we found it. that's teamwork.", "i've been searching for ages. it's been a minute."],
    hint: "Move the moonlight around. Gloam's looking too.",
    gloamLabel: "Gloam, looking around in the dark",
  },
  big: {
    missing: {
      title: "Oops! This page isn't here.",
      body: "Maybe the link has a mistake in it. Let's go back.",
      lines: ["Hmm! The page is hiding. Help me look!", "Where did the page go? Let's find it!"],
    },
    gone: {
      title: "This lesson went away.",
      body: "Your teacher put it away for now. Everything you taught Gloam is saved. Ask your teacher which lesson to play.",
      lines: ["The lesson went home! I wanted to learn it!"],
    },
    broke: {
      title: "Uh oh. Something broke.",
      body: "It's not your fault! Tap Try again. If it still breaks, tell your teacher.",
      lines: ["Uh oh! I think I sat on it. Let's try again!"],
    },
    join: "Find my class",
    teacher: "Teacher home",
    retry: "Try again",
    start: "Go back",
    spots: {
      rock: { label: "Look under the rock", line: "Not under the rock! Just a worm. Hi, worm!" },
      bush: { label: "Look in the bush", line: "Not in the bush! Just leaves. So many leaves." },
      sign: { label: "Read the sign", line: "The sign points both ways. Silly sign!" },
    },
    shrine: { label: "Look at the empty spot", line: "The lesson was right here! Now it's empty. Aww." },
    giveUp: "It's not anywhere! Let's go back. Tap a button!",
    poke: ["Hee hee! That tickles!", "I'm looking! I'm looking!", "Is the page behind me? Nope!"],
    hint: "Move the light to help Gloam look!",
    gloamLabel: "Gloam, looking around",
  },
  small: {
    missing: {
      title: "This page doesn't exist.",
      body: "The link might have a typo, or the page moved. Head back from here.",
      lines: ["THE PAGE. IT'S GONE. this is a disaster. a small one. but still.", "i looked everywhere. ok, two places. but they were GOOD places."],
    },
    gone: {
      title: "This lesson isn't here anymore.",
      body: "Your teacher put it away for now. Everything you taught Gloam is saved. Ask your teacher which lesson to open.",
      lines: ["the lesson is GONE. right when i was about to be a genius."],
    },
    broke: {
      title: "Something went wrong.",
      body: "It's not something you did. Try again, and if it keeps happening, tell your teacher.",
      lines: ["the page tripped. very dramatic. very embarrassing. try again?"],
    },
    join: "Join your class",
    teacher: "Teacher home",
    retry: "Try again",
    start: "Back to the start",
    spots: {
      rock: { label: "Look under the rock", line: "under the rock: one worm, zero pages. the worm says hi." },
      bush: { label: "Look in the bush", line: "the bush has leaves. SO many leaves. no page." },
      sign: { label: "Read the signpost", line: "the sign says \"this way.\" it's pointing at itself. useless." },
    },
    shrine: { label: "Look at the empty shrine", line: "the lesson was RIGHT HERE. now it's an empty shelf. tragic." },
    giveUp: "it's gone. GONE. i need a minute. you take the buttons.",
    poke: ["hey! i'm searching here!", "is it behind me? ...no. i checked. dramatically.", "the moon's in my eyes. i can't see. kidding. mostly."],
    hint: "Move the moonlight around. Gloam's searching too.",
    gloamLabel: "Gloam, searching in the dark",
  },
};

const fr: Record<AccessVoice, LostCopy> = {
  senior: {
    missing: {
      title: "Il n'y a rien à cette adresse.",
      body: "Le lien a peut-être une faute de frappe, ou la page a été déplacée. Vérifie l'adresse, ou repars d'ici.",
      lines: [
        "bon. la page n'est pas là. j'ai cherché. vite fait.",
        "c'est ici que la page devrait être. elle n'y est pas. je suis aussi surpris que toi.",
        "la page a disparu. c'est pas moi. fouille mes poches. j'ai pas de poches.",
      ],
    },
    gone: {
      title: "Cette leçon n'est plus là.",
      body: "Ton enseignant l'a retirée, ou y travaille encore. Tout ce que tu as appris à Gloam est sauvegardé. Demande à ton enseignant quelle leçon ouvrir.",
      lines: ["il y avait une leçon ici. ton enseignant l'a rangée. je commençais juste à être bon.", "la leçon est partie. sans même dire au revoir."],
    },
    broke: {
      title: "Quelque chose a mal tourné sur cette page.",
      body: "Ce n'est pas ta faute. Rien de ce que tu as appris à Gloam n'est perdu. Réessaie, et si ça continue, dis-le à ton enseignant.",
      lines: ["quelque chose a cassé. j'étais loin. probablement.", "j'ai appuyé sur un bouton. UN. bon, réessaie."],
    },
    join: "Rejoindre ma classe",
    teacher: "Accueil enseignant",
    retry: "Réessayer",
    start: "Retour au début",
    spots: {
      rock: { label: "Regarder sous le caillou", line: "pas sous le caillou. j'ai regardé sous le caillou. deux fois." },
      bush: { label: "Regarder dans le buisson", line: "pas dans le buisson. il y a un scarabée dedans. il sait pas non plus." },
      sign: { label: "Lire le panneau", line: "le panneau dit « pages : par là ». par là, c'est une falaise. non merci." },
    },
    shrine: { label: "Regarder l'autel vide", line: "la bougie de la leçon était juste là. maintenant c'est juste un bougeoir. émotionnellement, pareil." },
    giveUp: "bon. BON. elle est partie. je déteste ça. les boutons, eux, mènent quelque part.",
    poke: ["je cherche. c'est ma tête de recherche.", "tu me mets la lune en plein dans les yeux.", "si tu la trouves, on l'a trouvée. c'est ça, l'esprit d'équipe."],
    hint: "Promène le clair de lune. Gloam cherche aussi.",
    gloamLabel: "Gloam, qui cherche dans le noir",
  },
  big: {
    missing: {
      title: "Oups! Cette page n'est pas là.",
      body: "Le lien a peut-être une erreur. On retourne en arrière.",
      lines: ["Oh! La page se cache. Aide-moi à chercher!", "Où est partie la page? On la trouve!"],
    },
    gone: {
      title: "Cette leçon est partie.",
      body: "Ton enseignant l'a rangée pour l'instant. Tout ce que tu as appris à Gloam est gardé. Demande quelle leçon jouer.",
      lines: ["La leçon est rentrée chez elle! Je voulais l'apprendre!"],
    },
    broke: {
      title: "Oh oh. Quelque chose s'est cassé.",
      body: "Ce n'est pas ta faute! Touche Réessayer. Si ça casse encore, dis-le à ton enseignant.",
      lines: ["Oh oh! Je crois que je me suis assis dessus. On réessaie!"],
    },
    join: "Trouver ma classe",
    teacher: "Accueil enseignant",
    retry: "Réessayer",
    start: "Retour",
    spots: {
      rock: { label: "Regarder sous la roche", line: "Pas sous la roche! Juste un ver de terre. Salut, le ver!" },
      bush: { label: "Regarder dans le buisson", line: "Pas dans le buisson! Juste des feuilles. Plein de feuilles." },
      sign: { label: "Lire le panneau", line: "Le panneau montre des deux côtés. Panneau bizarre!" },
    },
    shrine: { label: "Regarder la place vide", line: "La leçon était juste ici! Maintenant, c'est vide. Ohhh." },
    giveUp: "Elle est nulle part! On retourne en arrière. Touche un bouton!",
    poke: ["Hi hi! Ça chatouille!", "Je cherche! Je cherche!", "La page est derrière moi? Non!"],
    hint: "Bouge la lumière pour aider Gloam à chercher!",
    gloamLabel: "Gloam, qui cherche partout",
  },
  small: {
    missing: {
      title: "Cette page n'existe pas.",
      body: "Le lien a peut-être une faute de frappe, ou la page a bougé. Repars d'ici.",
      lines: ["LA PAGE. ELLE A DISPARU. c'est une catastrophe. une petite. mais quand même.", "j'ai cherché partout. bon, à deux endroits. mais de BONS endroits."],
    },
    gone: {
      title: "Cette leçon n'est plus là.",
      body: "Ton enseignant l'a rangée pour l'instant. Tout ce que tu as appris à Gloam est sauvegardé. Demande quelle leçon ouvrir.",
      lines: ["la leçon est PARTIE. juste quand j'allais devenir un génie."],
    },
    broke: {
      title: "Quelque chose a mal tourné.",
      body: "Ce n'est pas ta faute. Réessaie, et si ça continue, dis-le à ton enseignant.",
      lines: ["la page a trébuché. très dramatique. très gênant. on réessaie?"],
    },
    join: "Rejoindre ma classe",
    teacher: "Accueil enseignant",
    retry: "Réessayer",
    start: "Retour au début",
    spots: {
      rock: { label: "Regarder sous le caillou", line: "sous le caillou : un ver, zéro page. le ver te salue." },
      bush: { label: "Regarder dans le buisson", line: "le buisson a des feuilles. TELLEMENT de feuilles. pas de page." },
      sign: { label: "Lire le panneau", line: "le panneau dit « par ici ». il pointe vers lui-même. inutile." },
    },
    shrine: { label: "Regarder l'autel vide", line: "la leçon était JUSTE ICI. maintenant c'est une étagère vide. tragique." },
    giveUp: "elle est partie. PARTIE. j'ai besoin d'une minute. toi, prends les boutons.",
    poke: ["hé! je cherche, là!", "elle est derrière moi? ...non. j'ai vérifié. dramatiquement.", "la lune dans les yeux. je vois plus rien. je blague. presque."],
    hint: "Promène le clair de lune. Gloam cherche aussi.",
    gloamLabel: "Gloam, qui cherche dans le noir",
  },
};

export const lostCopy = (language: "en" | "fr", voice: AccessVoice): LostCopy => (language === "fr" ? fr : en)[voice];
