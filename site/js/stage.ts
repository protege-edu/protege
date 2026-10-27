/**
 * The homepage's stage: the night valley from the app, fixed behind the story, with the real Gloam (the same
 * animated rig students teach) standing in it. The story (site/js/home.ts) tells it what to do.
 *
 *   - the valley's layers drift at their own depths as the story moves (you travel through it)
 *   - when Gloam gets something, the lit painting spreads out from its lantern across the valley: light is
 *     understanding here too, so the warm valley only ever appears because Gloam understood
 *   - Gloam watches the pointer, blinks, breathes, nods along to typing, and can be poked
 */
import type { GloamMood } from "@/components/gloam/poses";
import { seniorGloam } from "@/lib/age-styles/rigs/senior-gloam";

export interface StageState {
  /** where Gloam stands across the screen (0..1), how tall (share of the screen's height), where its feet are */
  focus: number;
  height: number;
  ground: number;
  mood: GloamMood;
  /** 0..1: Gloam's lantern (understanding) */
  light: number;
  talking: boolean;
  /** the stage is covered: stop drawing */
  hidden: boolean;
}

export const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Where Gloam is on screen (px): for the speech bubble, the poke button and the light */
export interface GloamBox {
  x: number;
  top: number;
  feet: number;
  h: number;
  lantern: { x: number; y: number };
}

export function createStage(root: HTMLElement) {
  const state: StageState = { focus: 0.72, height: 0.5, ground: 0.84, mood: "confused", light: 0, talking: false, hidden: false };
  let eurekaTick = 0;
  let typingTick = 0;
  const listeners: ((b: GloamBox) => void)[] = [];
  const canvasHost = root.querySelector<HTMLElement>(".gloam-canvas")!;
  const still = root.querySelector<HTMLImageElement>(".gloam-still");
  const lit = root.querySelector<HTMLElement>(".lit-layers")!;
  const ring = root.querySelector<HTMLElement>(".light-ring")!;
  const layers = [...root.querySelectorAll<HTMLElement>(".layer")];
  let lantern = { x: 0, y: 0 };

  const guess = (): GloamBox => {
    const h = innerHeight * state.height;
    const x = innerWidth * state.focus;
    const feet = innerHeight * state.ground;
    return { x, top: feet - h, feet, h, lantern: { x: x - h * 0.2, y: feet - h * 1.05 } };
  };
  let last: GloamBox = guess();
  const emit = (b: GloamBox) => {
    last = b;
    for (const f of listeners) f(b);
  };

  const pointer = { x: 0, y: 0, at: -1e9 };
  addEventListener(
    "pointermove",
    (e) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.at = performance.now();
    },
    { passive: true },
  );

  // ---- the light spreading from the lantern (a circle of the lit painting, centred on the lantern) ----
  // (and a wave of gold at its edge when Gloam gets something, fading as it rolls out across the valley)
  const light = { r: 0, wave: 0 };
  function paintLight() {
    for (const el of [lit, ring]) {
      el.style.setProperty("--lx", `${Math.round(lantern.x)}px`);
      el.style.setProperty("--ly", `${Math.round(lantern.y)}px`);
      el.style.setProperty("--r", `${light.r.toFixed(1)}vmax`);
    }
    lit.style.visibility = light.r > 0.2 ? "visible" : "hidden";
    ring.style.opacity = light.wave.toFixed(3);
  }
  let lightAnim = 0;
  function lightTo(target: number, seconds: number, wave = false) {
    cancelAnimationFrame(lightAnim);
    if (calm || seconds === 0) {
      light.r = target;
      light.wave = 0;
      return paintLight();
    }
    const from = light.r;
    const t0 = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / (seconds * 1000));
      // out fast, then easing as it reaches the edges of the valley
      const e = 1 - Math.pow(1 - t, 3);
      light.r = from + (target - from) * e;
      light.wave = wave ? Math.sin(Math.min(1, t * 1.15) * Math.PI) * (1 - t * 0.6) : 0;
      paintLight();
      if (t < 1) lightAnim = requestAnimationFrame(step);
    };
    lightAnim = requestAnimationFrame(step);
  }

  // ---- the painted still (before Gloam loads, or without WebGL) ----
  function placeStill() {
    if (!still) return;
    const b = guess();
    // (the picture has room around Gloam: it's 1.55 Gloams tall, with the feet 1.45 down)
    still.style.height = `${b.h * 1.55}px`;
    still.style.left = `${b.x}px`;
    still.style.top = `${b.feet - b.h * 1.45}px`;
  }

  async function start() {
    try {
      const PIXI = await import("pixi.js");
      // the site's security policy forbids eval; this lets Pixi build its shaders without it
      await import("pixi.js/unsafe-eval");
      // and no workers made from blobs (also blocked): load pictures on the main thread
      PIXI.Assets.setPreferences({ preferWorkers: false });
      const { loadActor } = await import("@/components/gloam/rig/load");
      const nav = navigator as Navigator & { deviceMemory?: number };
      const lite = (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4;
      const app = new PIXI.Application();
      // the whole screen: Gloam's light reaches far past its body when it gets something
      await app.init({ resizeTo: canvasHost, backgroundAlpha: 0, antialias: !lite, resolution: Math.min(devicePixelRatio || 1, lite ? 1 : 1.5), autoDensity: true, preference: "webgl" });
      canvasHost.appendChild(app.canvas);
      const actor = await loadActor(PIXI, seniorGloam);
      app.stage.addChild(actor.container);
      still?.classList.add("is-gone");
      // Gloam slides between places smoothly (the story only says where it should be)
      const at = { focus: state.focus, height: state.height, ground: state.ground };
      app.ticker.add((tk) => {
        if (state.hidden) return;
        const dt = Math.min(0.05, tk.deltaMS / 1000);
        const k = calm ? 1 : 1 - Math.exp(-dt * 3);
        at.focus += (state.focus - at.focus) * k;
        at.height += (state.height - at.height) * k;
        at.ground += (state.ground - at.ground) * k;
        const W = app.screen.width;
        const H = app.screen.height;
        const x = W * at.focus;
        const feet = H * at.ground;
        const h = H * at.height;
        actor.container.position.set(x, feet);
        actor.setHeight(h);
        const awake = state.mood !== "asleep";
        const recent = performance.now() - pointer.at < 4000;
        const lookAt = awake && recent && !calm ? { x: clamp((pointer.x - x) / (W * 0.35)), y: clamp((pointer.y - (feet - h * 0.6)) / (H * 0.4)) } : null;
        // (a smaller glow than in the game: on a big screen the full one washes Gloam's face out)
        const out = actor.update(dt, { mood: state.mood, typingTick, eurekaTick, talking: state.talking, light: state.light, walk: 0, lookAt, waiting: false, calm, lanternGlow: 0.6 });
        // (the rig says where its lantern is relative to its feet: this puts it on the screen)
        lantern = { x: x + out.lantern.x, y: feet + out.lantern.y };
        if (light.r > 0.2) paintLight();
        emit({ x, top: feet - h * 1.02, feet, h, lantern });
      });
      document.addEventListener("visibilitychange", () => (document.hidden ? app.ticker.stop() : app.ticker.start()));
      root.dataset.ready = "1";
    } catch {
      // no WebGL: the painted still stays
      root.dataset.ready = "still";
    }
  }

  addEventListener("resize", () => {
    placeStill();
    if (root.dataset.ready !== "1") emit(guess());
  });
  placeStill();
  lantern = guess().lantern;
  paintLight();
  // the words and pictures first; Gloam right after
  if ("requestIdleCallback" in window) requestIdleCallback(() => void start(), { timeout: 1200 });
  else setTimeout(() => void start(), 300);

  return {
    state,
    set(next: Partial<StageState>) {
      Object.assign(state, next);
      root.classList.toggle("is-hidden", state.hidden);
      // (the speech bubble and the poke button hide with the stage)
      document.documentElement.classList.toggle("stage-off", state.hidden);
      placeStill();
      if (root.dataset.ready !== "1") emit(guess());
    },
    /** it gets it: the hop, the lantern, and its light spreading across the valley */
    ignite() {
      eurekaTick++;
      state.light = 1;
      lightTo(160, 2.6, true);
    },
    /** back to before it understood (scrolling back up the story) */
    douse() {
      state.light = 0;
      lightTo(0, 0.6);
    },
    /** the valley stays a little lit by what Gloam already knows */
    glow(r: number, seconds = 1.2) {
      lightTo(r, seconds);
    },
    /** travel through the valley: each layer drifts by its depth (0..1 along the story) */
    drift(p: number) {
      if (calm) return;
      for (const l of layers) {
        const d = Number(l.dataset.depth ?? 0);
        l.style.transform = `translate3d(${(-p * (d + 0.4) * 2.2).toFixed(2)}%, 0, 0) scale(1.08)`;
      }
    },
    /** a keystroke in the story's teach box: Gloam nods along */
    typed() {
      typingTick++;
    },
    onBox(f: (b: GloamBox) => void) {
      listeners.push(f);
      f(last);
    },
  };
}

export type Stage = ReturnType<typeof createStage>;

const clamp = (v: number) => Math.max(-1, Math.min(1, v));
