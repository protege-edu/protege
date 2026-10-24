"use client";

import { useEffect, useRef } from "react";
import type { CinematicScene } from "@/lib/age-styles/types";
import { useCalmMotion } from "@/lib/useCalmMotion";
import { fogCanvas, glowCanvas, grainCanvas, lightSpillCanvas, vignetteCanvas } from "./textures";

export interface SceneLayout {
  /** Where the ground is on screen (px from the top), so Gloam can stand on it */
  groundY: number;
  width: number;
  height: number;
}

interface Props {
  scene: CinematicScene;
  /** 0..1: how much Gloam understands. The painted lantern light spreads with it. */
  brightness: number;
  /** 0..1 across the screen: where Gloam stands (the light comes from there) */
  focus: number;
  /** Changes on every "I get it" moment: the camera pushes in and the light swells */
  eurekaTick: number;
  /** Where Gloam's lantern is on screen (px from the top), so its glow lines up */
  lanternY: number;
  /** Where the ground should sit on screen (0 = top, 1 = bottom). The camera glides there. */
  groundAt: number;
  onLayout?: (layout: SceneLayout) => void;
}

/**
 * The painted world, rendered on the GPU with PixiJS.
 *
 * Every layer of the valley exists twice, painted DARK and painted LIT. Gloam's lantern light is a soft,
 * uneven "light spill" that reveals the lit painting around it, growing as Gloam understands more:
 * the light-is-the-meter idea, as real painted light. On top: drifting fog, fireflies, the lantern glow,
 * bloom on the brightest parts, a slow camera drift with parallax, film grain and a vignette.
 *
 * Cheap devices and reduced-motion users get a calmer, lighter version automatically.
 */
export function CinematicValley({ scene, brightness, focus, eurekaTick, lanternY, groundAt, onLayout }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const calm = useCalmMotion();
  // Values the render loop reads every frame (no React re-render needed)
  const live = useRef({ brightness, focus, eurekaTick, calm, onLayout, lanternY, groundAt });
  useEffect(() => {
    live.current = { brightness, focus, eurekaTick, calm, onLayout, lanternY, groundAt };
  });

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let destroyed = false;
    let cleanup = () => {};

    (async () => {
      const PIXI = await import("pixi.js");
      const { AdvancedBloomFilter } = await import("pixi-filters");
      if (destroyed) return;

      // Lite mode for cheap Chromebooks: fewer effects, lower resolution, same paintings
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
      if (destroyed) {
        app.destroy(true);
        return;
      }
      el.appendChild(app.canvas);
      app.canvas.style.position = "absolute";
      app.canvas.style.inset = "0";

      const textures = await Promise.all(scene.layers.flatMap((l) => [PIXI.Assets.load(l.dark), PIXI.Assets.load(l.lit)]));
      if (destroyed) {
        app.destroy(true);
        return;
      }

      const tex = (c: HTMLCanvasElement) => PIXI.Texture.from(c);
      const glowTex = tex(glowCanvas());
      const spillTex = tex(lightSpillCanvas());
      const fogTex = tex(fogCanvas());
      const grainTex = tex(grainCanvas());
      const vignetteTex = tex(vignetteCanvas());

      // ---- the world: dark paintings, then lit paintings revealed by the light spill ----
      const darkWorld = new PIXI.Container();
      const litWorld = new PIXI.Container();
      const layerPairs = scene.layers.map((l, i) => {
        const dark = new PIXI.Sprite(textures[i * 2]);
        const lit = new PIXI.Sprite(textures[i * 2 + 1]);
        darkWorld.addChild(dark);
        litWorld.addChild(lit);
        return { depth: l.depth, dark, lit };
      });
      const spill = new PIXI.Sprite(spillTex);
      spill.anchor.set(0.5);
      litWorld.mask = spill;

      // fog drifts between the hills
      const fogBack = new PIXI.TilingSprite({ texture: fogTex, width: 10, height: 10 });
      const fogFront = new PIXI.TilingSprite({ texture: fogTex, width: 10, height: 10 });
      fogBack.tint = scene.fog;
      fogFront.tint = scene.fog;

      // the lantern's own glow and a wide warm haze
      const haze = new PIXI.Sprite(glowTex);
      haze.anchor.set(0.5);
      haze.tint = 0xffb24a;
      haze.blendMode = "add";
      const glow = new PIXI.Sprite(glowTex);
      glow.anchor.set(0.5);
      glow.tint = 0xffd38a;
      glow.blendMode = "add";

      // fireflies
      const flies = new PIXI.Container();
      const FLY_COUNT = lite ? 14 : 36;
      const fly = Array.from({ length: FLY_COUNT }, (_, i) => {
        const s = new PIXI.Sprite(glowTex);
        s.anchor.set(0.5);
        s.tint = scene.firefly;
        s.blendMode = "add";
        flies.addChild(s);
        return { s, x: Math.random(), y: 0.45 + Math.random() * 0.5, phase: Math.random() * 10, speed: 0.4 + Math.random() * 0.8, order: i / FLY_COUNT };
      });

      const grain = new PIXI.TilingSprite({ texture: grainTex, width: 10, height: 10 });
      grain.alpha = 0.07;
      const vignette = new PIXI.Sprite(vignetteTex);

      const bloom = new AdvancedBloomFilter({ threshold: 0.62, bloomScale: 0.8, brightness: 1, blur: 8, quality: 5 });
      const glowGroup = new PIXI.Container();
      glowGroup.addChild(haze, glow, flies);
      if (!lite) litWorld.filters = [bloom];
      // Run the bloom over the whole screen, not the masked shape's box (or you see a hard edge)
      litWorld.filterArea = app.screen;

      // depth ordering: far layers, fog, near layers. Lit copies sit on top of their dark copies.
      app.stage.addChild(darkWorld, fogBack, litWorld, fogFront, spill, glowGroup, vignette, grain);

      // ---- layout ----
      const W = scene.width;
      const H = scene.height;
      let scale = 1;
      let baseX = 0;
      let baseY = 0;
      let gAt = live.current.groundAt;
      const gy = scene.ground.y;
      // Fit the painting so it covers the screen AND its ground line sits at gAt (0..1 down the screen)
      const fit = () => {
        const vw = app.screen.width;
        const vh = app.screen.height;
        scale = Math.max(vw / W, vh / H, (gAt * vh) / (gy * H), ((1 - gAt) * vh) / ((1 - gy) * H)) * 1.06;
        baseX = (vw - W * scale) / 2;
        baseY = gAt * vh - gy * H * scale;
      };
      const layout = () => {
        const vw = app.screen.width;
        const vh = app.screen.height;
        fit();
        fogBack.width = fogFront.width = vw;
        fogBack.height = vh * 0.32;
        fogFront.height = vh * 0.26;
        fogBack.tileScale.set(Math.max(1.5, vw / 600));
        fogFront.tileScale.set(Math.max(2, vw / 420));
        grain.width = vw;
        grain.height = vh;
        vignette.width = vw;
        vignette.height = vh;
        live.current.onLayout?.({ groundY: gAt * vh, width: vw, height: vh });
      };
      layout();
      app.renderer.on("resize", layout);

      // ---- animation ----
      let t = 0;
      let light = live.current.brightness;
      let lastEureka = live.current.eurekaTick;
      let push = 0; // 0..1 eureka camera push
      let pointerX = 0;
      let pointerY = 0;
      const onPointer = (e: PointerEvent) => {
        pointerX = (e.clientX / window.innerWidth) * 2 - 1;
        pointerY = (e.clientY / window.innerHeight) * 2 - 1;
      };
      window.addEventListener("pointermove", onPointer);

      // If it's struggling (slow frames for a couple of seconds), switch to lite mode
      let slowFrames = 0;
      let checked = 0;

      app.ticker.add((ticker) => {
        const dt = Math.min(ticker.deltaMS / 1000, 0.05);
        const { brightness: target, focus: f, eurekaTick, calm: still, lanternY: lanternAt } = live.current;
        t += dt;

        if (!lite && checked < 180) {
          checked++;
          if (ticker.deltaMS > 28) slowFrames++;
          if (checked === 180 && slowFrames > 90) {
            lite = true;
            litWorld.filters = [];
          }
        }

        // light spreads smoothly, never jumps; the camera glides to the new ground line
        light += (target - light) * Math.min(1, dt * 0.9);
        const wantG = live.current.groundAt;
        gAt += (wantG - gAt) * (still ? 1 : Math.min(1, dt * 2.2));
        fit();
        if (eurekaTick !== lastEureka) {
          lastEureka = eurekaTick;
          push = still ? 0 : 1;
        }
        push = Math.max(0, push - dt * 0.45);
        const pushCurve = Math.sin(push * Math.PI);

        const vw = app.screen.width;
        const vh = app.screen.height;
        const groundY = baseY + scene.ground.y * H * scale;
        const lx = vw * f;
        const lanternScreenY = lanternAt || groundY - vh * 0.42;
        // the light pools on the ground around Gloam, between its lantern and its feet
        const ly = groundY - (groundY - lanternScreenY) * 0.35;

        // camera: slow drift + a little pointer parallax + the eureka push-in
        const driftX = still ? 0 : Math.sin(t * 0.06) * 10 + pointerX * 12;
        const driftY = still ? 0 : Math.sin(t * 0.045) * 4 + pointerY * 6;
        const zoom = 1 + pushCurve * 0.045;
        for (const p of layerPairs) {
          const k = 0.15 + p.depth * 0.85;
          for (const s of [p.dark, p.lit]) {
            s.scale.set(scale * (1 + (zoom - 1) * k));
            s.x = baseX + driftX * k - (W * scale * (zoom - 1) * k) * f;
            s.y = baseY + driftY * k - (H * scale * (zoom - 1) * k) * 0.7;
          }
        }

        // the light spill: nothing at all until Gloam understands something
        const radius = light <= 0.001 ? 0 : (0.14 + light * 1.25) * Math.max(vw, vh) * (1 + pushCurve * 0.15);
        spill.position.set(lx, ly);
        spill.width = radius * 2;
        spill.height = radius * 2;
        litWorld.alpha = Math.min(1, light * 4);

        // lantern glow + haze (a faint ember even at zero)
        const flicker = still ? 1 : 0.94 + Math.sin(t * 9.1) * 0.03 + Math.sin(t * 23.7) * 0.02;
        glow.position.set(lx, lanternScreenY);
        glow.width = glow.height = (60 + light * 220) * flicker * (1 + pushCurve * 0.6);
        glow.alpha = (0.15 + light * 0.75) * flicker;
        haze.position.set(lx, ly);
        haze.width = vw * (0.5 + light * 1.4);
        haze.height = vh * (0.4 + light * 0.9);
        haze.alpha = light * 0.28 + pushCurve * 0.25;
        bloom.brightness = 1 + pushCurve * 0.6;

        // fog drifts (two layers at different speeds = depth)
        if (!still) {
          fogBack.tilePosition.x -= dt * 9;
          fogFront.tilePosition.x -= dt * 16;
        }
        fogBack.y = groundY - vh * 0.36;
        fogFront.y = groundY - vh * 0.1;
        fogBack.alpha = 0.22;
        fogFront.alpha = 0.16 + light * 0.05;

        // fireflies come out as the valley wakes up
        for (const p of fly) {
          const on = light > 0.15 && p.order < light * 1.1;
          const wobbleX = still ? 0 : Math.sin(t * 0.35 * p.speed + p.phase) * 0.03;
          const wobbleY = still ? 0 : Math.cos(t * 0.27 * p.speed + p.phase * 1.7) * 0.025;
          p.s.position.set((p.x + wobbleX) * vw, (p.y + wobbleY) * vh);
          const blink = still ? 0.7 : 0.35 + 0.65 * Math.max(0, Math.sin(t * 1.3 * p.speed + p.phase));
          p.s.alpha += ((on ? blink : 0) - p.s.alpha) * Math.min(1, dt * 2);
          p.s.width = p.s.height = 22 + p.speed * 10;
        }

        // film grain shimmers
        if (!still) grain.tilePosition.set(Math.random() * 200, Math.random() * 200);
      });

      cleanup = () => {
        window.removeEventListener("pointermove", onPointer);
        app.destroy(true, { children: true });
      };
    })();

    return () => {
      destroyed = true;
      cleanup();
    };
  }, [scene]);

  return <div ref={host} className="absolute inset-0" aria-hidden="true" />;
}
