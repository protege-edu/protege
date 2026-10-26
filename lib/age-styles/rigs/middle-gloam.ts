import type { RigSpec } from "@/lib/gloam-rig/spec";

/**
 * Grades 6-8 Gloam: a goofy, dramatic orange felt creature in a teal scarf, with huge eyes and big bushy eyebrows.
 * Painted with local FLUX.1-schnell (art/prompts.py YOUNG_GLOAMS.gloam_middle, seed 504) and cut into parts by
 * art/gloam2_rig.py with art/rigs/middle.json (its painted hair is repainted as felt; the code draws the eyebrows,
 * so they can be as theatrical as it feels). Every number here is a pixel in
 * public/art/middle/gloam-middle-body.webp (462 x 702), except limb and lantern pivots, which are in their own images.
 */
export const middleGloam: RigSpec = {
  body: {
    src: "/art/middle/gloam-middle-body.webp",
    w: 462,
    h: 702,
    feet: [253, 689],
    color: "#e2661c",
    shade: "#a8420f",
    light: "#ff9550",
  },
  face: {
    eyes: [
      [186, 142],
      [328, 134],
    ],
    // huge, wide-open eyes with a lot of white: everything is a big deal
    eyeR: [42, 40],
    sclera: "#f7f3ea",
    iris: "#7a2e12",
    irisDark: "#2a0d05",
    irisR: 0.62,
    lash: "#2a1508",
    brow: { color: "#3a2416", length: 62, thick: 13, above: 12 },
    mouth: [250, 196],
    mouthW: 36,
    mouthColor: "#4a160c",
    tongue: "#d0584a",
    cheeks: [
      [168, 186],
      [346, 178],
    ],
    cheekColor: "#e0503a",
    cheekR: 22,
  },
  arms: {
    l: { src: "/art/middle/gloam-middle-arm-l.webp", pivot: [41, 18], at: [90, 468] },
    r: { src: "/art/middle/gloam-middle-arm-r.webp", pivot: [25, 22], at: [413, 394] },
    rest: 8,
  },
  legs: {
    l: { src: "/art/middle/gloam-middle-leg-l.webp", pivot: [39, 20], at: [180, 610] },
    r: { src: "/art/middle/gloam-middle-leg-r.webp", pivot: [41, 20], at: [324, 610] },
  },
  stalk: {
    base: [253, 18],
    rest: [
      [0, 0],
      [3, -33],
      [13, -64],
      [33, -90],
      [62, -108],
      [95, -114],
      [123, -106],
      [139, -86],
      [139, -66],
    ],
    width: 12,
    color: "#6f8e2e",
    dark: "#33461a",
  },
  lantern: {
    scale: 0.28,
    lit: "/art/middle/gloam-middle-lantern-lit.webp",
    dark: "/art/middle/gloam-middle-lantern-dark.webp",
    w: 210,
    h: 224,
    hang: [105, 12],
    flame: [107, 114],
  },
};
