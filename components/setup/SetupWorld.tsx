"use client";

import { useEffect, useRef } from "react";
import type { GloamMood } from "@/components/gloam/poses";
import { seniorGloam } from "@/lib/age-styles/rigs/senior-gloam";
import { useCalmMotion } from "@/lib/useCalmMotion";

/** The paintings (1344×768), back to front. Gloam stands on the meadow, in front of everything (the front grass is
 *  blurred for depth, so standing behind it would look like a cut, not grass). */
const LAYERS = [0, 1, 2, 3].map((k) => ({ dark: `/art/senior/valley-${k}-dark.webp`, lit: `/art/senior/valley-${k}-lit.webp` }));
const ART = { w: 1344, h: 768, ground: 0.83 };
const FIREFLIES = 26;
// fireflies: fixed places (the same every time), more of them shown as setup goes on
const FLIES = (() => {
  let seed = 7;
  const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  return Array.from({ length: FIREFLIES }, (_, i) => ({ x: 4 + r() * 92, y: 38 + r() * 54, d: 6 + r() * 7, delay: -r() * 10, i }));
})();

export interface SetupWorldProps {
  /** 0..1: how far setup has got. The valley slowly fills with moonlight, and fireflies gather. (Never gold:
   *  gold only ever means Gloam understood something.) */
  progress: number;
  mood: GloamMood;
  talking: boolean;
  typingTick: number;
  /** where Gloam stands across the screen (0..1), and how tall, as a share of the screen's height */
  focus: number;
  height: number;
  /** where Gloam's feet are, as a share of the screen's height (null: on the painted meadow) */
  groundAt: number | null;
  onPoke: () => void;
  pokeLabel: string;
}

/**
 * The night valley the setup happens in, with the real Gloam (the animated rig from the game) asleep in the
 * grass. Gloam's eyes follow the pointer once it's awake. The paintings are plain images; only Gloam is drawn
 * on the GPU, so this stays light on a school laptop.
 */
export function SetupWorld(props: SetupWorldProps) {
  const calm = useCalmMotion();
  const host = useRef<HTMLDivElement>(null);
  const canvasHost = useRef<HTMLDivElement>(null);
  const poke = useRef<HTMLButtonElement>(null);
  const live = useRef({ ...props, calm });
  useEffect(() => {
    live.current = { ...props, calm };
  });

  useEffect(() => {
    const el = canvasHost.current;
    const stage = host.current;
    if (!el || !stage) return;
    let destroyed = false;
    let cleanup = () => {};
    // where the pointer is (Gloam looks at it), and when it last moved
    const pointer = { x: 0, y: 0, at: -1e9 };
    const onMove = (e: PointerEvent) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.at = performance.now();
    };
    window.addEventListener("pointermove", onMove);

    (async () => {
      const PIXI = await import("pixi.js");
      // Protégé's security policy forbids eval; this makes Pixi build its shaders without it
      await import("pixi.js/unsafe-eval");
      const { loadActor } = await import("@/components/gloam/rig/load");
      if (destroyed) return;
      const app = new PIXI.Application();
      try {
        await app.init({ resizeTo: el, backgroundAlpha: 0, antialias: true, resolution: Math.min(window.devicePixelRatio || 1, 1.5), autoDensity: true, preference: "webgl" });
      } catch {
        return; // no WebGL: the painted valley still shows, without Gloam moving
      }
      if (destroyed) return app.destroy(true);
      el.appendChild(app.canvas);
      const actor = await loadActor(PIXI, seniorGloam);
      if (destroyed) return app.destroy(true);
      app.stage.addChild(actor.container);

      app.ticker.add((tk) => {
        const L = live.current;
        const W = app.screen.width;
        const H = app.screen.height;
        // the painted meadow, wherever "cover" put it
        const scale = Math.max(W / ART.w, H / ART.h);
        const ground = L.groundAt != null ? H * L.groundAt : (H - ART.h * scale) / 2 + ART.ground * ART.h * scale;
        const h = H * L.height;
        const x = W * L.focus;
        actor.container.position.set(x, ground);
        actor.setHeight(h);
        const awake = L.mood !== "asleep";
        const recent = performance.now() - pointer.at < 4000;
        const lookAt =
          awake && recent && !L.calm
            ? { x: Math.max(-1, Math.min(1, (pointer.x - x) / (W * 0.35))), y: Math.max(-1, Math.min(1, (pointer.y - (ground - h * 0.6)) / (H * 0.4))) }
            : null;
        actor.update(Math.min(0.05, tk.deltaMS / 1000), {
          mood: L.mood,
          typingTick: L.typingTick,
          // (a poke wakes Gloam with a start: the scene changes its mood, and the brain does the hop)
          eurekaTick: 0,
          talking: L.talking && awake,
          // the lantern stays dark: Gloam doesn't understand anything yet (that's the students' job)
          light: 0,
          walk: 0,
          lookAt,
          waiting: false,
          calm: L.calm,
        });
        // the invisible "poke Gloam" button sits over Gloam
        const b = poke.current;
        if (b) {
          b.style.left = `${x - h * 0.42}px`;
          b.style.top = `${ground - h * 0.95}px`;
          b.style.width = `${h * 0.84}px`;
          b.style.height = `${h * 0.95}px`;
        }
      });
      stage.dataset.ready = "1";
      cleanup = () => app.destroy(true);
    })();
    return () => {
      destroyed = true;
      window.removeEventListener("pointermove", onMove);
      cleanup();
    };
  }, []);

  const lit = Math.max(0, Math.min(1, props.progress));
  const shown = Math.round(lit * FIREFLIES);

  return (
    <div ref={host} className="absolute inset-0 overflow-hidden bg-[#0b1411]" aria-hidden="false">
      {/* only the sky and mountains take the moonlight: the meadow's lit painting has the lantern's warm
          light in it, and gold only ever means Gloam understood something */}
      {LAYERS.slice(0, 3).map((l, i) => (
        <Painting key={i} dark={l.dark} lit={i < 2 ? l.lit : null} light={lit} />
      ))}
      {/* the moon coming up behind the mountains */}
      <div
        className="pointer-events-none absolute inset-x-0 top-[18%] h-[44%] transition-opacity duration-[2000ms]"
        style={{ opacity: 0.15 + lit * 0.55, background: "radial-gradient(60% 55% at 58% 72%, rgb(142 197 220 / 0.45), transparent 70%)" }}
      />
      <Painting dark={LAYERS[3].dark} lit={null} light={lit} />
      <div ref={canvasHost} className="absolute inset-0" />
      <div className="pointer-events-none absolute inset-0">
        {FLIES.map((f) => (
          <span
            key={f.i}
            className={`absolute h-1.5 w-1.5 rounded-full transition-opacity duration-[1500ms] ${calm ? "" : "setup-firefly"}`}
            style={{
              left: `${f.x}%`,
              top: `${f.y}%`,
              opacity: f.i < shown ? 0.9 : 0,
              background: "var(--t-moon)",
              boxShadow: "0 0 10px 3px rgb(142 197 220 / 0.55)",
              animationDuration: `${f.d}s`,
              animationDelay: `${f.delay}s`,
            }}
          />
        ))}
      </div>
      {/* edges fall into night, so words on top always read */}
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(120% 90% at 40% 45%, transparent 55%, rgb(5 10 8 / 0.55))" }} />
      <button
        ref={poke}
        type="button"
        onClick={props.onPoke}
        aria-label={props.pokeLabel}
        className="absolute cursor-pointer rounded-[40%] bg-transparent"
        style={{ left: -999, top: -999 }}
      />
    </div>
  );
}

function Painting({ dark, lit, light }: { dark: string; lit: string | null; light: number }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={dark} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover" />
      {lit && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={lit} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-[2000ms]" style={{ opacity: light * 0.85 }} />
      )}
    </>
  );
}
