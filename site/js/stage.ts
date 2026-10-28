/**
 * The homepage's stage: the night valley from the app, fixed behind the story, with the real Gloam (the same
 * animated rig students teach) standing in it. The story (site/js/home.ts) tells it what to do.
 *
 *   - the valley's layers drift at their own depths as the story moves (you travel through it), and the camera
 *     pushes in on Gloam when it finally gets something
 *   - when Gloam gets something, the lit painting spreads out from its lantern across the valley in a wave of
 *     gold, and fireflies burst out of the lantern: light is understanding here too
 *   - Gloam watches the pointer, blinks, breathes, nods along to typing, can be poked, and can swing its lantern
 */
import type { GloamMood } from "@/components/gloam/poses";
import type { GloamActor } from "@/components/gloam/rig/GloamActor";
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

type Pixi = typeof import("pixi.js");
let pixi: Promise<{ PIXI: Pixi; loadActor: (P: Pixi, spec: typeof seniorGloam) => Promise<GloamActor> }> | null = null;
/** Pixi and the rig, loaded once for every Gloam on the page */
function loadPixi() {
  pixi ??= (async () => {
    const PIXI = await import("pixi.js");
    // the site's security policy forbids eval; this lets Pixi build its shaders without it
    await import("pixi.js/unsafe-eval");
    // and no workers made from blobs (also blocked): load pictures on the main thread
    PIXI.Assets.setPreferences({ preferWorkers: false });
    const { loadActor } = await import("@/components/gloam/rig/load");
    return { PIXI, loadActor };
  })();
  return pixi;
}
const lite = () => {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4;
};

export function createStage(root: HTMLElement) {
  const state: StageState = { focus: 0.74, height: 0.5, ground: 0.84, mood: "confused", light: 0, talking: false, hidden: false };
  let eurekaTick = 0;
  let typingTick = 0;
  const listeners: ((b: GloamBox) => void)[] = [];
  const canvasHost = root.querySelector<HTMLElement>(".gloam-canvas")!;
  const still = root.querySelector<HTMLImageElement>(".gloam-still");
  const lit = root.querySelector<HTMLElement>(".lit-layers")!;
  const ring = root.querySelector<HTMLElement>(".light-ring")!;
  const camera = root.querySelector<HTMLElement>(".camera")!;
  const sparks = root.querySelector<HTMLElement>(".sparks")!;
  const dawnEl = root.querySelector<HTMLElement>(".dawn")!;
  const layers = [...root.querySelectorAll<HTMLElement>(".layer")];
  let lantern = { x: 0, y: 0 };
  // where the lantern is from Gloam's feet, as a share of its height (learned from the rig, for placing it)
  let lanternFromFeet = { x: -0.24, y: -1.0 };
  // a quick sideways shove (it swings the lantern on its springy stalk): px, decaying back to 0
  let shove = 0;
  // the next frame puts Gloam straight where it should be (no gliding across the page)
  let snap = false;

  const guess = (): GloamBox => {
    const h = innerHeight * state.height;
    const x = innerWidth * state.focus;
    const feet = innerHeight * state.ground;
    return { x, top: feet - h * 1.02, feet, h, lantern: { x: x + lanternFromFeet.x * h, y: feet + lanternFromFeet.y * h } };
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
      const e = 1 - Math.pow(1 - t, 3);
      light.r = from + (target - from) * e;
      light.wave = wave ? Math.sin(Math.min(1, t * 1.15) * Math.PI) * (1 - t * 0.6) : 0;
      paintLight();
      if (t < 1) lightAnim = requestAnimationFrame(step);
    };
    lightAnim = requestAnimationFrame(step);
  }

  /** fireflies bursting out of the lantern */
  function burst(n = 26) {
    if (calm) return;
    for (let i = 0; i < n; i++) {
      const s = document.createElement("span");
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.4;
      const d = 90 + Math.random() * 220;
      s.style.left = `${lantern.x}px`;
      s.style.top = `${lantern.y}px`;
      s.style.setProperty("--dx", `${Math.cos(a) * d}px`);
      s.style.setProperty("--dy", `${Math.sin(a) * d * 0.7 - 30}px`);
      s.style.animationDelay = `${Math.random() * 0.18}s`;
      sparks.append(s);
      setTimeout(() => s.remove(), 2200);
    }
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
      const { PIXI, loadActor } = await loadPixi();
      const app = new PIXI.Application();
      // the whole screen: Gloam's light reaches far past its body when it gets something
      await app.init({ resizeTo: canvasHost, backgroundAlpha: 0, antialias: !lite(), resolution: Math.min(devicePixelRatio || 1, lite() ? 1 : 1.5), autoDensity: true, preference: "webgl" });
      canvasHost.appendChild(app.canvas);
      const actor = await loadActor(PIXI, seniorGloam);
      app.stage.addChild(actor.container);
      still?.classList.add("is-gone");
      const at = { focus: state.focus, height: state.height, ground: state.ground };
      app.ticker.add((tk) => {
        if (state.hidden) return;
        const dt = Math.min(0.05, tk.deltaMS / 1000);
        const k = calm || snap ? 1 : 1 - Math.exp(-dt * 3);
        snap = false;
        at.focus += (state.focus - at.focus) * k;
        at.height += (state.height - at.height) * k;
        at.ground += (state.ground - at.ground) * k;
        shove *= Math.exp(-dt * 9);
        const W = app.screen.width;
        const H = app.screen.height;
        const x = W * at.focus + shove;
        const feet = H * at.ground;
        const h = H * at.height;
        actor.container.position.set(x, feet);
        actor.setHeight(h);
        const awake = state.mood !== "asleep";
        const recent = performance.now() - pointer.at < 4000;
        const lookAt = awake && recent && !calm ? { x: clamp((pointer.x - x) / (W * 0.35)), y: clamp((pointer.y - (feet - h * 0.6)) / (H * 0.4)) } : null;
        // (a smaller glow than in the game: on a big screen the full one washes Gloam's face out)
        const out = actor.update(dt, { mood: state.mood, typingTick, eurekaTick, talking: state.talking, light: state.light, walk: 0, lookAt, waiting: false, calm, lanternGlow: 0.6, at: { x, y: feet } });
        // (the rig says where its lantern is relative to its feet: this puts it on the screen)
        lantern = { x: x + out.lantern.x, y: feet + out.lantern.y };
        if (Math.abs(shove) < 2 && h > 20) lanternFromFeet = { x: out.lantern.x / h, y: out.lantern.y / h };
        camera.style.setProperty("--lx", `${Math.round(lantern.x)}px`);
        camera.style.setProperty("--ly", `${Math.round(lantern.y)}px`);
        if (light.r > 0.2) paintLight();
        emit({ x, top: feet - h * 1.02, feet, h, lantern });
      });
      document.addEventListener("visibilitychange", () => (document.hidden ? app.ticker.stop() : app.ticker.start()));
      root.dataset.ready = "1";
    } catch {
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
  if ("requestIdleCallback" in window) requestIdleCallback(() => void start(), { timeout: 900 });
  else setTimeout(() => void start(), 250);

  return {
    state,
    set(next: Partial<StageState>) {
      // coming back into view: Gloam is simply there, it doesn't glide over from where it was
      if (next.hidden === false && state.hidden) snap = true;
      Object.assign(state, next);
      root.classList.toggle("is-hidden", state.hidden);
      document.documentElement.classList.toggle("stage-off", state.hidden);
      placeStill();
      if (root.dataset.ready !== "1") emit(guess());
    },
    /** put Gloam straight where it's told next (no gliding) */
    jump() {
      snap = true;
    },
    /** stand Gloam so its lantern hangs at (x, y) on the screen, `height` tall (share of the screen) */
    placeLantern(x: number, y: number, height: number) {
      const h = innerHeight * height;
      const focus = (x - lanternFromFeet.x * h) / innerWidth;
      const ground = (y - lanternFromFeet.y * h) / innerHeight;
      this.set({ focus, ground, height });
    },
    /** it gets it: the hop, the lantern, the camera pushing in, a little shake, fireflies, and the light rolling out */
    ignite() {
      eurekaTick++;
      state.light = 1;
      lightTo(160, 2.6, true);
      if (calm) return;
      camera.classList.add("is-push");
      setTimeout(() => camera.classList.remove("is-push"), 1800);
      root.classList.remove("is-shake");
      void root.offsetWidth;
      root.classList.add("is-shake");
      setTimeout(() => burst(), 120);
    },
    /** back to before it understood (scrolling back up the story) */
    douse() {
      state.light = 0;
      lightTo(0, 0.6);
    },
    /** the valley stays lit by what Gloam already knows */
    glow(r: number, seconds = 1.2) {
      lightTo(r, seconds);
    },
    /** dawn coming up (0..1): the sky warms behind the valley */
    dawn(level: number) {
      dawnEl.style.opacity = String(Math.max(0, Math.min(1, level)));
    },
    /** a quick shove sideways: the lantern swings on its stalk (Gloam bonking something with it) */
    swing(px: number) {
      if (!calm) shove += px;
    },
    /** travel through the valley: each layer drifts by its depth (0..1 along the story) */
    drift(p: number) {
      if (calm) return;
      for (const l of layers) {
        const d = Number(l.dataset.depth ?? 0);
        l.style.transform = `translate3d(${(-p * (d + 0.5) * 3.2).toFixed(2)}%, ${(p * d * 0.6).toFixed(2)}%, 0) scale(1.1)`;
      }
    },
    /** a keystroke in the story's teach box: Gloam nods along */
    typed() {
      typingTick++;
    },
    lantern: () => lantern,
    box: () => last,
    onBox(f: (b: GloamBox) => void) {
      listeners.push(f);
      f(last);
    },
  };
}

export type Stage = ReturnType<typeof createStage>;

/**
 * A second, small Gloam (the Ways to play preview), drawn only while it's on screen. `talking()` says whether
 * its mouth should move (while "read it to me" plays).
 */
export function createMini(host: HTMLElement, talking: () => boolean) {
  let started = false;
  let running = false;
  const io = new IntersectionObserver(([e]) => {
    running = e.isIntersecting;
    if (!running || started) return;
    started = true;
    void (async () => {
      try {
        const { PIXI, loadActor } = await loadPixi();
        const app = new PIXI.Application();
        await app.init({ resizeTo: host, backgroundAlpha: 0, antialias: true, resolution: Math.min(devicePixelRatio || 1, 1.5), autoDensity: true, preference: "webgl" });
        host.appendChild(app.canvas);
        const actor = await loadActor(PIXI, seniorGloam);
        app.stage.addChild(actor.container);
        host.classList.add("is-live");
        app.ticker.add((tk) => {
          if (!running) return;
          const W = app.screen.width;
          const H = app.screen.height;
          actor.container.position.set(W * 0.5, H * 0.94);
          actor.setHeight(H * 0.72);
          const speaking = talking();
          actor.update(Math.min(0.05, tk.deltaMS / 1000), { mood: speaking ? "excited" : "curious", typingTick: 0, eurekaTick: 0, talking: speaking, light: 0.2, walk: 0, lookAt: null, waiting: false, calm, lanternGlow: 0.5 });
        });
      } catch {
        // no WebGL: the painted picture stays
      }
    })();
  });
  io.observe(host);
}

const clamp = (v: number) => Math.max(-1, Math.min(1, v));
