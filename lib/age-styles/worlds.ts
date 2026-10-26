import type { JourneyWorld } from "./types";

/**
 * The younger ages' painted journeys (M5). Each one was painted with local FLUX.1-schnell from its file in
 * art/worlds/<age>.json and made by art/world.py: grown into a journey, seams healed, then graded so the
 * UNLIT world is faded grey and the LIT world is its full colour (teaching brings the colour back).
 * A human artist can replace any image 1:1.
 */
const layers = (age: string) =>
  [0, 1, 2, 3].map((k) => ({ id: `journey-${k}`, dark: `/art/${age}/journey-${k}-dark.webp`, lit: `/art/${age}/journey-${k}-lit.webp`, depth: k / 3 }));

/** K-2: a sunny storybook meadow. A pond, a big oak with a swing, sunflowers, a hilltop with a rainbow. */
export const littleWorld: JourneyWorld = {
  name: "the sunny meadow",
  width: 4032,
  height: 768,
  layers: layers("little"),
  path: [
    [0, 0.8],
    [1, 0.8],
  ],
  start: 0.23,
  end: 0.83,
  fog: "#d9e2e6",
  vignette: 0.3,
  firefly: "#fff2b3",
  map: { dark: "/art/little/journey-map-dark.webp", lit: "/art/little/journey-map-lit.webp" },
  // painted from art/worlds/little.json (seed 42; its painted candle erased: the game draws the real one), cut out by art/cutout.py
  shrine: { src: "/art/little/shrine.webp", w: 329, h: 400, base: [164, 392], candle: [161, 296], scale: 0.62 },
  travel: ["Walking, walking, walking!", "Ooh, a flower!", "My legs are tiny. The meadow is big!", "Next candle, here I come!", "Is that a bee? Hi, bee!", "Almost there! I think!"],
};

/** Grades 3-5: a storybook forest at dusk. Mushroom houses, a brook, a mossy log tunnel, a treehouse. */
export const juniorWorld: JourneyWorld = {
  name: "the mushroom forest",
  width: 4032,
  height: 768,
  layers: layers("junior"),
  path: [
    [0, 0.8],
    [1, 0.8],
  ],
  start: 0.23,
  end: 0.83,
  fog: "#c9c3da",
  vignette: 0.4,
  firefly: "#ffe6a8",
  map: { dark: "/art/junior/journey-map-dark.webp", lit: "/art/junior/journey-map-lit.webp" },
  // painted from art/worlds/junior.json (seed 43, painted candle erased), cut out by art/cutout.py
  shrine: { src: "/art/junior/shrine.webp", w: 368, h: 400, base: [184, 383], candle: [196, 324], scale: 0.62 },
  travel: ["Onward! Probably.", "These mushrooms are judging me.", "I'm not lost. The path is lost.", "Next candle! You explain, I nod.", "Did that fern just move?", "My lantern says left. My feet say right."],
};

/** Grades 6-8: windy sea cliffs at twilight. A rope bridge, a lighthouse, a waterfall, a windy headland. */
export const middleWorld: JourneyWorld = {
  name: "the windy cliffs",
  width: 4032,
  height: 768,
  layers: layers("middle"),
  path: [
    [0, 0.8],
    [1, 0.8],
  ],
  start: 0.23,
  end: 0.83,
  fog: "#aab4c8",
  vignette: 0.7,
  firefly: "#ffd98a",
  map: { dark: "/art/middle/journey-map-dark.webp", lit: "/art/middle/journey-map-lit.webp" },
  // painted from art/worlds/middle.json (seed 41, painted candle erased), cut out by art/cutout.py
  shrine: { src: "/art/middle/shrine.webp", w: 434, h: 400, base: [217, 392], candle: [215, 304], scale: 0.66 },
  travel: [
    "the WIND. it's trying to steal my lantern.",
    "don't look down. i looked down.",
    "this bridge is fine. totally fine. (it's not fine.)",
    "next candle! same deal: you teach, i panic.",
    "a lighthouse. what a show-off.",
    "i've never been this dramatic in my life. that's a lie.",
  ],
};
