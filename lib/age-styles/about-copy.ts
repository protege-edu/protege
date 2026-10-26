import type { AboutCopy } from "./types";
import type { AccessVoice } from "./access-copy";

/**
 * Telling students, in words for their age, that Gloam is an AI, what it remembers about them, and who sees it.
 * (Students have a right to know they're talking to an AI: the EU AI Act, Art. 50, and Ontario's IPC
 * principles for AI. And to a privacy notice they can understand: the UK Children's Code, MFIPPA.)
 */
const en: Record<AccessVoice, AboutCopy> = {
  senior: {
    aiNote: "Gloam is an AI running on your teacher's computer. It gets things wrong (that's the point). Your teacher can read what you teach it.",
    title: "About Gloam",
    lines: [
      "Gloam is an AI: a computer program, not a person. It runs on your teacher's computer, not on some company's servers.",
      "Its candles are its guess at how well you explained each idea. They're not marks. Your teacher sees them and can fix them if Gloam got it wrong.",
      "Protégé keeps your nickname and what you write to Gloam, so your teacher can see your thinking and you can pick up where you left off. Nothing is sold, shared or used to train anything.",
      "Don't type your real name, where you live, or anything private. If something's bothering you, talk to a teacher or an adult you trust.",
      "Want to see what's kept about you, or have it deleted? Ask your teacher.",
    ],
  },
  big: {
    aiNote: "Gloam is a computer helper on your teacher's computer. Your teacher can see what you teach it.",
    title: "About Gloam",
    lines: [
      "Gloam is a computer program. It's not a real creature. (Shh. Don't tell it.)",
      "It lives on your teacher's computer.",
      "Your teacher can see what you tell Gloam. That's how they know what you learned!",
      "Don't type your real name or where you live.",
      "If something is bothering you, tell a grown-up you trust.",
    ],
  },
  small: {
    aiNote: "Gloam is an AI on your teacher's computer. It's wrong a LOT (on purpose). Your teacher can read what you teach it.",
    title: "About Gloam",
    lines: [
      "Gloam is an AI: a computer program, not a person. It runs on your teacher's computer, not on the internet.",
      "Its candles are its guess at how well you explained each idea. Not marks. Your teacher can fix them if Gloam messed up.",
      "Protégé keeps your nickname and what you write to Gloam, so your teacher can see your thinking and you can come back to it. Nothing goes to any company.",
      "Don't type your real name, where you live, or anything private. If something's bothering you, talk to an adult you trust.",
      "Want to see what's kept about you, or have it deleted? Ask your teacher.",
    ],
  },
};

const fr: Record<AccessVoice, AboutCopy> = {
  senior: {
    aiNote: "Gloam est une IA qui tourne sur l'ordinateur de ton prof. Elle se trompe (c'est le but). Ton prof peut lire ce que tu lui enseignes.",
    title: "À propos de Gloam",
    lines: [
      "Gloam est une IA : un programme informatique, pas une personne. Elle tourne sur l'ordinateur de ton prof, pas sur les serveurs d'une entreprise.",
      "Ses chandelles, c'est son estimation de comment tu as expliqué chaque idée. Ce ne sont pas des notes. Ton prof les voit et peut les corriger si Gloam s'est trompée.",
      "Protégé garde ton surnom et ce que tu écris à Gloam, pour que ton prof voie ta façon de penser et que tu puisses reprendre où tu étais. Rien n'est vendu, partagé ou utilisé pour entraîner quoi que ce soit.",
      "N'écris pas ton vrai nom, où tu habites, ni rien de privé. Si quelque chose te dérange, parles-en à un prof ou à un adulte de confiance.",
      "Tu veux voir ce qu'on garde sur toi, ou le faire effacer ? Demande à ton prof.",
    ],
  },
  big: {
    aiNote: "Gloam est un programme sur l'ordinateur de ton prof. Ton prof peut voir ce que tu lui enseignes.",
    title: "À propos de Gloam",
    lines: [
      "Gloam est un programme d'ordinateur. Ce n'est pas une vraie créature. (Chut. Ne lui dis pas.)",
      "Gloam vit sur l'ordinateur de ton prof.",
      "Ton prof peut voir ce que tu dis à Gloam. C'est comme ça qu'il sait ce que tu as appris !",
      "N'écris pas ton vrai nom ni où tu habites.",
      "Si quelque chose te dérange, dis-le à un adulte de confiance.",
    ],
  },
  small: {
    aiNote: "Gloam est une IA sur l'ordinateur de ton prof. Elle se trompe BEAUCOUP (exprès). Ton prof peut lire ce que tu lui enseignes.",
    title: "À propos de Gloam",
    lines: [
      "Gloam est une IA : un programme, pas une personne. Elle tourne sur l'ordinateur de ton prof, pas sur Internet.",
      "Ses chandelles, c'est son estimation de comment tu as expliqué chaque idée. Pas des notes. Ton prof peut les corriger si Gloam s'est trompée.",
      "Protégé garde ton surnom et ce que tu écris à Gloam, pour que ton prof voie ta façon de penser et que tu puisses y revenir. Rien ne part vers une entreprise.",
      "N'écris pas ton vrai nom, où tu habites, ni rien de privé. Si quelque chose te dérange, parles-en à un adulte de confiance.",
      "Tu veux voir ce qu'on garde sur toi, ou le faire effacer ? Demande à ton prof.",
    ],
  },
};

export const aboutCopy = (language: "en" | "fr", voice: AccessVoice): AboutCopy => (language === "fr" ? fr : en)[voice];
