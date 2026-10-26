/**
 * A Gloam rig file: where everything is on one painted Gloam. Each age style points at its own,
 * so every age gets its own Gloam (rounder and brighter for little kids, deadpan for high school)
 * with the same animation brain. All positions are in the body painting's pixels.
 */
export interface RigSpec {
  body: {
    src: string;
    /** size of the body image */
    w: number;
    h: number;
    /** the point between Gloam's feet (where it stands on the ground) */
    feet: [number, number];
    /** the body's main colours, for code-drawn parts (arms, feet, eyelids) */
    color: string;
    shade: string;
    light: string;
  };
  face: {
    eyes: [[number, number], [number, number]];
    /** eye radius x, y */
    eyeR: [number, number];
    sclera: string;
    iris: string;
    irisDark: string;
    /** iris radius as a fraction of the eye's height */
    irisR: number;
    lash: string;
    brow: { color: string; length: number; thick: number; above: number };
    mouth: [number, number];
    mouthW: number;
    mouthColor: string;
    tongue: string;
    cheeks: [[number, number], [number, number]];
    cheekColor: string;
    cheekR: number;
  };
  /** painted arms and legs, each turning around its own pivot (where it joins the body) */
  arms: {
    l: Limb;
    r: Limb;
    /** the resting angle of the painted arms, degrees out from straight down */
    rest: number;
  };
  legs: {
    l: Limb;
    r: Limb;
  };
  stalk: {
    base: [number, number];
    /** the resting curl, relative to the base, base first */
    rest: [number, number][];
    width: number;
    color: string;
    dark: string;
  };
  lantern: {
    /** how tall the lantern is, as a fraction of Gloam's body height */
    scale: number;
    lit: string;
    dark: string;
    w: number;
    h: number;
    /** where the lantern hangs from, in its own image */
    hang: [number, number];
    /** the flame's centre, in its own image (where the light comes from) */
    flame: [number, number];
  };
}

export interface Limb {
  src: string;
  /** the joint, in the limb's own image */
  pivot: [number, number];
  /** where the joint sits on the body */
  at: [number, number];
}
