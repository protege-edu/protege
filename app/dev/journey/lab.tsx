"use client";

import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";
import type { GloamMood } from "@/components/gloam/poses";
import { senior } from "@/lib/age-styles/senior";

const JourneyWorld = dynamic(() => import("@/components/cinema/JourneyWorld").then((m) => m.JourneyWorld), { ssr: false });

const subscribe = () => () => {};
const getQuery = () => window.location.search;

export function JourneyLab() {
  const search = useSyncExternalStore(subscribe, getQuery, () => "");
  const q = new URLSearchParams(search);
  const levels = (q.get("levels") ?? "0,0,0,0,0").split(",").map(Number);
  const firstUnlit = levels.findIndex((l) => l < 3);
  const stop = q.has("stop") ? Number(q.get("stop")) : firstUnlit === -1 ? levels.length : firstUnlit;
  const light = Number(q.get("light") ?? levels.reduce((a, b) => a + b, 0) / (levels.length * 3));
  if (!search) return null;
  return (
    <main data-age-style="senior" className="relative h-dvh overflow-hidden bg-bg">
      <JourneyWorld
        world={senior.look.world!}
        rig={senior.look.rig!}
        mood={(q.get("mood") as GloamMood) ?? "curious"}
        typingTick={0}
        eurekaTick={0}
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
