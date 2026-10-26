import type { Language } from "@/lib/age-styles";

/**
 * Which language a teacher's notes are written in, by counting everyday little words.
 * No AI needed, and it's only a first guess: the teacher can change it on the review page.
 * (A lesson ABOUT French that's written in English stays English: it counts the words, not the topic.)
 */
const FR = new Set("le la les un une des du de et est sont pour avec dans sur pas que qui ce cette ces son sa ses leur au aux nous vous ils elles être avoir fait plus mais ou donc car très".split(" "));
const EN = new Set("the a an and is are for with in on not that which this these his her their to of we you they be have does more but or so because very it".split(" "));

export function detectLanguage(text: string): Language {
  let fr = 0;
  let en = 0;
  for (const w of text.toLowerCase().match(/[a-zàâçéèêëîïôûùüÿœ']+/g) ?? []) {
    if (FR.has(w)) fr++;
    if (EN.has(w)) en++;
  }
  return fr > en * 1.2 ? "fr" : "en";
}
