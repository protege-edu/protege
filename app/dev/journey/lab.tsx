"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { GloamMood } from "@/components/gloam/poses";
import { getAgeStyle } from "@/lib/age-styles";

const JourneyWorld = dynamic(() => import("@/components/cinema/JourneyWorld").then((m) => m.JourneyWorld), { ssr: false });

const subscribe = () => () => {};
const getQuery = () => window.location.search;

export function JourneyLab() {
  const search = useSyncExternalStore(subscribe, getQuery, () => "");
  // ?eureka=2.2 plays an "I get it" moment 2.2 seconds after the page opens
  const [eurekaTick, setEurekaTick] = useState(0);
  useEffect(() => {
    const at = Number(new URLSearchParams(window.location.search).get("eureka") ?? 0);
    if (!at) return;
    const t = setTimeout(() => setEurekaTick(1), at * 1000);
    return () => clearTimeout(t);
  }, []);
  const q = new URLSearchParams(search);
  // ?style=little shows another age's world and Gloam
  const style = getAgeStyle(q.get("style") ?? "senior");
  const levels = (q.get("levels") ?? "0,0,0,0,0").split(",").map(Number);
  const firstUnlit = levels.findIndex((l) => l < 3);
  const stop = q.has("stop") ? Number(q.get("stop")) : firstUnlit === -1 ? levels.length : firstUnlit;
  const light = Number(q.get("light") ?? levels.reduce((a, b) => a + b, 0) / (levels.length * 3));
  if (!search) return null;
  return (
    <main data-age-style={style.id} className="relative h-dvh overflow-hidden bg-bg">
      <JourneyWorld
        world={style.look.world!}
        rig={style.look.rig!}
        mood={(q.get("mood") as GloamMood) ?? "curious"}
        typingTick={0}
        eurekaTick={eurekaTick}
        talking={false}
        waiting
        light={light}
        level={Number(q.get("level") ?? 1)}
        levels={levels}
        stop={stop}
        focus={Number(q.get("focus") ?? 0.42)}
        groundAt={Number(q.get("ground") ?? 0.62)}
        gloamHeight={Number(q.get("h") ?? 270)}
      />
    </main>
  );
}
