"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Stage } from "@/components/game/Stage";
import type { GloamMood } from "@/components/gloam/poses";
import { getAgeStyle } from "@/lib/age-styles";
import { seasons } from "@/lib/lesson/seasons";
import type { Level } from "@/lib/lesson/types";

function Preview() {
  const q = useSearchParams();
  const b = Number(q.get("b") ?? 0);
  const style = getAgeStyle(q.get("style") ?? "senior");
  const mood = (q.get("mood") ?? "proud") as GloamMood;
  const lit = Math.round(b * seasons.concepts.length * 3);
  const understanding = Object.fromEntries(seasons.concepts.map((c, i) => [c.id, Math.max(0, Math.min(3, lit - i * 3)) as Level]));
  return (
    <div data-age-style={style.id} className="relative h-dvh">
      <Stage
        style={style}
        mood={mood}
        brightness={b}
        concepts={seasons.concepts}
        understanding={understanding}
        flash={null}
        typingTick={0}
        eurekaTick={Number(q.get("eureka") ?? 0)}
        focus={Number(q.get("focus") ?? 0.5)}
        groundAt={Number(q.get("ground") ?? 0.6)}
        showCandles
      />
    </div>
  );
}

export function StagePreview() {
  return (
    <Suspense>
      <Preview />
    </Suspense>
  );
}
