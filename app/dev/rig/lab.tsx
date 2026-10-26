"use client";

import { useEffect, useRef, useState } from "react";
import { POSES, type GloamMood } from "@/components/gloam/poses";
import type { GloamActor } from "@/components/gloam/rig/GloamActor";
import { loadActor } from "@/components/gloam/rig/load";
import type { TrickName } from "@/lib/gloam-rig/brain";
import { senior } from "@/lib/age-styles/senior";

const MOODS = Object.keys(POSES) as GloamMood[];

export function RigLab() {
  const host = useRef<HTMLDivElement>(null);
  const actorRef = useRef<GloamActor | null>(null);
  const q = typeof window === "undefined" ? new URLSearchParams() : new URLSearchParams(window.location.search);
  const [mood, setMood] = useState<GloamMood>((q.get("mood") as GloamMood) ?? "curious");
  const [light, setLight] = useState(Number(q.get("light") ?? 0.3));
  const [talk, setTalk] = useState(q.get("talk") === "1");
  const [walk, setWalk] = useState(Number(q.get("walk") ?? 0));
  const live = useRef({ mood, light, talk, walk, typing: 0, eureka: 0 });
  useEffect(() => {
    live.current = { ...live.current, mood, light, talk, walk };
  }, [mood, light, talk, walk]);

  useEffect(() => {
    const el = host.current;
    if (!el || !senior.look.rig) return;
    let destroyed = false;
    let cleanup = () => {};
    (async () => {
      const PIXI = await import("pixi.js");
      const app = new PIXI.Application();
      await app.init({ resizeTo: el, backgroundAlpha: 0, antialias: true, resolution: Math.min(2, devicePixelRatio), autoDensity: true });
      if (destroyed) return app.destroy(true);
      el.appendChild(app.canvas);
      const actor = await loadActor(PIXI, senior.look.rig!);
      actorRef.current = actor;
      app.stage.addChild(actor.container);
      // ?trick=firefly shows that trick, again every 5 seconds
      const trick = q.get("trick") as TrickName | null;
      if (trick) {
        actor.brain.showTrick(trick);
        setInterval(() => actor.brain.showTrick(trick), 5000);
      }
      const idle = Number(q.get("idle") ?? 0);
      if (idle) actor.brain.setIdle(idle);
      if (q.get("eureka")) live.current.eureka = 1;
      // fast-forward for screenshots
      const at = Number(q.get("at") ?? 0);
      const step = (dt: number) => {
        const L = live.current;
        actor.container.position.set(app.screen.width / 2, app.screen.height * 0.82);
        actor.setHeight(app.screen.height * 0.5);
        actor.update(dt, { mood: L.mood, typingTick: L.typing, eurekaTick: L.eureka, talking: L.talk, light: L.light, walk: L.walk, lookAt: null, waiting: true, calm: false, level: Number(q.get("level") ?? 1) });
      };
      for (let t = 0; t < at; t += 1 / 60) step(1 / 60);
      app.ticker.add((tk) => step(tk.deltaMS / 1000));
      el.dataset.ready = "1";
      cleanup = () => app.destroy(true);
    })();
    return () => {
      destroyed = true;
      cleanup();
    };
    // the lab sets itself up once; controls go through `live`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main data-age-style="senior" className="flex h-dvh flex-col bg-bg text-ink">
      <div ref={host} className="relative flex-1 bg-cover bg-center" style={{ backgroundImage: "url(/art/senior/valley-0-dark.webp)" }} />
      <div className="flex flex-wrap items-center gap-2 border-t border-line p-3 text-xs">
        {MOODS.map((m) => (
          <button key={m} type="button" onClick={() => setMood(m)} className={`rounded-sm border px-2 py-1 ${m === mood ? "border-[var(--t-moon)]" : "border-line"}`}>
            {m}
          </button>
        ))}
        <button type="button" className="rounded-sm border border-line px-2 py-1" onClick={() => (live.current.typing += 1)}>
          type
        </button>
        <button type="button" className="rounded-sm border border-line px-2 py-1" onClick={() => (live.current.eureka += 1)}>
          eureka
        </button>
        <button type="button" className="rounded-sm border border-line px-2 py-1" onClick={() => setTalk(!talk)}>
          talk {talk ? "on" : "off"}
        </button>
        <button type="button" className="rounded-sm border border-line px-2 py-1" onClick={() => setWalk(walk ? 0 : 1)}>
          walk {walk ? "on" : "off"}
        </button>
        <button type="button" className="rounded-sm border border-line px-2 py-1" onClick={() => actorRef.current?.brain.setIdle(75)}>
          bored
        </button>
        <label className="flex items-center gap-1">
          light <input type="range" min={0} max={1} step={0.05} value={light} onChange={(e) => setLight(Number(e.target.value))} />
        </label>
      </div>
    </main>
  );
}
