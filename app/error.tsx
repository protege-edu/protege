"use client";

import { Wordmark } from "@/components/ui/Logo";

/** Something broke on our side: never a raw error, just what happened and what to do */
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main data-age-style="senior" lang="en" className="flex min-h-dvh items-center bg-bg px-6 text-ink md:px-[8vw]">
      <div className="max-w-[46ch]">
        <p className="text-lg">
          <Wordmark tone="dark" />
        </p>
        <h1 className="mt-8 text-xl font-bold">Something went wrong on this page.</h1>
        <p className="mt-3 text-md text-ink-dim">It&apos;s not something you did. Nothing you taught Gloam is lost. Try again, and if it keeps happening, tell your teacher.</p>
        <div className="mt-8 flex flex-wrap gap-3 text-sm font-bold">
          <button type="button" onClick={reset} className="min-h-11 cursor-pointer rounded-md bg-accent px-5 text-accent-ink hover:bg-accent-hover">
            Try again
          </button>
          {/* a full page load on purpose: it clears whatever broke */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/" className="min-h-11 content-center rounded-md border border-line px-5 hover:bg-chip">
            Back to the start
          </a>
        </div>
      </div>
    </main>
  );
}
