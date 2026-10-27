"use client";

import { InkButton } from "@/components/ui/InkButton";
import { Sheet } from "@/components/ui/Sheet";

/**
 * TEST MODE ONLY (npm run dev + ?test in the address): shortcuts to see every moment quickly.
 * Students never see this; a real build doesn't have it.
 */
export function TestPanel({ onNext, onAll, onDoze, disabled }: { onNext: () => void; onAll: () => void; onDoze: () => void; disabled: boolean }) {
  return (
    <div data-test-panel className="absolute bottom-4 left-4 z-30 w-[220px] max-md:bottom-auto max-md:top-20">
      <Sheet seed="test-panel" className="px-3 py-3">
        <p className="text-xs font-bold text-[var(--t-moon)]">Test mode</p>
        <p className="mt-0.5 text-xs text-ink-dim">Pasting works here. Only on your computer.</p>
        <div className="mt-2 flex flex-col items-stretch gap-1.5">
          <InkButton onClick={onNext} disabled={disabled} className="!min-h-9 !px-3 !text-xs">
            Teach the next idea now
          </InkButton>
          <InkButton variant="quiet" onClick={onAll} disabled={disabled} className="!min-h-9 !px-3 !text-xs">
            Teach everything (finale)
          </InkButton>
          <InkButton variant="ghost" onClick={onDoze} className="!min-h-9 !px-3 !text-xs">
            Make Gloam doze off
          </InkButton>
        </div>
      </Sheet>
    </div>
  );
}
