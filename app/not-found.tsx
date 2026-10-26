import Link from "next/link";
import { Wordmark } from "@/components/ui/Logo";

/** A link that leads nowhere: say so plainly, and offer the two ways back */
export default function NotFound() {
  return (
    <main data-age-style="senior" lang="en" className="relative flex min-h-dvh items-center overflow-hidden bg-bg px-6 text-ink md:px-[8vw]">
      {/* the night valley, unlit: nobody's teaching here */}
      <div aria-hidden="true" className="absolute inset-0 bg-[url(/art/senior/journey-map-dark.webp)] bg-cover bg-center opacity-60" />
      <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(90deg,rgb(var(--t-scrim)/0.95)_0%,rgb(var(--t-scrim)/0.8)_45%,rgb(var(--t-scrim)/0.35)_100%)]" />
      <div className="relative max-w-[44ch]">
        <p className="text-lg">
          <Wordmark tone="dark" />
        </p>
        <h1 className="mt-8 text-xl font-bold">There&apos;s nothing at this address.</h1>
        <p className="mt-3 text-md text-ink-dim">The link might have a typo, or the lesson it pointed to was taken down. Check the address, or start again from one of these.</p>
        <div className="mt-8 flex flex-wrap gap-3 text-sm font-bold">
          <Link href="/join" className="min-h-11 content-center rounded-md bg-accent px-5 text-accent-ink hover:bg-accent-hover">
            Join your class
          </Link>
          <Link href="/teacher" className="min-h-11 content-center rounded-md border border-line px-5 hover:bg-chip">
            Teacher home
          </Link>
        </div>
      </div>
    </main>
  );
}
