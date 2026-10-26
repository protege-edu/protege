import type { RigSpec } from "@/lib/gloam-rig/spec";

/**
 * High school Gloam (Gloam 2.0): a grumpy little rust-orange felt creature with a stitched cream belly.
 * Painted with local FLUX.1-schnell (art/prompts.py CONCEPTS.c2_felt, seed 8) and cut into parts by
 * art/gloam2_rig.py. Every number here is a pixel in public/art/senior/gloam2-body.webp (500 x 570),
 * except limb and lantern pivots, which are in their own images.
 */
export const seniorGloam: RigSpec = {
  body: {
    src: "/art/senior/gloam2-body.webp",
    w: 500,
    h: 570,
    feet: [248, 548],
    color: "#e2661d",
    shade: "#9c3a10",
    light: "#ff9b4c",
  },
  face: {
    eyes: [
      [188, 124],
      [316, 114],
    ],
    eyeR: [27, 21],
    sclera: "#f1e3cb",
    iris: "#4a2a1a",
    irisDark: "#1e0f08",
    irisR: 0.96,
    lash: "#2b1209",
    brow: { color: "#7a2e0d", length: 44, thick: 7, above: 9 },
    mouth: [258, 144],
    mouthW: 30,
    mouthColor: "#4a1b10",
    tongue: "#c4584b",
    cheeks: [
      [158, 150],
      [344, 138],
    ],
    cheekColor: "#ec4b3a",
    cheekR: 24,
  },
  arms: {
    l: { src: "/art/senior/gloam2-arm-l.webp", pivot: [67, 30], at: [92, 210] },
    r: { src: "/art/senior/gloam2-arm-r.webp", pivot: [27, 26], at: [400, 210] },
    rest: 12,
  },
  legs: {
    l: { src: "/art/senior/gloam2-leg-l.webp", pivot: [41, 18], at: [160, 482] },
    r: { src: "/art/senior/gloam2-leg-r.webp", pivot: [44, 18], at: [325, 482] },
  },
  stalk: {
    base: [236, 30],
    // up out of the head, then curling over to the left, ending in a hook the lantern hangs from
    rest: [
      [0, 0],
      [-3, -28],
      [-12, -56],
      [-30, -82],
      [-56, -100],
      [-86, -106],
      [-112, -98],
      [-126, -80],
      [-126, -62],
    ],
    width: 13,
    color: "#8c5a32",
    dark: "#3f2413",
  },
  lantern: {
    scale: 0.3,
    lit: "/art/senior/gloam2-lantern-lit.webp",
    dark: "/art/senior/gloam2-lantern-dark.webp",
    w: 148,
    h: 150,
    hang: [74, 6],
    flame: [74, 80],
  },
};
