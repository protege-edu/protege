/**
 * The voices Gloam can read aloud with on the teacher's laptop: Kokoro (Apache 2.0), a small neural
 * voice model that runs on this computer. Each age style picks one per language (see `spoken` in its
 * profile). The numbers are the model's own speaker numbers; only these are ever accepted.
 */
export const SPOKEN_VOICES = {
  af_heart: { id: 3, lang: "en" },
  af_bella: { id: 2, lang: "en" },
  af_nicole: { id: 6, lang: "en" },
  am_puck: { id: 18, lang: "en" },
  am_fenrir: { id: 14, lang: "en" },
  am_michael: { id: 16, lang: "en" },
  bf_emma: { id: 21, lang: "en" },
  bm_george: { id: 26, lang: "en" },
  bm_fable: { id: 25, lang: "en" },
  ff_siwis: { id: 30, lang: "fr" },
} as const;

export type SpokenVoiceName = keyof typeof SPOKEN_VOICES;

/** How Gloam sounds when it reads aloud: which voice, and how fast (1 = normal) */
export type SpokenVoice = { name: SpokenVoiceName; speed: number };

export const isSpokenVoice = (name: string): name is SpokenVoiceName => Object.hasOwn(SPOKEN_VOICES, name);

/** Longest piece of text the laptop reads in one go (the browser sends a line a sentence or two at a time) */
export const SPOKEN_MAX_CHARS = 320;

/**
 * Split a line into pieces of a sentence or two, so the first one can start playing while the next is
 * being made. Never cuts a word.
 */
export function speakingPieces(text: string, max = 220): string[] {
  const sentences = text.replace(/\s+/g, " ").trim().match(/[^.!?…]+[.!?…]+["'”»)]*\s*|[^.!?…]+$/g) ?? [];
  const pieces: string[] = [];
  for (const s of sentences.map((x) => x.trim()).filter(Boolean)) {
    const last = pieces.length - 1;
    if (last >= 0 && pieces[last].length + s.length + 1 <= max && pieces[last].length < 40) pieces[last] += " " + s;
    else if (s.length <= max) pieces.push(s);
    else {
      // one very long sentence: break it at commas, then at spaces
      let rest = s;
      while (rest.length > max) {
        const cut = Math.max(rest.lastIndexOf(", ", max), rest.lastIndexOf(" ", max));
        const at = cut > max / 3 ? cut + 1 : max;
        pieces.push(rest.slice(0, at).trim());
        rest = rest.slice(at).trim();
      }
      if (rest) pieces.push(rest);
    }
  }
  return pieces.map((p) => p.slice(0, SPOKEN_MAX_CHARS));
}
