/**
 * The homepage's stage: the night valley from the app, fixed behind the page, with the real Gloam (the same
 * animated rig students teach) standing in it. Chapters scroll over it and tell it what to do (stage.set).
 * Gloam watches the pointer, blinks, breathes, can be poked, and gets it when the story says so.
 *
 * Light means understanding here too: the valley's lit painting and the lantern's gold only come on when
 * Gloam understands something in the story.
 */
import type { GloamMood } from "@/components/gloam/poses";
import { seniorGloam } from "@/lib/age-styles/rigs/senior-gloam";

export interface StageState {
  /** where Gloam stands across the screen (0..1) and how tall it is (share of the screen's height) */
  focus: number;
  height: number;
  /** where its feet are (share of the screen's height) */
  ground: number;
  mood: GloamMood;
  /** 0..1: Gloam's lantern (understanding) */
  light: number;
  /** 0..1: the valley relit by what Gloam understands */
  lit: number;
  talking: boolean;
  /** the stage is covered by a paper chapter: stop drawing */
  hidden: boolean;
}

export const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Rough box around Gloam on screen (px), for the speech bubble and the poke button */
export interface GloamBox {
  x: number;
  top: number;
  feet: number;
  h: number;
}

export function createStage(root: HTMLElement) {
  const state: StageState = { focus: 0.68, height: 0.46, ground: 0.86, mood: "confused", light: 0, lit: 0, talking: false, hidden: false };
  let eurekaTick = 0;
  let typingTick = 0;
  const listeners: ((b: GloamBox) => void)[] = [];
  const litLayers = [...root.querySelectorAll<HTMLElement>("[data-lit]")];
  const canvasHost = root.querySelector<HTMLElement>(".gloam-canvas")!;
  const still = root.querySelector<HTMLImageElement>(".gloam-still");

  const box = (): GloamBox => {
    const W = innerWidth;
    const H = innerHeight;
    const h = H * state.height;
    return { x: W * state.focus, top: H * state.ground - h, feet: H * state.ground, h };
  };
  const emit = () => listeners.forEach((f) => f(box()));

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

  function applyLit() {
    for (const l of litLayers) l.style.opacity = String(state.lit);
    root.classList.toggle("is-hidden", state.hidden);
    // (the speech bubble and the poke button hide with the stage)
    document.documentElement.classList.toggle("stage-off", state.hidden);
  }

  // The fallback (no WebGL, or before Gloam loads): a painted still of Gloam where it stands
  function placeStill() {
    if (!still) return;
    const b = box();
    still.style.height = `${b.h}px`;
    still.style.left = `${b.x}px`;
    still.style.top = `${b.top}px`;
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
      await app.init({ width: 8, height: 8, backgroundAlpha: 0, antialias: !lite, resolution: Math.min(devicePixelRatio || 1, lite ? 1 : 1.5), autoDensity: true, preference: "webgl" });
      canvasHost.appendChild(app.canvas);
      const actor = await loadActor(PIXI, seniorGloam);
      app.stage.addChild(actor.container);
      still?.classList.add("is-gone");
      // the drawn Gloam slides between places smoothly (chapters only say where it should be)
      const at = { focus: state.focus, height: state.height, ground: state.ground };
      // the canvas is only as big as Gloam (with room for its lantern, arms and jumps) and travels with it:
      // a cheap laptop only draws Gloam, never a whole screen of empty pixels
      const box = { w: 0, h: 0 };
      const FEET = 0.86;
      app.ticker.add((tk) => {
        if (state.hidden) return;
        const dt = Math.min(0.05, tk.deltaMS / 1000);
        const k = calm ? 1 : 1 - Math.exp(-dt * 3.2);
        at.focus += (state.focus - at.focus) * k;
        at.height += (state.height - at.height) * k;
        at.ground += (state.ground - at.ground) * k;
        const W = innerWidth;
        const H = innerHeight;
        const x = W * at.focus;
        const feet = H * at.ground;
        const h = H * at.height;
        const bw = Math.ceil(h * 1.7);
        const bh = Math.ceil(h * 1.75);
        if (Math.abs(bw - box.w) > 2 || Math.abs(bh - box.h) > 2) {
          box.w = bw;
          box.h = bh;
          app.renderer.resize(bw, bh);
        }
        canvasHost.style.transform = `translate(${Math.round(x - box.w / 2)}px, ${Math.round(feet - box.h * FEET)}px)`;
        actor.container.position.set(box.w / 2, box.h * FEET);
        actor.setHeight(h);
        const awake = state.mood !== "asleep";
        const recent = performance.now() - pointer.at < 4000;
        const lookAt = awake && recent && !calm ? { x: clamp((pointer.x - x) / (W * 0.35)), y: clamp((pointer.y - (feet - h * 0.6)) / (H * 0.4)) } : null;
        actor.update(dt, { mood: state.mood, typingTick, eurekaTick, talking: state.talking, light: state.light, walk: 0, lookAt, waiting: false, calm });
        for (const f of listeners) f({ x, top: feet - h, feet, h });
      });
      // nothing to draw while a paper chapter covers the stage, or the tab is hidden
      document.addEventListener("visibilitychange", () => (document.hidden ? app.ticker.stop() : app.ticker.start()));
      root.dataset.ready = "1";
    } catch {
      // no WebGL: the painted still stays
      root.dataset.ready = "still";
    }
  }

  addEventListener("resize", () => {
    placeStill();
    emit();
  });
  placeStill();
  applyLit();
  // let the words and pictures load first; Gloam comes right after
  if ("requestIdleCallback" in window) requestIdleCallback(() => void start(), { timeout: 1200 });
  else setTimeout(() => void start(), 300);

  return {
    state,
    set(next: Partial<StageState>) {
      Object.assign(state, next);
      applyLit();
      placeStill();
      emit();
    },
    /** the big moment: Gloam gets it (the hop, and the lantern flares) */
    eureka() {
      eurekaTick++;
    },
    /** a keystroke in the story's teach box: Gloam nods along */
    typed() {
      typingTick++;
    },
    onBox(f: (b: GloamBox) => void) {
      listeners.push(f);
      f(box());
    },
  };
}

export type Stage = ReturnType<typeof createStage>;

const clamp = (v: number) => Math.max(-1, Math.min(1, v));
