import type * as PixiNS from "pixi.js";
import type { RigSpec } from "@/lib/gloam-rig/spec";

/**
 * Gloam's outfits, drawn in code every frame like its face, so they squash, stretch and lean with the painted
 * body instead of sliding around on top of it:
 *   glasses: round frames on its eyes
 *   scarf:   a knitted band wrapped around its middle, with a knot and a swinging tail
 *   beanie:  a slouchy knit hat that fits the painted head (measured from the painting's outline), with the
 *            lantern stalk poking out through it
 *   cape:    hanging behind it from the shoulders, swaying (we see its lining, from the front)
 * Colours come from the rig (each age's Gloam), and never lantern gold: gold only ever means understanding.
 */
import { OUTFIT_SHOP, type OutfitId } from "@/lib/game/stash";
export const OUTFITS: OutfitId[] = OUTFIT_SHOP.map((o) => o.id);

export interface WearColors {
  scarf: string;
  stripe: string;
  hat: string;
  cuff: string;
  frame: string;
  /** a pom-pom on the hat (the younger Gloams) */
  pompom?: string;
  /** the cape's outside, and its lining (the side we see from the front) */
  cape: string;
  capeIn: string;
  /** this Gloam's painting already has a scarf (so it can't wear another) */
  paintedScarf?: boolean;
}
const DEFAULT_WEAR: WearColors = { scarf: "#2f5d62", stripe: "#e8dcc0", hat: "#41607a", cuff: "#4f7290", frame: "#2a1a12", cape: "#2a3a4e", capeIn: "#7a3346" };

/** This Gloam's outfit colours */
export function wearColors(spec: RigSpec | undefined): WearColors {
  return { ...DEFAULT_WEAR, ...spec?.wear };
}

/** What this Gloam can wear (a Gloam painted with a scarf can't wear a second one) */
export function outfitsFor(spec: RigSpec): OutfitId[] {
  return OUTFITS.filter((o) => !(o === "scarf" && spec.wear?.paintedScarf));
}

/** The painting's outline: for each row (in body px), where the painted body starts and ends (null: empty row) */
export type Profile = ({ l: number; r: number } | null)[];

/**
 * Measure the body painting's outline once, from its see-through pixels. Null if the browser won't let us read
 * the picture (then the hat is shaped from the face instead).
 */
export function bodyProfile(tex: PixiNS.Texture, spec: RigSpec): Profile | null {
  try {
    const src = tex.source.resource as CanvasImageSource;
    const w = tex.source.pixelWidth;
    const h = tex.source.pixelHeight;
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const g = c.getContext("2d", { willReadFrequently: true });
    if (!g) return null;
    g.drawImage(src, 0, 0);
    const d = g.getImageData(0, 0, w, h).data;
    const kx = spec.body.w / w;
    const ky = spec.body.h / h;
    const rows: Profile = [];
    for (let by = 0; by < spec.body.h; by++) {
      const y = Math.min(h - 1, Math.round(by / ky));
      let l = -1;
      let r = -1;
      for (let x = 0; x < w; x++) {
        if (d[(y * w + x) * 4 + 3] > 120) {
          if (l < 0) l = x;
          r = x;
        }
      }
      rows.push(l < 0 ? null : { l: l * kx, r: r * kx });
    }
    return rows;
  } catch {
    return null;
  }
}

type Deform = (px: number, py: number) => { x: number; y: number };
const hex = (c: string) => parseInt(c.replace("#", ""), 16);

export interface WearFrame {
  /** painting px -> this frame's screen px */
  at: Deform;
  /** painting px -> screen px scale */
  s: number;
  squashX: number;
  squashY: number;
  /** seconds (for the scarf tail's sway) */
  t: number;
  calm: boolean;
}

export class Outfit {
  private on = new Set<OutfitId>();
  private spec: RigSpec;
  private profile: Profile | null;
  private colors: WearColors;
  // (worked out once: where the hat and scarf sit on this Gloam, in painting px)
  private hat: { top: number; brim: number; cx: number } | null;
  private band: { y: number; half: number } | null;

  constructor(spec: RigSpec, profile: Profile | null) {
    this.spec = spec;
    this.profile = profile;
    this.colors = wearColors(spec);
    const f = spec.face;
    const eyeTop = Math.min(f.eyes[0][1], f.eyes[1][1]) - f.eyeR[1];
    const top = profile ? profile.findIndex((r) => r !== null) : spec.stalk.base[1];
    // the brim sits just above the brows, so Gloam can still be grumpy at you
    const brim = eyeTop - f.brow.above - f.brow.thick * 0.9;
    this.hat = brim - top > 12 ? { top: Math.max(0, top), brim, cx: spec.stalk.base[0] } : null;
    // the scarf goes around its middle: between the mouth and the shoulders
    const shoulders = Math.min(spec.arms.l.at[1], spec.arms.r.at[1]);
    const y = f.mouth[1] + (shoulders - f.mouth[1]) * 0.55;
    this.band = shoulders > f.mouth[1] ? { y, half: Math.max(8, Math.min(f.eyeR[1] * 0.95, (shoulders - f.mouth[1]) * 0.42)) } : null;
  }

  set(ids: string[]) {
    const can = outfitsFor(this.spec) as string[];
    this.on = new Set(ids.filter((i): i is OutfitId => can.includes(i)));
  }

  get wearing() {
    return this.on.size > 0;
  }

  /** where the body is at a height: its left and right edge (painting px) */
  private edges(y: number): { l: number; r: number } {
    const row = this.profile?.[Math.max(0, Math.min(this.profile.length - 1, Math.round(y)))];
    if (row) return row;
    // (no outline: guess from the face)
    const f = this.spec.face;
    const mid = (f.eyes[0][0] + f.eyes[1][0]) / 2;
    const half = Math.abs(f.eyes[1][0] - f.eyes[0][0]) * 1.1;
    return { l: mid - half, r: mid + half };
  }

  /** The cape (drawn behind everything: the body hides most of it) */
  drawCape(g: PixiNS.Graphics, w: WearFrame) {
    if (!this.on.has("cape")) return;
    const sp = this.spec;
    const c = this.colors;
    const sy = Math.min(sp.arms.l.at[1], sp.arms.r.at[1]) - sp.face.eyeR[1] * 0.6;
    const bottom = sp.body.feet[1] - (sp.body.feet[1] - sy) * 0.1;
    const e = this.edges(sy);
    const wid = e.r - e.l;
    const mid = (e.l + e.r) / 2;
    const sway = w.calm ? 0 : Math.sin(w.t * 1.3) * wid * 0.03;
    // it flares out from the shoulders to a wavy hem just above the ground
    const N = 12;
    const pts: { x: number; y: number }[] = [w.at(e.l + wid * 0.12, sy)];
    for (let i = 1; i <= N; i++) {
      const u = i / N;
      pts.push(w.at(e.l + wid * 0.12 - wid * 0.34 * Math.pow(u, 0.7) + sway * u * u, sy + (bottom - sy) * u));
    }
    for (let i = 1; i < 10; i++) {
      const u = i / 10;
      pts.push(w.at(e.l - wid * 0.22 + wid * 1.44 * u + sway, bottom + Math.sin(u * Math.PI * 5) * wid * 0.025));
    }
    for (let i = N; i >= 1; i--) {
      const u = i / N;
      pts.push(w.at(e.r - wid * 0.12 + wid * 0.34 * Math.pow(u, 0.7) + sway * u * u, sy + (bottom - sy) * u));
    }
    pts.push(w.at(e.r - wid * 0.12, sy));
    const flat = pts.flatMap((p) => [p.x, p.y]);
    g.poly(flat, true).fill({ color: hex(c.capeIn) });
    // its folds, and its outside showing at the edges
    for (const k of [-0.36, 0.36]) {
      const a = w.at(mid + wid * k * 0.6, sy + (bottom - sy) * 0.1);
      const b = w.at(mid + wid * k * 1.5 + sway, bottom);
      g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ color: 0x000000, width: Math.max(2, wid * 0.05 * w.s), alpha: 0.18, cap: "round" });
    }
    g.poly(flat, true).stroke({ color: hex(c.cape), width: Math.max(2, wid * 0.035 * w.s), join: "round" });
  }

  /** The cape's ties, at the front (over the body, under the scarf) */
  drawCapeTies(g: PixiNS.Graphics, w: WearFrame) {
    if (!this.on.has("cape")) return;
    const sp = this.spec;
    const sy = Math.min(sp.arms.l.at[1], sp.arms.r.at[1]) - sp.face.eyeR[1] * 0.6;
    const e = this.edges(sy);
    const wid = e.r - e.l;
    const a = w.at(e.l + wid * 0.1, sy);
    const b = w.at(e.r - wid * 0.1, sy);
    const m = w.at((e.l + e.r) / 2, sy + wid * 0.12);
    g.moveTo(a.x, a.y).quadraticCurveTo(m.x, m.y, b.x, b.y).stroke({ color: hex(this.colors.cape), width: Math.max(2, wid * 0.045 * w.s), cap: "round" });
    g.circle(m.x, m.y - wid * 0.04 * w.s, Math.max(2, wid * 0.04 * w.s)).fill({ color: hex(this.colors.frame) });
  }

  /** The scarf (drawn under the arms) */
  drawScarf(g: PixiNS.Graphics, w: WearFrame) {
    if (!this.on.has("scarf") || !this.band) return;
    const { y, half } = this.band;
    const c = this.colors;
    const e = this.edges(y);
    const pad = (e.r - e.l) * 0.03;
    const L = e.l - pad;
    const R = e.r + pad;
    // it wraps around a round body, so its edges curve down in the middle
    const sag = half * 0.55;
    const N = 14;
    const edge = (dy: number, k: number) => {
      const pts: number[] = [];
      for (let i = 0; i <= N; i++) {
        const u = i / N;
        const x = L + (R - L) * u;
        const p = w.at(x, y + dy + Math.sin(Math.PI * u) * sag * k);
        pts.push(p.x, p.y);
      }
      return pts;
    };
    const top = edge(-half, 1);
    const bottom = edge(half, 1.15);
    const band = [...top];
    for (let i = bottom.length - 2; i >= 0; i -= 2) band.push(bottom[i], bottom[i + 1]);
    g.poly(band, true).fill({ color: hex(c.scarf) });
    // knit stripes, and a soft shadow along the bottom edge
    for (const k of [-0.38, 0.38]) g.poly(edge(half * k, 1.07), false).stroke({ color: hex(c.stripe), width: Math.max(1.5, half * 0.28 * w.s), alpha: 0.9 });
    g.poly(edge(half * 0.88, 1.15), false).stroke({ color: 0x000000, width: Math.max(1, half * 0.22 * w.s), alpha: 0.18 });
    // the knot, and its tail hanging down the front (swaying a little)
    const kx = L + (R - L) * 0.7;
    const knot = w.at(kx, y + sag * 0.85);
    const kr = half * 0.95 * w.s;
    const sway = w.calm ? 0 : Math.sin(w.t * 1.7) * half * 0.25;
    const tail = [
      w.at(kx - half * 0.7, y + sag),
      w.at(kx + half * 0.75, y + sag),
      w.at(kx + half * 0.95 + sway, y + sag + half * 3.6),
      w.at(kx - half * 0.35 + sway, y + sag + half * 3.4),
    ];
    g.poly(tail.flatMap((p) => [p.x, p.y]), true).fill({ color: hex(c.scarf) });
    g.poly(tail.flatMap((p) => [p.x, p.y]), true).fill({ color: 0x000000, alpha: 0.12 });
    const stripeY = [0.45, 0.62].map((k) => [w.at(kx - half * 0.55 + sway * k, y + sag + half * 3.5 * k), w.at(kx + half * 0.85 + sway * k, y + sag + half * 3.6 * k)]);
    for (const [a, b] of stripeY) g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ color: hex(c.stripe), width: Math.max(1.5, half * 0.26 * w.s), alpha: 0.9 });
    // fringe
    for (let i = 0; i <= 4; i++) {
      const a = w.at(kx - half * 0.35 + (half * 1.3 * i) / 4 + sway, y + sag + half * (3.4 + 0.05 * i));
      const b = w.at(kx - half * 0.35 + (half * 1.3 * i) / 4 + sway * 1.3, y + sag + half * (4 + 0.05 * i));
      g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ color: hex(c.scarf), width: Math.max(1, half * 0.16 * w.s), cap: "round" });
    }
    g.circle(knot.x, knot.y, kr).fill({ color: hex(c.scarf) });
    g.circle(knot.x - kr * 0.25, knot.y - kr * 0.3, kr * 0.45).fill({ color: 0xffffff, alpha: 0.12 });
    g.circle(knot.x, knot.y, kr).stroke({ color: 0x000000, width: Math.max(1, kr * 0.12), alpha: 0.2 });
  }

  /** The hat and the glasses (drawn over the face, under the stalk) */
  drawHead(g: PixiNS.Graphics, w: WearFrame) {
    const c = this.colors;
    if (this.on.has("beanie") && this.hat) {
      const { top, brim, cx } = this.hat;
      const h = brim - top;
      // a knit hat is a bit bigger than the head it's on
      const pad = (y: number) => {
        const e = this.edges(y);
        // (more room up top, where it slouches; snug at the cuff, where it grips the head)
        const snug = Math.max(0, Math.min(1, (y - top) / h));
        return (e.r - e.l) * (0.07 - 0.05 * snug) + h * (0.08 - 0.05 * snug);
      };
      const side = (y: number, dir: -1 | 1) => {
        const e = this.edges(y);
        return dir < 0 ? e.l - pad(y) : e.r + pad(y);
      };
      // the sides hug the head from the brim up to its shoulder; above that, a slouchy dome rises over the top
      const shoulder = top + h * 0.45;
      // (as tall as a dome over that width: a narrow head gets a low crown, a wide one a round beanie)
      const crownH = Math.min(h * 1.3, Math.max(h * 0.6, (side(shoulder, 1) - side(shoulder, -1)) * 0.42));
      const lx = side(shoulder, -1);
      const rx = side(shoulder, 1);
      // (it slouches a little to the back: the dome's top leans away from the stalk)
      const lean = (cx < (lx + rx) / 2 ? 1 : -1) * (rx - lx) * 0.08;
      const pt = (x: number, y: number) => w.at(x, y);
      const outline: number[] = [];
      const push = (p: { x: number; y: number }) => outline.push(p.x, p.y);
      for (let i = 0; i <= 6; i++) push(pt(side(shoulder + ((brim - shoulder) * i) / 6, 1), shoulder + ((brim - shoulder) * i) / 6));
      const bl = side(brim, -1);
      const br = side(brim, 1);
      for (let i = 1; i < 10; i++) {
        const u = i / 10;
        push(pt(br + (bl - br) * u, brim + Math.sin(Math.PI * u) * h * 0.14));
      }
      for (let i = 6; i >= 0; i--) push(pt(side(shoulder + ((brim - shoulder) * i) / 6, -1), shoulder + ((brim - shoulder) * i) / 6));
      const apex = { x: (lx + rx) / 2 + lean, y: shoulder - crownH };
      for (let i = 1; i < 16; i++) {
        const a = Math.PI + (Math.PI * i) / 16;
        const k = Math.sin((Math.PI * i) / 16);
        push(pt((lx + rx) / 2 + Math.cos(a) * ((rx - lx) / 2) * (1 + 0.06 * k) + lean * k * k, shoulder + Math.sin(a) * crownH * (0.94 + 0.06 * k)));
      }
      g.poly(outline, true).fill({ color: hex(c.hat) });
      // its shading: darker on the side away from the lantern, and a soft highlight on the near side
      const shade: number[] = [];
      for (let i = 0; i <= 8; i++) {
        const u = i / 8;
        const p = pt((lx + rx) / 2 + lean * 0.5 + (rx - (lx + rx) / 2) * (0.35 + 0.65 * Math.sin((Math.PI * u) / 2)), shoulder - crownH * 0.85 * Math.cos((Math.PI * u) / 2) + (brim - shoulder) * u);
        shade.push(p.x, p.y);
      }
      const sb = pt(br, brim);
      const sc = pt((lx + rx) / 2 + (rx - lx) * 0.18, brim + h * 0.1);
      shade.push(sb.x, sb.y, sc.x, sc.y);
      g.poly(shade, true).fill({ color: 0x000000, alpha: 0.17 });
      const hl = pt(lx + (rx - lx) * 0.3, shoulder - crownH * 0.4);
      g.ellipse(hl.x, hl.y, (rx - lx) * 0.12 * w.s * w.squashX, crownH * 0.28 * w.s * w.squashY).fill({ color: 0xffffff, alpha: 0.1 });
      // knit ribs running up the dome
      for (let i = 1; i < 8; i++) {
        const u = i / 8;
        const x0 = lx + (rx - lx) * u;
        const a = pt(x0, shoulder + (brim - shoulder) * 0.35);
        const b = pt(x0 + (apex.x - x0) * 0.55, shoulder - crownH * 0.7 * Math.sin(Math.PI * u));
        g.moveTo(a.x, a.y)
          .quadraticCurveTo(pt(x0 + (apex.x - x0) * 0.15, shoulder - crownH * 0.35).x, pt(x0, shoulder - crownH * 0.35).y, b.x, b.y)
          .stroke({ color: 0x000000, width: Math.max(1, h * 0.03 * w.s), alpha: 0.12 });
      }
      // the folded cuff, with ribs
      const cuffTop = brim - h * 0.4;
      const ctl = side(cuffTop, -1) - h * 0.02;
      const ctr = side(cuffTop, 1) + h * 0.02;
      const cbl = bl - h * 0.01;
      const cbr = br + h * 0.01;
      const N = 14;
      const upper: { x: number; y: number }[] = [];
      const lower: { x: number; y: number }[] = [];
      for (let i = 0; i <= N; i++) {
        const u = i / N;
        upper.push(pt(ctl + (ctr - ctl) * u, cuffTop + Math.sin(Math.PI * u) * h * 0.13));
        lower.push(pt(cbl + (cbr - cbl) * u, brim + h * 0.04 + Math.sin(Math.PI * u) * h * 0.16));
      }
      g.poly([...upper, ...lower.slice().reverse()].flatMap((p) => [p.x, p.y]), true).fill({ color: hex(c.cuff) });
      for (let i = 1; i < N; i++) g.moveTo(upper[i].x, upper[i].y).lineTo(lower[i].x, lower[i].y).stroke({ color: 0x000000, width: Math.max(1, h * 0.035 * w.s), alpha: 0.2 });
      g.poly(upper.flatMap((p) => [p.x, p.y]), false).stroke({ color: 0xffffff, width: Math.max(1, h * 0.03 * w.s), alpha: 0.12 });
      g.poly(lower.flatMap((p) => [p.x, p.y]), false).stroke({ color: 0x000000, width: Math.max(1, h * 0.05 * w.s), alpha: 0.22 });
      // a pom-pom on top (the younger Gloams), or where the stalk comes out through the knit
      if (this.colors.pompom) {
        const p = pt(apex.x, apex.y + crownH * 0.06);
        const r = (rx - lx) * 0.16 * w.s;
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * Math.PI * 2;
          g.circle(p.x + Math.cos(a) * r * 0.55, p.y + Math.sin(a) * r * 0.5, r * 0.55).fill({ color: hex(this.colors.pompom) });
        }
        g.circle(p.x, p.y, r * 0.7).fill({ color: hex(this.colors.pompom) });
        g.circle(p.x + r * 0.25, p.y + r * 0.25, r * 0.55).fill({ color: 0x000000, alpha: 0.1 });
      }
      const hole = pt(this.spec.stalk.base[0], Math.max(shoulder - crownH * 0.8, this.spec.stalk.base[1]));
      g.ellipse(hole.x, hole.y, this.spec.stalk.width * w.s * 0.95, this.spec.stalk.width * w.s * 0.45).fill({ color: 0x000000, alpha: 0.35 });
    }
    if (this.on.has("glasses")) {
      const f = this.spec.face;
      const r = Math.max(f.eyeR[0], f.eyeR[1]) * 1.22;
      const centres = f.eyes.map(([x, y]) => w.at(x, y));
      const rx = r * w.s * w.squashX;
      const ry = r * w.s * w.squashY;
      const lw = Math.max(1.5, r * 0.13 * w.s);
      for (const p of centres) {
        g.ellipse(p.x, p.y, rx, ry).fill({ color: 0xffffff, alpha: 0.07 });
        // a glint on the glass
        const gr = Math.min(rx, ry) * 0.72;
        g.moveTo(p.x + Math.cos(Math.PI * 1.08) * gr, p.y + Math.sin(Math.PI * 1.08) * gr)
          .arc(p.x, p.y, gr, Math.PI * 1.08, Math.PI * 1.42)
          .stroke({ color: 0xffffff, width: lw * 0.8, alpha: 0.55, cap: "round" });
        g.ellipse(p.x, p.y, rx, ry).stroke({ color: hex(c.frame), width: lw });
      }
      // the bridge, and the arms going back along its head
      const [a, b] = centres;
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - ry * 0.25 };
      g.moveTo(a.x + rx * 0.92, a.y - ry * 0.2)
        .quadraticCurveTo(mid.x, mid.y - ry * 0.3, b.x - rx * 0.92, b.y - ry * 0.2)
        .stroke({ color: hex(c.frame), width: lw, cap: "round" });
      g.moveTo(a.x - rx, a.y - ry * 0.15).lineTo(a.x - rx * 1.45, a.y - ry * 0.35).stroke({ color: hex(c.frame), width: lw, cap: "round" });
      g.moveTo(b.x + rx, b.y - ry * 0.15).lineTo(b.x + rx * 1.45, b.y - ry * 0.35).stroke({ color: hex(c.frame), width: lw, cap: "round" });
    }
  }
}
