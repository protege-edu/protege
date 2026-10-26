import type { RigSpec } from "@/lib/gloam-rig/spec";

/**
 * K-2 Gloam: a very round, bright tangerine fluffball with huge shiny eyes and rosy cheeks, hugging its belly.
 * Painted with local FLUX.1-schnell (art/prompts.py YOUNG_GLOAMS.gloam_little, seed 501) and cut into parts by
 * art/gloam2_rig.py with art/rigs/little.json. Every number here is a pixel in public/art/little/gloam-little-body.webp
 * (647 x 798), except limb and lantern pivots, which are in their own images.
 */
export const littleGloam: RigSpec = {
  body: {
    src: "/art/little/gloam-little-body.webp",
    w: 647,
    h: 798,
    feet: [322, 790],
    color: "#f7901f",
    shade: "#c95e12",
    light: "#ffbb5c",
  },
  face: {
    eyes: [
      [222, 205],
      [434, 195],
    ],
    // big round eyes, almost all shiny dark iris (the code adds the sparkle)
    eyeR: [44, 44],
    sclera: "#fbf3e4",
    iris: "#2c1a10",
    irisDark: "#0b0604",
    irisR: 1,
    lash: "#3a1c0b",
    brow: { color: "#e0701d", length: 34, thick: 6, above: 30 },
    mouth: [328, 247],
    mouthW: 40,
    mouthColor: "#6d2410",
    tongue: "#ef7a7a",
    cheeks: [
      [162, 267],
      [499, 250],
    ],
    cheekColor: "#ff6a6a",
    cheekR: 44,
  },
  arms: {
    l: { src: "/art/little/gloam-little-arm-l.webp", pivot: [50, 35], at: [83, 366] },
    r: { src: "/art/little/gloam-little-arm-r.webp", pivot: [95, 35], at: [567, 366] },
    // painted hugging its belly
    rest: 55,
  },
  legs: {
    l: { src: "/art/little/gloam-little-leg-l.webp", pivot: [69, 22], at: [181, 640] },
    r: { src: "/art/little/gloam-little-leg-r.webp", pivot: [69, 22], at: [467, 640] },
  },
  stalk: {
    base: [310, 10],
    // a springy green vine: up, then curling over to the left, where the lantern hangs
    rest: [
      [0, 0],
      [-4, -36],
      [-16, -73],
      [-39, -107],
      [-73, -130],
      [-112, -138],
      [-146, -127],
      [-164, -104],
      [-164, -81],
    ],
    width: 15,
    color: "#86b23e",
    dark: "#3f6a1c",
  },
  lantern: {
    scale: 0.28,
    lit: "/art/little/gloam-little-lantern-lit.webp",
    dark: "/art/little/gloam-little-lantern-dark.webp",
    w: 194,
    h: 240,
    hang: [146, 36],
    flame: [97, 120],
  },
};
