import type { GloamMood } from "@/components/gloam/poses";
import type { GloamActor } from "@/components/gloam/rig/GloamActor";
import type { LostCopy } from "@/lib/age-styles/types";
import type { RigSpec } from "@/lib/gloam-rig/spec";

export type LostKind = "missing" | "gone" | "broke";
type SpotId = "rock" | "bush" | "sign" | "shrine";

export interface LostOptions {
  copy: LostCopy;
  kind: LostKind;
  rig: RigSpec;
  calm: boolean;
}

// Where Gloam waits, across the stage (0..1), and how far the moonlight reaches (px, before it's sized to the screen)
const HOME = 0.4;
const clamp = (v: number, lo = -1, hi = 1) => Math.max(lo, Math.min(hi, v));

/**
 * The lost page's living part, shared by the app (components/lost/LostScreen.tsx) and the website
 * (site/js/lost.ts): both draw the same markup (see lost.css), and this brings it to life.
 *
 *   - The valley is dark. The pointer (or a finger, or the focused button) is a pool of moonlight that shows it.
 *   - Gloam's lantern stays dim (it doesn't get where the page went: gold only ever means understanding).
 *     Its eyes follow the moonlight.
 *   - Hiding spots: Gloam walks over, checks, and says what it found. When it has checked them all, it
 *     gives up, and the moon comes out over the whole valley.
 *   - Reduced motion: the moonlight stays still and wide, Gloam doesn't walk (it's just there).
 * Returns a function that takes it all down again.
 */
export function mountLost(root: HTMLElement, { copy, kind, rig, calm }: LostOptions): () => void {
  const q = <T extends Element = HTMLElement>(s: string) => root.querySelector<T>(s);
  const stage = q(".lost-stage")!;
  const host = q(".lost-canvas")!;
  const bubble = q(".lost-bubble")!;
  const shown = q(".lost-say [data-shown]")!;
  const rest = q(".lost-say [data-rest]")!;
  const sr = q(".lost-sr")!;
  const poke = q<HTMLButtonElement>(".lost-poke")!;
  const words = q(".lost-words")!;
  const still = q<HTMLImageElement>(".lost-still");
  const spots = [...root.querySelectorAll<HTMLButtonElement>(".lost-spot")];

  let alive = true;
  const offs: (() => void)[] = [];
  const on = (t: EventTarget, ev: string, fn: (e: Event) => void, opts?: AddEventListenerOptions) => {
    t.addEventListener(ev, fn, opts);
    offs.push(() => t.removeEventListener(ev, fn, opts));
  };

  // ---- the layout (measured on resize, not every frame) ----
  let W = 0;
  let H = 0;
  let box = { left: 0, top: 0, width: 0, height: 0 };
  let wordsRight = 0;
  let wide = true;
  let centres: { id: SpotId; el: HTMLButtonElement; x: number; y: number }[] = [];
  const measure = () => {
    const r = root.getBoundingClientRect();
    W = r.width;
    H = r.height;
    const s = stage.getBoundingClientRect();
    box = { left: s.left - r.left, top: s.top - r.top, width: s.width, height: s.height };
    wide = W >= 820 && W / H > 1.2;
    const w = words.getBoundingClientRect();
    wordsRight = wide ? w.right - r.left : 0;
    // (only the spots this screen shows: a phone leaves one out)
    centres = spots
      .map((el) => ({ el, b: el.getBoundingClientRect() }))
      .filter(({ b }) => b.width > 0)
      .map(({ el, b }) => ({ id: el.dataset.spot as SpotId, el, x: b.left - r.left + b.width / 2, y: b.top - r.top + b.height / 2 }));
    radius = Math.max(130, Math.min(300, Math.max(W, H) * 0.2));
  };
  let radius = 200;

  // ---- Gloam's state ----
  const g = { x: -1, tx: 0, mood: (kind === "missing" ? "confused" : "sheepish") as GloamMood, talking: false, tick: 0, walk: 0 };
  // (on a phone the width decides too, so there's room to walk between the hiding spots)
  const size = () => Math.max(110, Math.min(box.height * (wide ? 0.5 : 0.56), box.width * 0.42, 320));
  const ground = () => box.top + box.height * 0.9;
  const home = () => box.left + box.width * HOME;

  // ---- talking: typed out, with the whole line for screen readers at once ----
  let token = 0;
  const speak = (text: string, mood: GloamMood) => {
    g.mood = mood;
    sr.textContent = text;
    bubble.classList.remove("is-empty");
    const mine = ++token;
    if (calm) {
      shown.textContent = text;
      rest.textContent = "";
      return Promise.resolve();
    }
    g.talking = true;
    return new Promise<void>((done) => {
      let i = 0;
      const tick = () => {
        if (!alive || mine !== token) return done();
        i++;
        shown.textContent = text.slice(0, i);
        rest.textContent = text.slice(i);
        if (i >= text.length) {
          g.talking = false;
          return done();
        }
        setTimeout(tick, 26 + (/[.,?!]/.test(text[i - 1]) ? 160 : 0));
      };
      tick();
    });
  };
  const pick = (lines: string[]) => lines[Math.floor(Math.random() * lines.length)];

  // ---- the hiding spots ----
  const checked = new Set<SpotId>();
  let going: SpotId | null = null;
  const lineFor = (id: SpotId) => (id === "shrine" ? copy.shrine.line : copy.spots[id].line);
  const visit = (id: SpotId) => {
    const c = centres.find((s) => s.id === id);
    if (!c) return;
    going = id;
    g.mood = "curious";
    // stand beside it, not on top of it: on whichever side keeps clear of the other spots (and on the stage)
    const lo = box.left + size() * 0.3;
    const hi = box.left + box.width - size() * 0.3;
    const room = (x: number) => Math.min(...centres.filter((o) => o.id !== id).map((o) => Math.abs(o.x - x)), Infinity) - Math.max(0, lo - x, x - hi) * 4;
    const [left, right] = [c.x - size() * 0.42, c.x + size() * 0.42];
    g.tx = clamp(room(left) >= room(right) ? left : right, lo, hi);
    if (calm) g.x = g.tx;
  };
  const arrive = async (id: SpotId) => {
    going = null;
    g.tick++;
    await new Promise((r) => setTimeout(r, calm ? 0 : 450));
    g.tick++;
    await speak(lineFor(id), id === "shrine" ? "sheepish" : "skeptical");
    centres.find((s) => s.id === id)?.el.classList.add("is-checked");
    checked.add(id);
    if (kind === "missing" && centres.every((s) => checked.has(s.id)) && !root.classList.contains("is-found")) {
      await new Promise((r) => setTimeout(r, calm ? 0 : 1300));
      if (!alive) return;
      // every spot checked: the moon comes out over the whole valley. Nothing there. Gloam takes it well.
      root.classList.add("is-found");
      await speak(copy.giveUp, "skeptical");
    }
  };
  for (const el of spots) on(el, "click", () => visit(el.dataset.spot as SpotId));

  let pokes = 0;
  on(poke, "click", () => {
    g.tick++;
    void speak(copy.poke[pokes++ % copy.poke.length], "excited");
  });

  // ---- the moonlight ----
  const light = { x: 0, y: 0, r: 0 };
  let drawn = { x: -1, y: -1, r: -1 };
  const pointer = { x: 0, y: 0, at: -1e9 };
  const aim = (x: number, y: number) => {
    const r = root.getBoundingClientRect();
    pointer.x = x - r.left;
    pointer.y = y - r.top;
    pointer.at = performance.now();
  };
  on(window, "pointermove", (e) => aim((e as PointerEvent).clientX, (e as PointerEvent).clientY), { passive: true });
  on(window, "pointerdown", (e) => aim((e as PointerEvent).clientX, (e as PointerEvent).clientY), { passive: true });
  // keyboard: the light goes to whatever has focus in the valley
  on(root, "focusin", (e) => {
    const t = e.target as HTMLElement;
    if (!t.closest(".lost-stage")) return;
    const b = t.getBoundingClientRect();
    aim(b.left + b.width / 2, b.top + b.height / 2);
  });

  // ---- Gloam itself (PixiJS and the painted rig, loaded after the page shows) ----
  let actor: GloamActor | null = null;
  let render: (() => void) | null = null;
  let destroy = () => {};
  const start = async () => {
    try {
      const PIXI = await import("pixi.js");
      // both security policies forbid eval; this lets Pixi build its shaders without it
      await import("pixi.js/unsafe-eval");
      // and the website's forbids workers made from blobs: load pictures on the main thread
      PIXI.Assets.setPreferences({ preferWorkers: false });
      const { loadActor } = await import("@/components/gloam/rig/load");
      if (!alive) return;
      const nav = navigator as Navigator & { deviceMemory?: number };
      const lite = (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4;
      const app = new PIXI.Application();
      // (the canvas covers the screen so Gloam's light is never boxed in; on a very big screen it's drawn a
      // little softer, so it stays smooth)
      const big = Math.sqrt(2_400_000 / Math.max(1, innerWidth * innerHeight));
      const resolution = Math.max(0.6, Math.min(devicePixelRatio || 1, lite ? 1 : 1.5, big));
      await app.init({ resizeTo: host, backgroundAlpha: 0, antialias: !lite, resolution, autoDensity: true, preference: "webgl", autoStart: false });
      if (!alive) return app.destroy(true);
      const a = await loadActor(PIXI, rig);
      if (!alive) return app.destroy(true);
      host.append(app.canvas);
      app.stage.addChild(a.container);
      actor = a;
      render = () => app.render();
      destroy = () => app.destroy({ removeView: true }, { children: true });
      still?.classList.add("is-gone");
      root.dataset.ready = "1";
    } catch {
      // no WebGL (or something else went wrong): the still picture stays, everything else still works
      root.dataset.ready = "still";
    }
  };

  // ---- every frame ----
  let last = performance.now();
  const born = last;
  let frame = 0;
  const loop = (now: number) => {
    if (!alive) return;
    frame = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!W) return;
    const h = size();
    const feet = ground();
    if (g.x < 0) g.x = g.tx = home();

    // the moonlight: the pointer if it moved lately, otherwise a slow wander over the valley
    const t = now / 1000;
    let tx = pointer.x;
    let ty = pointer.y;
    if (calm) {
      tx = box.left + box.width * 0.5;
      ty = box.top + box.height * 0.55;
    } else if (now - pointer.at > 2600) {
      tx = box.left + box.width * (0.5 + Math.sin(t * 0.33) * 0.32);
      ty = box.top + box.height * (0.62 + Math.cos(t * 0.47) * 0.16);
    }
    const k = calm ? 1 : 1 - Math.exp(-dt * (now - pointer.at > 2600 ? 1.6 : 7));
    if (light.x === 0 && light.y === 0) {
      light.x = home();
      light.y = feet - h * 0.5;
    }
    light.x += (tx - light.x) * k;
    light.y += (ty - light.y) * k;
    // it opens up as the page arrives (the one choreographed moment), and floods the valley once Gloam gives up
    const found = root.classList.contains("is-found");
    const target = found ? Math.max(W, H) * 1.2 : calm ? radius * 1.6 : radius;
    const grow = calm ? 1 : Math.min(1, (now - born) / 1100);
    light.r += (target * (found ? 1 : grow * grow * (3 - 2 * grow)) - light.r) * (calm ? 1 : 1 - Math.exp(-dt * (found ? 1.4 : 9)));
    // (only when it moved: each change repaints the dark over the whole screen)
    if (Math.abs(light.x - drawn.x) + Math.abs(light.y - drawn.y) + Math.abs(light.r - drawn.r) > 0.6) {
      drawn = { ...light };
      root.style.setProperty("--mx", `${light.x.toFixed(1)}px`);
      root.style.setProperty("--my", `${light.y.toFixed(1)}px`);
      root.style.setProperty("--r", `${light.r.toFixed(1)}px`);
      for (const s of centres) s.el.classList.toggle("is-lit", Math.hypot(s.x - light.x, s.y - light.y) < radius * 0.55);
    }

    // Gloam walks to where it's going, then checks it
    const dx = g.tx - g.x;
    const speed = h * 1.5;
    const step = Math.sign(dx) * Math.min(Math.abs(dx), speed * dt);
    g.x += step;
    g.walk += ((Math.abs(dx) > 1 ? clamp(step / dt / speed) : 0) - g.walk) * Math.min(1, dt * 10);
    if (going && Math.abs(g.tx - g.x) < 1) void arrive(going);
    const walking = Math.abs(g.walk) > 0.05;
    const lookAt = walking ? null : { x: clamp((light.x - g.x) / (W * 0.3)), y: clamp((light.y - (feet - h * 0.6)) / (h * 1.2)) };
    if (actor && render) {
      actor.container.position.set(g.x, feet);
      actor.setHeight(h);
      actor.update(dt, { mood: g.mood, typingTick: g.tick, eurekaTick: 0, talking: g.talking, light: 0.08, walk: g.walk, lookAt, waiting: false, calm, lanternGlow: 0.35, at: { x: g.x, y: feet } });
      render();
    } else if (still) {
      still.style.transform = `translate(${(g.x - h * 0.4).toFixed(0)}px, ${(feet - h).toFixed(0)}px)`;
      still.style.height = `${h.toFixed(0)}px`;
    }

    // the bubble over its head, never over the words; the poke button over its body
    const top = feet - h * 1.02;
    const bw = bubble.offsetWidth;
    const bh = bubble.offsetHeight;
    const bx = clamp(g.x - bw / 2, Math.max(12, wordsRight + 16), W - 12 - bw);
    const by = Math.max(8, top - bh - 6);
    bubble.style.transform = `translate(${bx.toFixed(0)}px, ${by.toFixed(0)}px)`;
    bubble.style.setProperty("--tail", `${clamp(g.x - bx, 22, bw - 22).toFixed(0)}px`);
    poke.style.cssText = `left:${(g.x - h * 0.4).toFixed(0)}px;top:${(feet - h * 0.95).toFixed(0)}px;width:${(h * 0.8).toFixed(0)}px;height:${(h * 0.95).toFixed(0)}px`;
  };

  measure();
  const ro = new ResizeObserver(() => {
    measure();
    g.tx = going ? g.tx : home();
    if (calm || !actor) g.x = g.tx;
  });
  ro.observe(root);
  offs.push(() => ro.disconnect());
  frame = requestAnimationFrame(loop);
  void start();
  // Gloam says why it's here once the light is up
  const hello = setTimeout(() => void speak(pick(copy[kind].lines), g.mood), calm ? 300 : 1000);

  return () => {
    alive = false;
    clearTimeout(hello);
    cancelAnimationFrame(frame);
    offs.forEach((f) => f());
    destroy();
  };
}
