"use client";

import { InkButton } from "@/components/ui/InkButton";
import { Sheet } from "@/components/ui/Sheet";
import { TrailStrip } from "@/components/ui/TrailStrip";
import { Wordmark } from "@/components/ui/Wordmark";
import { TypedLine } from "@/components/game/TypedLine";

const SWATCHES = [
  ["night moss", "#0d1613"],
  ["valley teal", "#2c4844"],
  ["moonmist", "#d3ddd6"],
  ["moonlight", "#8ec5dc"],
  ["gloam", "var(--t-accent)"],
  ["lantern gold (understanding only)", "#f4b740"],
];

export function StyleTile() {
  return (
    <main data-age-style="senior" className="min-h-dvh bg-bg p-10 text-ink" style={{ backgroundImage: "linear-gradient(rgb(13 22 19 / 0.82), rgb(13 22 19 / 0.82)), url(/art/senior/valley-1-dark.webp)", backgroundSize: "cover" }}>
      <div className="flex flex-wrap items-end gap-12">
        <Wordmark className="text-3xl text-ink" />
        <Wordmark lit={1} className="text-3xl text-ink" />
        <TrailStrip total={5} lit={2} current={2} label="Checkpoint 3 of 5" />
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        {SWATCHES.map(([n, c]) => (
          <div key={n} className="w-40">
            <div className="h-12 rounded-md border border-line" style={{ background: c }} />
            <p className="mt-1 text-xs text-ink-dim">{n}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-4">
        <InkButton size="lg">Start teaching</InkButton>
        <InkButton>Teach</InkButton>
        <InkButton variant="quiet">How this works</InkButton>
        <InkButton variant="ghost">Skip intro</InkButton>
        <InkButton disabled>Teach</InkButton>
      </div>

      <div className="mt-10 grid grid-cols-2 gap-10">
        <Sheet seed="speech" className="max-w-[460px] px-6 py-5" tailTo={{ x: -40, y: 30 }}>
          <span className="voice text-xs text-accent">gloam</span>
          <TypedLine text="so the earth leans. and it just... keeps leaning. all year?" shape={60} animate={false} className="mt-1 text-md text-ink" />
        </Sheet>
        <Sheet seed="pause" className="max-w-[360px] px-6 py-6">
          <p className="voice text-lg">paused</p>
          <div className="mt-4 flex flex-col items-start gap-2">
            <InkButton>Resume</InkButton>
            <InkButton variant="ghost">Trail map</InkButton>
            <InkButton variant="ghost">Gloam&apos;s journal</InkButton>
          </div>
        </Sheet>
      </div>

      <Sheet seed="notebook" tone="slate" radius={16} className="mt-12 max-w-[880px] px-5 py-3">
        <div className="flex items-end gap-3">
          <textarea rows={1} placeholder="Explain it to Gloam…" className="min-h-11 flex-1 resize-none bg-transparent py-2.5 text-sm text-ink placeholder:text-ink-dim focus:outline-none" />
          <InkButton>Teach</InkButton>
        </div>
      </Sheet>
      <div className="mt-6 space-y-2">
        <TypedLine text="fine. FINE. you're right. i hate this." shape={-30} animate={false} className="text-md" />
        <TypedLine text="wait wait wait. say that again." shape={100} animate={false} className="text-md" />
      </div>
    </main>
  );
}
