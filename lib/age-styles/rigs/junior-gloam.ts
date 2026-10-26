import type { RigSpec } from "@/lib/gloam-rig/spec";

/**
 * Grades 3-5 Gloam: a playful orange buddy with a round head, a tuft of fuzz and a cheeky grin.
 * Painted with local FLUX.1-schnell (art/prompts.py YOUNG_GLOAMS.gloam_junior, seed 504) and cut into parts by
 * art/gloam2_rig.py with art/rigs/junior.json. Every number here is a pixel in public/art/junior/gloam-junior-body.webp
 * (422 x 712), except limb and lantern pivots, which are in their own images.
 */
export const juniorGloam: RigSpec = {
  body: {
    src: "/art/junior/gloam-junior-body.webp",
    w: 422,
    h: 712,
    feet: [210, 702],
    color: "#e8701c",
    shade: "#b04a12",
    light: "#ff9a4a",
  },
  face: {
    eyes: [
      [149, 174],
      [266, 167],
    ],
    eyeR: [24, 24],
    sclera: "#f6ecdc",
    iris: "#2a160c",
    irisDark: "#0c0603",
    irisR: 0.9,
    lash: "#2a1208",
    brow: { color: "#b8481a", length: 28, thick: 6, above: 16 },
    mouth: [210, 212],
    mouthW: 42,
    mouthColor: "#5a1f0e",
    tongue: "#e46a5a",
    cheeks: [
      [125, 204],
      [290, 194],
    ],
    cheekColor: "#ec5a3a",
    cheekR: 26,
  },
  arms: {
    l: { src: "/art/junior/gloam-junior-arm-l.webp", pivot: [63, 21], at: [72, 332] },
    r: { src: "/art/junior/gloam-junior-arm-r.webp", pivot: [33, 22], at: [342, 332] },
    rest: 12,
  },
  legs: {
    l: { src: "/art/junior/gloam-junior-leg-l.webp", pivot: [51, 20], at: [140, 620] },
    r: { src: "/art/junior/gloam-junior-leg-r.webp", pivot: [43, 20], at: [280, 620] },
  },
  stalk: {
    // out of the tuft, then curling over to the right, where the lantern hangs
    base: [205, 40],
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
    color: "#6f9a35",
    dark: "#3a5a1a",
  },
  lantern: {
    scale: 0.28,
    lit: "/art/junior/gloam-junior-lantern-lit.webp",
    dark: "/art/junior/gloam-junior-lantern-dark.webp",
    w: 202,
    h: 254,
    hang: [95, 7],
    flame: [101, 127],
  },
};
