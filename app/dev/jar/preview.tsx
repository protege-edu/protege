"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { ClassJar, type ProjectorBoss } from "@/components/teacher/ClassJar";

/** ?boss=0.6 shows a class boss with that much fog left (?boss=0: beaten); "hit" thins it, like a student would */
export function JarPreview() {
  const q = useSearchParams();
  const total = Number(q.get("total") ?? 312);
  const now = 1_700_000_000_000;
  const moments = ["boss", "rival", "notebook", "recital"].map((kind, i) => ({ id: 10 - i, kind, at: now - i * 60_000 }));
  const start = q.get("boss");
  const [boss, setBoss] = useState<ProjectorBoss | null>(start === null ? null : { left: Number(start), beaten: Number(start) <= 0, on: Number(start) > 0, startedAt: now, helpers: 17 });
  return (
    <>
      <ClassJar
        total={total}
        moments={moments}
        className="Science 9, period 2"
        onClose={() => {}}
        boss={boss}
        bossName="The class Muddle"
        onBoss={async (a) => setBoss(a === "start" ? { left: 1, beaten: false, on: true, startedAt: Date.now(), helpers: 0 } : null)}
      />
      {boss?.on && (
        <button
          type="button"
          className="fixed bottom-2 left-2 z-[60] rounded bg-white px-2 text-xs text-black"
          onClick={() => setBoss((b) => b && { ...b, left: Math.max(0, b.left - 0.2), beaten: b.left - 0.2 <= 0, on: b.left - 0.2 > 0, helpers: b.helpers + 1 })}
        >
          hit
        </button>
      )}
    </>
  );
}
