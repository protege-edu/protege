"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { NightValley } from "@/components/scene/NightValley";

function Frame() {
  const b = Number(useSearchParams().get("b") ?? 0);
  return (
    <div style={{ position: "fixed", inset: 0, background: "#050b09" }}>
      <NightValley brightness={b} cx={0.5} />
    </div>
  );
}

export function ValleyFrame() {
  return (
    <Suspense>
      <Frame />
    </Suspense>
  );
}
