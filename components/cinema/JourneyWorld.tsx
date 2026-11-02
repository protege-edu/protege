"use client";

import { useEffect, useRef } from "react";
import type { GloamMood } from "@/components/gloam/poses";
import type { GloamActor } from "@/components/gloam/rig/GloamActor";
import type { BossState, GloamBox } from "@/components/game/Stage";
import type { JourneyWorld as World } from "@/lib/age-styles/types";
import { lanternFor } from "@/lib/companion/level";
import { BORED, TRICKS } from "@/lib/gloam-rig/brain";
import type { RigSpec } from "@/lib/gloam-rig/spec";
import { useCalmMotion } from "@/lib/useCalmMotion";
import { fadeInCanvas, fogCanvas, glowCanvas, grainCanvas, lightSpillCanvas, puffCanvas, ringCanvas, vignetteCanvas } from "./textures";

export interface JourneyProps {
  world: World;
  rig: RigSpec;
  mood: GloamMood;
  typingTick: number;
  eurekaTick: number;
  talking: boolean;
  /** it's the student's turn (Gloam gets bored only then) */
  waiting: boolean;
  /** 0..1 how much Gloam understands overall */
  light: number;
  /** Gloam's level across lessons (bigger lantern) */
  level: number;
  /** one shrine per idea, in lesson order; each candle burns at its idea's level (0 unlit .. 3 lit) */
  levels: number[];
  /** the shrine Gloam walks to and waits at: the first idea it doesn't get yet (= levels.length when all are lit) */
  stop: number;
  /** where Gloam stands across the screen (0..1), where the ground sits down it, and Gloam's size */
  focus: number;
  groundAt: number;
  gloamHeight: number;
  onGloamBox?: (box: GloamBox) => void;
  /** Gloam set off walking (true) or arrived (false) */
  onWalking?: (walking: boolean) => void;
  /** test mode: goes up by one to make Gloam doze off right away */
  dozeTick?: number;
  /** the boss fight: the Muddle gathers in the valley */
  boss?: BossState;
  /** what Gloam is wearing (from its stash) */
  outfit?: string[];
}

/**
 * The adventure, rendered on the GPU with PixiJS: a long painted valley Gloam walks across.
 *
 *   - The panorama exists twice, painted DARK and LIT, in depth layers that slide at different speeds.
 *   - Gloam (the animated rig) walks the path. Each idea understood lights the shrine it stands at,
 *     then it hop-walks to the next one and the camera follows.
 *   - Light is the meter: the lit painting shows through around Gloam's lantern, and every shrine
 *     you've lit leaves its own pool of light behind, so the path you taught stays glowing.
 *   - The Muddle: fog over the path ahead, thinning as Gloam understands more. In the boss fight it
 *     gathers into a body with two pale eyes and dims the valley; every clean hit is a burst of moonlight
 *     that tears through it (it shrinks), a miss makes it swell, and a combo makes Gloam's lantern blaze.
 * Cheap Chromebooks get a lighter version automatically; reduced motion keeps it still.
 */
export function JourneyWorld(props: JourneyProps) {
  const host = useRef<HTMLDivElement>(null);
  const calm = useCalmMotion();
  const live = useRef({ ...props, calm });
  useEffect(() => {
    live.current = { ...props, calm };
  });
  const { world, rig } = props;

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let destroyed = false;
    let cleanup = () => {};

    (async () => {
      const PIXI = await import("pixi.js");
      // Protégé's security policy forbids eval (no code from strings); this makes Pixi build its shaders without it
      await import("pixi.js/unsafe-eval");
      const { AdvancedBloomFilter } = await import("pixi-filters");
      const { loadActor } = await import("@/components/gloam/rig/load");
      if (destroyed) return;

      const nav = navigator as Navigator & { deviceMemory?: number };
      let lite = (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4;

      const app = new PIXI.Application();
      await app.init({
        resizeTo: el,
        backgroundAlpha: 0,
        antialias: false,
        resolution: Math.min(window.devicePixelRatio || 1, lite ? 1 : 1.5),
        autoDensity: true,
        preference: "webgl",
        powerPreference: "high-performance",
      });
      if (destroyed) return app.destroy(true);
      el.appendChild(app.canvas);
      app.canvas.style.position = "absolute";
      app.canvas.style.inset = "0";

      const [textures, actor, shrineTex] = await Promise.all([
        Promise.all(world.layers.flatMap((l) => [PIXI.Assets.load(l.dark), PIXI.Assets.load(l.lit)])),
        loadActor(PIXI, rig),
        PIXI.Assets.load(world.shrine.src),
      ]);
      if (destroyed) return app.destroy(true);

      const tex = (c: HTMLCanvasElement) => PIXI.Texture.from(c);
      const glowTex = tex(glowCanvas());
      const spillTex = tex(lightSpillCanvas());
      const fogTex = tex(fogCanvas());
      const grainTex = tex(grainCanvas());
      const vignetteTex = tex(vignetteCanvas());

      // ---- the painted valley: dark, and lit shown through the light ----
      const darkWorld = new PIXI.Container();
      const litWorld = new PIXI.Container();
      const layers = world.layers.map((l, i) => {
        const dark = new PIXI.Sprite(textures[i * 2]);
        const lit = new PIXI.Sprite(textures[i * 2 + 1]);
        darkWorld.addChild(dark);
        litWorld.addChild(lit);
        return { depth: l.depth, dark, lit };
      });
      // all the light pools (Gloam's lantern + every lit shrine) are drawn into one mask
      const spillGroup = new PIXI.Container();
      const lanternSpill = new PIXI.Sprite(spillTex);
      lanternSpill.anchor.set(0.5);
      spillGroup.addChild(lanternSpill);
      // the eureka: a wave of light rolls out from the lantern across the whole valley.
      // A ring you can see, and a matching reveal of the lit painting as it passes.
      const waveReveal = new PIXI.Sprite(spillTex);
      waveReveal.anchor.set(0.5);
      waveReveal.visible = false;
      spillGroup.addChild(waveReveal);
      const waveRing = new PIXI.Sprite(tex(ringCanvas()));
      waveRing.anchor.set(0.5);
      waveRing.tint = 0xffc864;
      waveRing.blendMode = "add";
      waveRing.visible = false;
      let waveT = -1;
      const shrineSpills: PixiSprite[] = [];
      let maskRT = PIXI.RenderTexture.create({ width: 8, height: 8 });
      const mask = new PIXI.Sprite(maskRT);
      litWorld.mask = mask;

      const fogBack = new PIXI.TilingSprite({ texture: fogTex, width: 10, height: 10 });
      const fogFront = new PIXI.TilingSprite({ texture: fogTex, width: 10, height: 10 });
      const muddle = new PIXI.TilingSprite({ texture: fogTex, width: 10, height: 10 });
      for (const f of [fogBack, fogFront, muddle]) f.tint = world.fog;
      // the Muddle fades in softly ahead of Gloam (no hard edge)
      const muddleFade = new PIXI.Sprite(tex(fadeInCanvas()));
      muddle.mask = muddleFade;

      // ---- the boss: the Muddle gathered into a body of smoke, with two pale eyes ----
      const puffTex = tex(puffCanvas());
      const bossBody = new PIXI.Container();
      const PUFFS = lite ? 6 : 11;
      const puffs = Array.from({ length: PUFFS }, (_, i) => {
        const p = new PIXI.Sprite(puffTex);
        p.anchor.set(0.5);
        // moonlit smoke, lighter than the darkened valley so its shape reads
        // thick pale fog (the Muddle IS the fog), with darker hollows inside for depth
        p.tint = i % 4 === 3 ? 0x3a4642 : world.fog;
        bossBody.addChild(p);
        // a rough mound: wider at the bottom, a head on top
        const a = (i / PUFFS) * Math.PI * 2;
        return { p, ox: Math.cos(a) * (0.26 + (i % 2) * 0.07), oy: Math.sin(a) * 0.16 - (i === 0 ? 0.24 : 0), s: 0.34 + ((i * 37) % 10) / 40, phase: i * 1.7, pale: i % 4 !== 3 };
      });
      // its moonlit rim: a few pale puffs along the top edge
      const rim = Array.from({ length: lite ? 3 : 5 }, (_, i) => {
        const p = new PIXI.Sprite(puffTex);
        p.anchor.set(0.5);
        p.tint = 0x8ec5dc;
        p.blendMode = "add";
        bossBody.addChild(p);
        return { p, ox: -0.34 + i * 0.17, phase: i * 2.1 };
      });
      // the valley goes dark around it
      const bossDark = new PIXI.Graphics();
      const eyes = new PIXI.Graphics();
      const eyeGlow = new PIXI.Sprite(glowTex);
      eyeGlow.anchor.set(0.5);
      eyeGlow.tint = 0xe8e4c9;
      eyeGlow.blendMode = "add";
      const burst = new PIXI.Sprite(tex(ringCanvas())); // a hit: moonlight tearing through
      burst.anchor.set(0.5);
      burst.tint = 0x8ec5dc;
      burst.blendMode = "add";
      burst.visible = false;
      const boss = { fade: 0, size: 1, swell: 0, recoil: 0, hit: -1, miss: -1, blink: 3, lastHit: 0, lastMiss: 0 };

      // ---- shrines: the painted stone shrine, with a candle in its niche, one per idea ----
      const shrineLayer = new PIXI.Container();
      const sh = world.shrine;
      const shrines = Array.from({ length: 8 }, () => {
        const c = new PIXI.Container();
        const stoneSprite = new PIXI.Sprite(shrineTex);
        stoneSprite.anchor.set(sh.base[0] / sh.w, sh.base[1] / sh.h);
        const stone = new PIXI.Graphics(); // the candle
        const flame = new PIXI.Graphics();
        const glow = new PIXI.Sprite(glowTex);
        glow.anchor.set(0.5);
        glow.tint = 0xffc464;
        glow.blendMode = "add";
        const warmth = new PIXI.Sprite(shrineTex); // the candle's light on the stones
        warmth.anchor.copyFrom(stoneSprite.anchor);
        warmth.tint = 0xffb45a;
        warmth.blendMode = "add";
        c.addChild(stoneSprite, warmth, stone, glow, flame);
        c.visible = false;
        shrineLayer.addChild(c);
        const spill = new PIXI.Sprite(spillTex);
        spill.anchor.set(0.5);
        spill.visible = false;
        spillGroup.addChild(spill);
        shrineSpills.push(spill);
        return { c, stone, flame, glow, stoneSprite, warmth, drawnFor: -1, heat: 0 };
      });

      // Gloam's lantern glow + a wide warm haze, and the fireflies
      const haze = new PIXI.Sprite(glowTex);
      haze.anchor.set(0.5);
      haze.tint = 0xffb24a;
      haze.blendMode = "add";
      const flies = new PIXI.Container();
      const FLY_COUNT = lite ? 14 : 36;
      const fly = Array.from({ length: FLY_COUNT }, (_, i) => {
        const s = new PIXI.Sprite(glowTex);
        s.anchor.set(0.5);
        s.tint = world.firefly;
        s.blendMode = "add";
        flies.addChild(s);
        return { s, x: Math.random(), y: 0.4 + Math.random() * 0.55, phase: Math.random() * 10, speed: 0.4 + Math.random() * 0.8, order: i / FLY_COUNT };
      });

      const grain = new PIXI.TilingSprite({ texture: grainTex, width: 10, height: 10 });
      grain.alpha = 0.06;
      const vignette = new PIXI.Sprite(vignetteTex);
      // night worlds get the full dark edges; daylight storybook worlds only a soft one
      vignette.alpha = world.vignette ?? 1;
      const bloom = new AdvancedBloomFilter({ threshold: 0.62, bloomScale: 0.8, brightness: 1, blur: 8, quality: 5 });
      if (!lite) litWorld.filters = [bloom];
      litWorld.filterArea = app.screen;

      app.stage.addChild(darkWorld, fogBack, litWorld, bossDark, shrineLayer, actor.container, haze, waveRing, muddle, bossBody, eyeGlow, eyes, burst, fogFront, flies, vignette, grain, mask, muddleFade);

      // ---- layout ----
      const W = world.width;
      const H = world.height;
      let scale = 1;
      let baseY = 0;
      const pathY = (x: number) => {
        const p = world.path;
        if (x <= p[0][0]) return p[0][1];
        for (let i = 1; i < p.length; i++) {
          if (x <= p[i][0]) {
            const t = (x - p[i - 1][0]) / (p[i][0] - p[i - 1][0]);
            return p[i - 1][1] + (p[i][1] - p[i - 1][1]) * t;
          }
        }
        return p[p.length - 1][1];
      };
      const stopX = (i: number, n: number) => (n <= 0 ? world.start : i >= n ? world.end : world.start + ((world.end - world.start) * i) / n);

      // Gloam's place on the path (0..1 across the painting), and the camera
      let gx = stopX(live.current.stop, live.current.levels.length);
      let camX = gx;
      let gAt = live.current.groundAt;
      let walking = false;
      let walkV = 0;

      const fit = () => {
        const vh = app.screen.height;
        const gy = pathY(camX);
        scale = Math.max(vh / H, (gAt * vh) / (gy * H), ((1 - gAt) * vh) / ((1 - gy) * H)) * 1.06;
        baseY = gAt * vh - gy * H * scale;
      };
      const layout = () => {
        const vw = app.screen.width;
        const vh = app.screen.height;
        fit();
        for (const f of [fogBack, fogFront]) f.width = vw;
        fogBack.height = vh * 0.32;
        fogFront.height = vh * 0.24;
        fogBack.tileScale.set(Math.max(1.5, vw / 600));
        fogFront.tileScale.set(Math.max(2, vw / 420));
        muddle.tileScale.set(Math.max(1.6, vw / 520));
        grain.width = vw;
        grain.height = vh;
        vignette.width = vw;
        vignette.height = vh;
        maskRT.destroy(true);
        maskRT = PIXI.RenderTexture.create({ width: Math.max(8, Math.round(vw / 2)), height: Math.max(8, Math.round(vh / 2)) });
        mask.texture = maskRT;
        mask.scale.set(2);
      };
      layout();
      app.renderer.on("resize", layout);

      // the candle in a shrine's niche (redrawn only when its look changes)
      const drawCandle = (s: (typeof shrines)[number], lit: boolean, h: number) => {
        const key = (lit ? 1000 : 0) + Math.round(h);
        if (s.drawnFor === key) return;
        s.drawnFor = key;
        const g = s.stone;
        g.clear();
        const k = h / sh.h;
        const cx = (sh.candle[0] - sh.base[0]) * k;
        const cy = (sh.candle[1] - sh.base[1]) * k;
        const cw = h * 0.07;
        const ch = h * 0.16;
        g.roundRect(cx - cw / 2, cy - ch, cw, ch, cw * 0.3).fill({ color: lit ? 0xf3e5c7 : 0x9c978a });
        g.moveTo(cx - cw * 0.2, cy - ch).quadraticCurveTo(cx - cw * 0.3, cy - ch * 0.6, cx - cw * 0.1, cy - ch * 0.45).stroke({ color: 0xffffff, width: 1.4, alpha: 0.35 });
        g.moveTo(cx, cy - ch).lineTo(cx, cy - ch - h * 0.025).stroke({ color: 0x241a12, width: 1.6 });
      };

      // ---- animation ----
      let t = 0;
      let light = live.current.light;
      let lastEureka = live.current.eurekaTick;
      let lastDoze = live.current.dozeTick ?? 0;
      let lastLevel = live.current.level;
      let lastDressed: string | null = null;
      let push = 0;
      let slowFrames = 0;
      let checked = 0;
      let lastBox = "";

      app.ticker.add((ticker) => {
        const dt = Math.min(ticker.deltaMS / 1000, 0.05);
        const L = live.current;
        const dressed = (L.outfit ?? []).join(",");
        if (dressed !== lastDressed) {
          lastDressed = dressed;
          actor.setOutfit(L.outfit ?? []);
        }
        const still = L.calm;
        t += dt;
        if (!lite && checked < 180) {
          checked++;
          if (ticker.deltaMS > 28) slowFrames++;
          if (checked === 180 && slowFrames > 90) {
            lite = true;
            litWorld.filters = [];
          }
        }

        const vw = app.screen.width;
        const vh = app.screen.height;
        light += (L.light - light) * Math.min(1, dt * 0.9);
        gAt += (L.groundAt - gAt) * (still ? 1 : Math.min(1, dt * 2.2));

        // ---- walking to the next checkpoint ----
        const stops = L.levels.length;
        const lit = L.levels.filter((v) => v === 3).length;
        const target = stopX(L.stop, stops);
        const dist = target - gx;
        const gh = L.gloamHeight;
        const speed = (gh * 2.1) / (W * scale); // in painting fractions per second
        if (Math.abs(dist) > 0.0008 && !still) {
          walkV += (Math.sign(dist) * speed - walkV) * Math.min(1, dt * 3);
          gx += walkV * dt;
          if (Math.sign(target - gx) !== Math.sign(dist)) gx = target;
          if (!walking) {
            walking = true;
            L.onWalking?.(true);
          }
        } else {
          gx = still ? target : gx;
          walkV = 0;
          if (walking) {
            walking = false;
            L.onWalking?.(false);
          }
        }
        camX += (gx - camX) * (still ? 1 : Math.min(1, dt * 2.4));
        fit();

        // a new level: Gloam shows off the trick it just learned (after the moment settles)
        if (L.level > lastLevel) {
          const learned = TRICKS.find((tk) => tk.level === L.level);
          if (learned) setTimeout(() => actor.brain.showTrick(learned.name), 2600);
        }
        lastLevel = L.level;
        if ((L.dozeTick ?? 0) !== lastDoze) {
          lastDoze = L.dozeTick ?? 0;
          actor.brain.setIdle(BORED.sleep - 6); // a few seconds of yawning around, then asleep
        }
        if (L.eurekaTick !== lastEureka) {
          lastEureka = L.eurekaTick;
          push = still ? 0 : 1;
          waveT = still ? -1 : 0;
        }
        push = Math.max(0, push - dt * 0.45);
        const pushCurve = Math.sin(push * Math.PI);
        // ---- the boss fight: fades in, reacts to hits and misses ----
        const B = L.boss;
        boss.fade += ((B?.on ? 1 : 0) - boss.fade) * (still ? 1 : Math.min(1, dt * (B?.on ? 0.8 : 2.2)));
        if (B && B.hitTick !== boss.lastHit) {
          boss.lastHit = B.hitTick;
          if (B.hitTick) {
            boss.hit = still ? -1 : 0;
            boss.recoil = 1;
          }
        }
        if (B && B.missTick !== boss.lastMiss) {
          boss.lastMiss = B.missTick;
          if (B.missTick) {
            boss.miss = still ? -1 : 0;
            boss.swell = 1;
          }
        }
        boss.size += ((0.5 + 0.5 * (B?.left ?? 1)) - boss.size) * Math.min(1, dt * 2);
        boss.swell = Math.max(0, boss.swell - dt * 1.4);
        boss.recoil = Math.max(0, boss.recoil - dt * 1.8);
        if (boss.hit >= 0) boss.hit += dt / 0.9;
        if (boss.hit > 1) boss.hit = -1;
        // a hit shakes the camera a little (never with reduced motion)
        const shake = !still && boss.hit >= 0 ? Math.sin(boss.hit * 60) * 7 * (1 - boss.hit) : 0;
        const zoom = 1 + pushCurve * 0.04;

        // ---- the painting, sliding at depth ----
        // keep the painting covering the screen: near the ends of the journey, Gloam moves off-centre instead
        const paintW = W * scale * zoom;
        const want = L.focus * vw - camX * paintW;
        const left = Math.min(0, Math.max(vw - paintW, want));
        const fx = left + camX * paintW;
        const driftX = (still ? 0 : Math.sin(t * 0.06) * 8) + shake;
        const driftY = still ? 0 : Math.sin(t * 0.045) * 3;
        for (const p of layers) {
          const k = 0.55 + p.depth * 0.45; // far layers travel slower: parallax
          for (const s of [p.dark, p.lit]) {
            s.scale.set(scale * zoom);
            // lined up exactly as painted at the start; far layers fall behind as Gloam travels
            s.x = fx - (world.start + (camX - world.start) * k) * W * scale * zoom + driftX * k;
            s.y = baseY + driftY * k - H * scale * (zoom - 1) * 0.7;
          }
        }
        // a world point on the path's layer -> screen
        const toScreen = (x: number, y: number) => ({ x: fx + (x - camX) * W * scale * zoom + driftX, y: baseY + y * H * scale - H * scale * (zoom - 1) * 0.7 + driftY });

        // ---- Gloam ----
        const feet = toScreen(gx, pathY(gx));
        actor.container.position.set(feet.x, feet.y);
        actor.container.scale.set(zoom);
        actor.setHeight(gh);
        const lan = lanternFor(L.level);
        const out = actor.update(dt, {
          mood: L.mood,
          typingTick: L.typingTick,
          eurekaTick: L.eurekaTick,
          talking: L.talking,
          light: L.light,
          walk: walking ? Math.sign(walkV) : 0,
          lookAt: null,
          waiting: L.waiting && !walking,
          calm: still,
          level: L.level,
          at: { x: feet.x, y: feet.y },
          lanternScale: lan.scale,
          lanternGlow: lan.glow,
        });
        const lanternScreen = { x: feet.x + out.lantern.x * zoom, y: feet.y + out.lantern.y * zoom };
        const box = { cx: feet.x, top: feet.y - gh, w: gh * 0.88, h: gh, stageW: vw, stageH: vh };
        const key = `${Math.round(box.cx / 3)},${Math.round(box.top / 3)},${Math.round(box.h)}`;
        if (key !== lastBox) {
          lastBox = key;
          L.onGloamBox?.(box);
        }

        // ---- shrines ----
        for (let i = 0; i < shrines.length; i++) {
          const s = shrines[i];
          const on = i < stops;
          s.c.visible = on;
          shrineSpills[i].visible = false;
          if (!on) continue;
          const sx = stopX(i, stops);
          const p = toScreen(sx, pathY(sx));
          // the shrine stands just behind and to the right of where Gloam waits
          s.c.position.set(p.x + gh * 0.72, p.y - gh * 0.02);
          const state = L.levels[i] ?? 0;
          s.heat += ([0, 0.18, 0.42, 1][state] - s.heat) * Math.min(1, dt * 1.5);
          const shH = gh * sh.scale;
          s.stoneSprite.scale.set(shH / sh.h);
          s.warmth.scale.set(shH / sh.h);
          // moonlit grey stone; warmed by its candle once lit
          s.stoneSprite.tint = 0x8b9b95;
          s.warmth.alpha = s.heat * 0.35;
          drawCandle(s, state === 3, shH);
          const k = shH / sh.h;
          const cx = (sh.candle[0] - sh.base[0]) * k;
          const fy = (sh.candle[1] - sh.base[1]) * k - shH * 0.16 - shH * 0.025;
          const f = s.flame;
          f.clear();
          const flick = still ? 1 : 1 + Math.sin(t * 9 + i) * 0.06 + Math.sin(t * 23 + i * 2) * 0.04;
          if (s.heat > 0.02) {
            const fh = shH * 0.13 * Math.max(0.25, s.heat) * flick;
            f.moveTo(cx, fy - fh)
              .bezierCurveTo(cx + fh * 0.45, fy - fh * 0.45, cx + fh * 0.42, fy, cx, fy + fh * 0.1)
              .bezierCurveTo(cx - fh * 0.42, fy, cx - fh * 0.45, fy - fh * 0.45, cx, fy - fh)
              .fill({ color: s.heat > 0.6 ? 0xf4b740 : 0xc8682a, alpha: Math.min(1, 0.4 + s.heat) });
            if (s.heat > 0.6) f.ellipse(cx, fy - fh * 0.25, fh * 0.16, fh * 0.32).fill({ color: 0xfff4d6, alpha: 0.85 });
          }
          s.glow.position.set(cx, fy - shH * 0.03);
          s.glow.width = s.glow.height = shH * (0.5 + s.heat * 2.6) * flick;
          s.glow.alpha = s.heat * 0.85;
          // a lit shrine keeps its own pool of light on the valley
          const sp = shrineSpills[i];
          if (s.heat > 0.05) {
            sp.visible = true;
            sp.position.set((s.c.x + cx) / 2, (s.c.y + fy) / 2);
            sp.width = sp.height = (Math.max(vw, vh) * 0.42 * s.heat) / 2;
          }
        }

        // ---- the light: Gloam's lantern spill + shrine pools, drawn into the mask ----
        // the Muddle swallows the light; a combo makes the lantern blaze back
        const dim = 1 - boss.fade * 0.6 + boss.fade * Math.min(4, B?.combo ?? 0) * 0.08;
        const radius = light <= 0.001 ? 0 : (0.12 + light * 0.9) * Math.max(vw, vh) * (1 + pushCurve * 0.15) * Math.min(1.4, lan.glow) * dim;
        lanternSpill.position.set(lanternScreen.x / 2, (lanternScreen.y + (feet.y - lanternScreen.y) * 0.4) / 2);
        lanternSpill.width = lanternSpill.height = radius;
        mask.position.set(0, 0);
        // fade the light in through the mask, not the layers: overlapping depth layers would double up
        lanternSpill.alpha = Math.min(1, 0.25 + light * 4);
        // the wave: starts a moment into the eureka (after Gloam's jump), rolls out over ~2 seconds
        if (waveT >= 0) waveT += dt / 2.2;
        const wv = waveT - 0.12;
        const waving = wv > 0 && wv < 1;
        waveRing.visible = waveReveal.visible = waving;
        if (waving) {
          const reach = Math.hypot(vw, vh) * 1.25;
          const ease = 1 - Math.pow(1 - wv, 3);
          const r = 40 + ease * reach;
          waveRing.position.set(lanternScreen.x, lanternScreen.y);
          waveRing.width = waveRing.height = r * 2;
          waveRing.alpha = Math.sin(wv * Math.PI) * 0.6;
          waveReveal.position.set(lanternScreen.x / 2, lanternScreen.y / 2);
          waveReveal.width = waveReveal.height = r;
          waveReveal.alpha = Math.pow(1 - wv, 1.4);
        } else if (waveT > 1.2) waveT = -1;
        app.renderer.render({ container: spillGroup, target: maskRT, clear: true });
        haze.position.set(lanternScreen.x, feet.y - gh * 0.3);
        haze.width = vw * (0.4 + light * 1.2);
        haze.height = vh * (0.35 + light * 0.8);
        haze.alpha = light * 0.22 + pushCurve * 0.25;
        bloom.brightness = 1 + pushCurve * 0.6;

        // ---- fog, and the Muddle on the path ahead ----
        const groundY = feet.y;
        if (!still) {
          fogBack.tilePosition.x -= dt * 9;
          fogFront.tilePosition.x -= dt * 16;
          muddle.tilePosition.x -= dt * 5;
        }
        fogBack.y = groundY - vh * 0.36;
        fogFront.y = groundY - vh * 0.08;
        fogBack.alpha = 0.22;
        fogFront.alpha = 0.14 + light * 0.05;
        const ahead = feet.x + gh * 1.3;
        muddle.x = ahead;
        muddle.width = Math.max(0, vw - ahead + 40);
        muddle.y = groundY - gh * 1.5;
        muddle.height = gh * 1.7;
        const unlit = stops ? 1 - lit / stops : 0;
        muddle.alpha = (0.18 + 0.4 * unlit) * (1 - light * 0.6);
        muddleFade.position.set(muddle.x, muddle.y);
        muddleFade.width = Math.max(1, muddle.width);
        muddleFade.height = muddle.height;

        // ---- the Muddle, gathered for the boss fight ----
        const showBoss = boss.fade > 0.01;
        for (const o of [bossBody, bossDark, eyes, eyeGlow]) o.visible = showBoss;
        if (showBoss) {
          // it stands on the ground across from Gloam, below Gloam's speech panel, and fills the right of the screen
          const bs = gh * 1.9 * boss.size * (1 + boss.swell * 0.16 - boss.recoil * 0.12);
          const bx = Math.min(vw - bs * 0.32, Math.max(feet.x + gh * 1.2 + bs * 0.45, vw * 0.84)) + boss.recoil * gh * 0.35;
          const by = groundY - bs * 0.16;
          bossDark.clear().rect(0, 0, vw, vh).fill({ color: 0x030806, alpha: boss.fade * 0.42 });
          for (const q of puffs) {
            const breathe = still ? 1 : 1 + Math.sin(t * 0.9 + q.phase) * 0.06;
            const sway = still ? 0 : Math.sin(t * 0.5 + q.phase) * bs * 0.025;
            q.p.position.set(bx + q.ox * bs + sway, by + q.oy * bs);
            q.p.width = q.p.height = bs * q.s * breathe;
            q.p.alpha = boss.fade * (q.pale ? 0.84 : 0.5);
          }
          for (const q of rim) {
            const sway = still ? 0 : Math.sin(t * 0.6 + q.phase) * bs * 0.02;
            q.p.position.set(bx + q.ox * bs + sway, by - bs * (0.33 - Math.abs(q.ox) * 0.4));
            q.p.width = q.p.height = bs * 0.34;
            q.p.alpha = boss.fade * 0.26;
          }
          // two pale eyes with slit pupils, looking at Gloam: they blink, narrow on a miss, squeeze shut on a hit
          if (!still) boss.blink -= dt;
          const blinking = boss.blink < 0.14 && boss.blink > 0;
          if (boss.blink <= 0) boss.blink = 2.5 + Math.random() * 3;
          const open = boss.hit >= 0 ? 0.12 : blinking ? 0.08 : boss.swell > 0 ? 0.5 : 1;
          const ew = bs * 0.05;
          const eh = ew * 0.72 * open;
          const ey = by - bs * 0.2;
          const look = Math.sign(feet.x - bx) * ew * 0.35;
          eyes.clear();
          for (const side of [-1, 1]) {
            const ex = bx + side * bs * 0.1;
            // a dark hollow in the fog, a pale glowing eye in it, a slit pupil
            eyes.ellipse(ex, ey, ew * 1.7, ew * 1.25).fill({ color: 0x0b0f0d, alpha: boss.fade * 0.75 });
            eyes.ellipse(ex, ey, ew, Math.max(0.8, eh)).fill({ color: 0xe8e4c9, alpha: boss.fade });
            if (open > 0.3) eyes.ellipse(ex + look, ey, ew * 0.18, Math.max(0.8, eh * 0.85)).fill({ color: 0x0b0f0d, alpha: boss.fade });
          }
          eyeGlow.position.set(bx, ey);
          eyeGlow.width = bs * 0.6;
          eyeGlow.height = bs * 0.22;
          eyeGlow.alpha = boss.fade * 0.45 * open;
          // a hit: a ring of moonlight bursts out of it
          burst.visible = boss.hit >= 0;
          if (burst.visible) {
            const e = 1 - Math.pow(1 - boss.hit, 3);
            burst.position.set(bx, by);
            burst.width = burst.height = bs * (0.4 + e * 2.4);
            burst.alpha = Math.sin(boss.hit * Math.PI) * 0.9;
          }
        } else burst.visible = false;

        // ---- fireflies wake up as the valley does ----
        for (const p of fly) {
          const on = light > 0.12 && p.order < light * 1.1;
          const wx = still ? 0 : Math.sin(t * 0.35 * p.speed + p.phase) * 0.03;
          const wy = still ? 0 : Math.cos(t * 0.27 * p.speed + p.phase * 1.7) * 0.025;
          p.s.position.set((p.x + wx) * vw, (p.y + wy) * vh);
          const blink = still ? 0.7 : 0.35 + 0.65 * Math.max(0, Math.sin(t * 1.3 * p.speed + p.phase));
          p.s.alpha += ((on ? blink : 0) - p.s.alpha) * Math.min(1, dt * 2);
          p.s.width = p.s.height = 20 + p.speed * 10;
        }
        if (!still) grain.tilePosition.set(Math.random() * 200, Math.random() * 200);
      });

      el.dataset.ready = "1";
      cleanup = () => app.destroy(true, { children: true });
    })();

    return () => {
      destroyed = true;
      cleanup();
    };
  }, [world, rig]);

  return <div ref={host} className="absolute inset-0" aria-hidden="true" />;
}

type PixiSprite = import("pixi.js").Sprite;
export type { GloamActor };
