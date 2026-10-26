import type * as PixiNS from "pixi.js";
import { GloamBrain, type BrainInput, type Frame } from "@/lib/gloam-rig/brain";
import { Pendulum, Stalk } from "@/lib/gloam-rig/physics";
import type { RigSpec } from "@/lib/gloam-rig/spec";

type Pixi = typeof PixiNS;

export interface ActorInput extends BrainInput {
  light: number;
}

/** Where things ended up this frame, in the actor's parent space (for scene lighting and speech tails) */
export interface ActorOut {
  lantern: { x: number; y: number };
  mouth: { x: number; y: number };
  top: number;
  frame: Frame;
}

const hex = (c: string) => parseInt(c.replace("#", ""), 16);
const GRID = 8;

/**
 * Gloam, drawn by PixiJS from one painted body plus code.
 *   body:     the painting, as a stretchy mesh (squash, stretch, lean, bulge)
 *   face:     eyes, lids, brows, mouth, cheeks, drawn every frame from the brain's numbers
 *   arms/feet: soft stubby shapes in the body's colours
 *   stalk:    a springy chain, and the painted lantern swinging from its tip
 *   light:    the lantern's warm light falling on the fur near it, and the eureka glow from inside
 * Put `container` where Gloam's feet should be. Call update() every frame.
 */
export class GloamActor {
  container: PixiNS.Container;
  brain = new GloamBrain();
  private spec: RigSpec;
  private s = 1; // painting px -> screen px
  private body: PixiNS.MeshPlane;
  private warm: PixiNS.MeshPlane;
  private warmMask: PixiNS.Sprite;
  private inner: PixiNS.Sprite;
  private shadow: PixiNS.Sprite;
  private back: PixiNS.Graphics;
  private front: PixiNS.Graphics;
  private face: PixiNS.Graphics;
  private cheeks: PixiNS.Sprite[];
  private stalkG: PixiNS.Graphics;
  private lanternBox: PixiNS.Container;
  private lanternLit: PixiNS.Sprite;
  private lanternDark: PixiNS.Sprite;
  private flameGlow: PixiNS.Sprite;
  private zs: PixiNS.Text[];
  private stalk: Stalk;
  private pendulum: Pendulum;
  private lastLook = { x: 0, y: 0 };

  constructor(PIXI: Pixi, spec: RigSpec, tex: { body: PixiNS.Texture; lit: PixiNS.Texture; dark: PixiNS.Texture; glow: PixiNS.Texture }) {
    this.spec = spec;
    const c = new PIXI.Container();
    this.container = c;

    this.shadow = new PIXI.Sprite(tex.glow);
    this.shadow.anchor.set(0.5);
    this.shadow.tint = 0x000000;
    c.addChild(this.shadow);

    this.back = new PIXI.Graphics(); // feet
    c.addChild(this.back);

    this.body = new PIXI.MeshPlane({ texture: tex.body, verticesX: GRID, verticesY: GRID });
    c.addChild(this.body);

    // the lantern's warm light on the fur: a warm copy of the body, only visible near the lantern
    this.warm = new PIXI.MeshPlane({ texture: tex.body, verticesX: GRID, verticesY: GRID });
    this.warm.tint = 0xffb45a;
    this.warm.blendMode = "add";
    this.warmMask = new PIXI.Sprite(tex.glow);
    this.warmMask.anchor.set(0.5);
    c.addChild(this.warmMask);
    this.warm.mask = this.warmMask;
    c.addChild(this.warm);

    // the eureka: Gloam lit from inside
    this.inner = new PIXI.Sprite(tex.glow);
    this.inner.anchor.set(0.5);
    this.inner.tint = 0xffd27a;
    this.inner.blendMode = "add";
    c.addChild(this.inner);

    this.cheeks = [0, 1].map(() => {
      const s = new PIXI.Sprite(tex.glow);
      s.anchor.set(0.5);
      s.tint = hex(spec.face.cheekColor);
      c.addChild(s);
      return s;
    });
    this.face = new PIXI.Graphics();
    c.addChild(this.face);
    this.front = new PIXI.Graphics(); // arms
    c.addChild(this.front);

    this.stalkG = new PIXI.Graphics();
    c.addChild(this.stalkG);
    this.lanternBox = new PIXI.Container();
    this.lanternDark = new PIXI.Sprite(tex.dark);
    this.lanternLit = new PIXI.Sprite(tex.lit);
    for (const sp of [this.lanternDark, this.lanternLit]) {
      sp.anchor.set(spec.lantern.hang[0] / spec.lantern.w, spec.lantern.hang[1] / spec.lantern.h);
      this.lanternBox.addChild(sp);
    }
    c.addChild(this.lanternBox);
    this.flameGlow = new PIXI.Sprite(tex.glow);
    this.flameGlow.anchor.set(0.5);
    this.flameGlow.tint = 0xffc864;
    this.flameGlow.blendMode = "add";
    c.addChild(this.flameGlow);

    this.zs = [0, 1, 2].map(() => {
      const z = new PIXI.Text({ text: "z", style: { fontFamily: "system-ui", fontWeight: "700", fontSize: 28, fill: 0xd3ddd6 } });
      z.anchor.set(0.5);
      z.alpha = 0;
      c.addChild(z);
      return z;
    });

    const rest = spec.stalk.rest.map(([x, y]) => ({ x, y }));
    this.stalk = new Stalk(rest, 0.14, 0.88);
    const hangLen = Math.hypot(spec.lantern.flame[0] - spec.lantern.hang[0], spec.lantern.flame[1] - spec.lantern.hang[1]);
    this.pendulum = new Pendulum(Math.max(30, hangLen * 2.2), 1.4);
    this.setHeight(300);
  }

  /** How tall Gloam should be on screen, from feet to the top of its body (px) */
  setHeight(px: number) {
    const above = this.spec.body.feet[1];
    const s = px / above;
    if (Math.abs(s - this.s) < 1e-4) return;
    // the stalk's physics lives in screen px, so rescale its rest shape
    this.stalk = new Stalk(
      this.spec.stalk.rest.map(([x, y]) => ({ x: x * s, y: y * s })),
      0.14,
      0.88,
    );
    this.s = s;
  }

  /** painting px -> local px (origin at the feet), bent by this frame's squash/lean */
  private deform(px: number, py: number, f: Frame) {
    const { feet, h } = this.spec.body;
    const s = this.s;
    let x = (px - feet[0]) * s;
    let y = (py - feet[1]) * s;
    const v = Math.max(0, Math.min(1, -(py - feet[1]) / feet[1])); // 0 at feet, 1 at the top
    const bulge = 1 + (f.squashX - 1) * 0.6 * Math.sin(Math.PI * v);
    x *= f.squashX * bulge;
    y *= f.squashY;
    // lean: the top bends more than the bottom, like a soft thing
    const a = f.tilt * (0.35 + 0.65 * v);
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const rx = x * ca - y * sa;
    const ry = x * sa + y * ca;
    return { x: rx + f.x * h * s, y: ry + f.y * feet[1] * s };
  }

  update(dt: number, inp: ActorInput): ActorOut {
    const f = this.brain.update(dt, inp);
    const sp = this.spec;
    const s = this.s;
    const H = sp.body.feet[1] * s;

    // ---- body mesh ----
    for (const mesh of [this.body, this.warm]) {
      const buf = mesh.geometry.getAttribute("aPosition").buffer;
      const data = buf.data as Float32Array;
      for (let j = 0; j < GRID; j++) {
        for (let i = 0; i < GRID; i++) {
          const px = (i / (GRID - 1)) * sp.body.w;
          const py = (j / (GRID - 1)) * sp.body.h;
          const p = this.deform(px, py, f);
          const k = (j * GRID + i) * 2;
          data[k] = p.x;
          data[k + 1] = p.y;
        }
      }
      buf.update();
    }

    // ---- shadow (smaller and fainter when Gloam is in the air) ----
    const air = Math.max(0, -f.y);
    this.shadow.position.set(f.x * H, 4);
    this.shadow.scale.set((sp.body.w * s * 0.9 * f.squashX * (1 - air * 1.5)) / this.shadow.texture.width, (H * 0.16) / this.shadow.texture.height);
    this.shadow.alpha = 0.55 * (1 - air * 2);

    // ---- feet ----
    const g = this.back;
    g.clear();
    sp.feet.at.forEach(([fx, fy], i) => {
      const lift = i === 0 ? f.footL : f.footR;
      const p = this.deform(fx, fy, { ...f, tilt: f.tilt * 0.3 });
      const w = sp.feet.w * s * (1 + f.sit * 0.2);
      const h = sp.feet.h * s;
      g.ellipse(p.x + (i ? 1 : -1) * f.sit * w * 0.4, p.y - lift * H * 0.05, w / 2, h / 2).fill({ color: hex(sp.body.shade) });
      g.ellipse(p.x + (i ? 1 : -1) * f.sit * w * 0.4, p.y - lift * H * 0.05 - h * 0.12, w * 0.42, h * 0.32).fill({ color: hex(sp.body.color), alpha: 0.55 });
    });

    // ---- face ----
    const fg = this.face;
    fg.clear();
    const [erx, ery] = sp.face.eyeR.map((r) => r * s);
    // ease the look so eyes don't jitter at tiny changes
    this.lastLook.x += (f.lookX - this.lastLook.x) * 0.5;
    this.lastLook.y += (f.lookY - this.lastLook.y) * 0.5;
    sp.face.eyes.forEach(([ex, ey], i) => {
      const c = this.deform(ex, ey, f);
      const lid = i === 0 ? f.lidL : f.lidR;
      const rx = erx * f.squashX;
      const ry = ery * f.squashY;
      // sclera, with a soft shadow under the upper lid
      fg.ellipse(c.x, c.y, rx, ry).fill({ color: hex(sp.face.sclera) });
      fg.ellipse(c.x, c.y - ry * 0.55, rx * 0.92, ry * 0.5).fill({ color: 0x000000, alpha: 0.12 });
      // iris + pupil, looking around, kept inside the eye
      const ir = ry * sp.face.irisR;
      const ix = c.x + this.lastLook.x * (rx - ir) * 0.75;
      const iy = c.y + this.lastLook.y * (ry - ir) * 0.6;
      fg.circle(ix, iy, ir).fill({ color: hex(sp.face.irisDark) });
      fg.circle(ix, iy + ir * 0.08, ir * 0.8).fill({ color: hex(sp.face.iris) });
      fg.circle(ix, iy, ir * 0.48 * f.pupil).fill({ color: 0x0b0806 });
      fg.circle(ix - ir * 0.35, iy - ir * 0.38, ir * 0.26).fill({ color: 0xffffff, alpha: 0.95 });
      fg.circle(ix + ir * 0.3, iy + ir * 0.32, ir * 0.11).fill({ color: 0xffffff, alpha: 0.7 });
      // upper lid: fur coloured, closes over the eye; lash line on its edge
      const edge = c.y - ry + lid * ry * 2.05;
      if (lid > 0.02) {
        fg.moveTo(c.x - rx * 1.12, c.y - ry * 1.25)
          .lineTo(c.x + rx * 1.12, c.y - ry * 1.25)
          .lineTo(c.x + rx * 1.12, Math.min(edge, c.y + ry * 1.05))
          .quadraticCurveTo(c.x, Math.min(edge, c.y + ry) + ry * 0.35 * lid, c.x - rx * 1.12, Math.min(edge, c.y + ry * 1.05))
          .closePath()
          .fill({ color: hex(sp.body.color) });
      }
      const lashY = Math.min(edge, c.y + ry * 1.0);
      fg.moveTo(c.x - rx * 1.02, lashY + (lid > 0.9 ? 0 : -ry * 0.05))
        .quadraticCurveTo(c.x, lashY + ry * 0.32 * Math.min(1, lid + 0.15) - (lid > 0.5 ? 0 : ry * 0.62), c.x + rx * 1.02, lashY + (lid > 0.9 ? 0 : -ry * 0.05))
        .stroke({ color: hex(sp.face.lash), width: Math.max(1.5, ry * 0.16), cap: "round", alpha: 0.9 });
      // the rim of the eye (keeps it from looking stuck on)
      fg.ellipse(c.x, c.y, rx, ry).stroke({ color: hex(sp.body.shade), width: Math.max(1, ry * 0.08), alpha: 0.6 });
      // brow
      const b = sp.face.brow;
      const ang = (i === 0 ? -1 : 1) * (i === 0 ? f.browL : f.browR);
      const by = c.y - ry - b.above * s + f.browY * ery * 1.2;
      const bl = b.length * s;
      fg.moveTo(c.x - Math.cos(ang) * bl / 2, by - Math.sin(ang) * bl / 2)
        .lineTo(c.x + Math.cos(ang) * bl / 2, by + Math.sin(ang) * bl / 2)
        .stroke({ color: hex(b.color), width: b.thick * s, cap: "round" });
    });

    // mouth
    const m = this.deform(sp.face.mouth[0], sp.face.mouth[1], f);
    const mw = (sp.face.mouthW * s * f.mouthWidth) / 2;
    const lift = f.smile * mw * 0.45;
    const lt = f.mouthTilt * mw * 0.4;
    if (f.mouthOpen > 0.08) {
      const open = f.mouthOpen * mw * 0.95;
      fg.moveTo(m.x - mw, m.y - lift - lt)
        .quadraticCurveTo(m.x, m.y - open * 0.25 + lift * 0.2, m.x + mw, m.y - lift + lt)
        .quadraticCurveTo(m.x, m.y + open * 1.4 - lift * 0.4, m.x - mw, m.y - lift - lt)
        .closePath()
        .fill({ color: hex(sp.face.mouthColor) });
      if (f.mouthOpen > 0.35) fg.ellipse(m.x, m.y + open * 0.65 - lift * 0.3, mw * 0.45, open * 0.3).fill({ color: hex(sp.face.tongue) });
    } else {
      fg.moveTo(m.x - mw, m.y - lift - lt)
        .quadraticCurveTo(m.x, m.y + lift * 1.2, m.x + mw, m.y - lift + lt)
        .stroke({ color: hex(sp.face.mouthColor), width: Math.max(2, mw * 0.18), cap: "round" });
    }

    // cheeks
    sp.face.cheeks.forEach(([cx, cy], i) => {
      const p = this.deform(cx, cy, f);
      const ch = this.cheeks[i];
      ch.position.set(p.x, p.y);
      const r = (sp.face.cheekR * s * 2.6) / ch.texture.width;
      ch.scale.set(r * f.squashX, r * 0.7 * f.squashY);
      ch.alpha = Math.min(0.85, f.cheek * 0.9);
    });

    // ---- arms (soft mittens in the body's colours) ----
    const a = this.front;
    a.clear();
    sp.arms.shoulders.forEach(([sx, sy], i) => {
      const p = this.deform(sx, sy, f);
      const ang = (i === 0 ? f.armL : f.armR) + f.tilt;
      const dir = i === 0 ? -1 : 1;
      const dx = dir * Math.sin(ang);
      const dy = Math.cos(ang);
      const L = sp.arms.length * s;
      const T = sp.arms.thick * s;
      const ex = p.x + dx * L;
      const ey = p.y + dy * L;
      a.moveTo(p.x, p.y).lineTo(ex, ey).stroke({ color: hex(sp.body.shade), width: T, cap: "round" });
      a.moveTo(p.x - T * 0.08, p.y - T * 0.12).lineTo(ex - T * 0.08, ey - T * 0.12).stroke({ color: hex(sp.body.color), width: T * 0.72, cap: "round" });
      a.circle(ex - dx * T * 0.1 - T * 0.12, ey - T * 0.18, T * 0.16).fill({ color: hex(sp.body.light), alpha: 0.35 });
    });

    // ---- stalk + lantern ----
    const base = this.deform(sp.stalk.base[0], sp.stalk.base[1], f);
    const pts = this.stalk.step(base, f.tilt, dt, Math.sin(this.brain.t * 0.8) * 2 * s);
    const st = this.stalkG;
    st.clear();
    const w0 = sp.stalk.width * s;
    for (const [col, k] of [
      [hex(sp.stalk.dark), 1],
      [hex(sp.stalk.color), 0.55],
    ] as const) {
      for (let i = 1; i < pts.length; i++) {
        const t = i / (pts.length - 1);
        st.moveTo(pts[i - 1].x, pts[i - 1].y)
          .lineTo(pts[i].x, pts[i].y)
          .stroke({ color: col, width: Math.max(1, w0 * k * (1 - t * 0.55)), cap: "round", join: "round" });
      }
    }
    const tip = this.stalk.tip();
    if (f.lanternKick) this.pendulum.kick(f.lanternKick * (Math.random() < 0.5 ? -1 : 1));
    const swing = inp.calm ? 0 : this.pendulum.step(tip, dt);
    const ls = (sp.body.feet[1] * s * 0.36) / sp.lantern.h;
    this.lanternBox.position.set(tip.x, tip.y);
    this.lanternBox.rotation = swing;
    this.lanternBox.scale.set(ls);
    const lit = inp.light > 0 ? 0.35 + inp.light * 0.65 : 0;
    this.lanternLit.alpha = Math.min(1, lit + f.glow);
    this.lanternDark.alpha = 1;
    // where the flame is now
    const fx = (sp.lantern.flame[0] - sp.lantern.hang[0]) * ls;
    const fy = (sp.lantern.flame[1] - sp.lantern.hang[1]) * ls;
    const flame = { x: tip.x + fx * Math.cos(swing) - fy * Math.sin(swing), y: tip.y + fx * Math.sin(swing) + fy * Math.cos(swing) };
    const glowR = (H * (0.6 + inp.light * 1.2 + f.glow * 1.5)) / this.flameGlow.texture.width;
    this.flameGlow.position.set(flame.x, flame.y);
    this.flameGlow.scale.set(glowR);
    this.flameGlow.alpha = Math.min(1, lit * 0.8 + f.glow);

    // the lantern's light on Gloam's fur, and the eureka glow from inside
    this.warmMask.position.set(flame.x, flame.y);
    this.warmMask.scale.set((H * (1.1 + inp.light * 0.8)) / this.warmMask.texture.width);
    this.warm.alpha = Math.min(0.9, lit * 0.45 + f.glow * 0.6);
    const mid = this.deform(sp.body.feet[0], sp.body.feet[1] * 0.55, f);
    this.inner.position.set(mid.x, mid.y);
    this.inner.scale.set((H * 2.4 * (0.6 + f.glow)) / this.inner.texture.width);
    this.inner.alpha = f.glow * 0.8;

    // ---- z z z ----
    this.zs.forEach((z, i) => {
      if (!f.snoring) {
        z.alpha = Math.max(0, z.alpha - dt * 2);
        return;
      }
      const t = (this.brain.t * 0.45 + i / 3) % 1;
      const top = this.deform(sp.body.feet[0] + sp.body.w * 0.18, sp.body.feet[1] * 0.25, f);
      z.position.set(top.x + t * H * 0.25 + Math.sin(t * 6) * 6, top.y - t * H * 0.45);
      z.scale.set((0.5 + t * 0.8) * (H / 300));
      z.alpha = Math.sin(t * Math.PI) * 0.8;
    });

    const top = this.deform(sp.body.feet[0], 0, f);
    return { lantern: flame, mouth: m, top: top.y, frame: f };
  }
}
