import { notFound } from "next/navigation";
import { LogoMark, Wordmark } from "@/components/ui/Logo";

/** Development only: the Protégé logo in every form, on night and on paper, big and tiny. */
export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main className="grid min-h-dvh grid-cols-2">
      <section data-age-style="senior" className="flex flex-col items-start gap-10 p-12" style={{ background: "#0d1613", color: "#d3ddd6" }}>
        <Wordmark tone="dark" className="text-[5rem]" />
        <Wordmark tone="dark" className="text-2xl" />
        <div className="flex items-end gap-6">
          <LogoMark tone="dark" className="h-32 w-32" />
          <LogoMark tone="dark" className="h-12 w-12" />
          <LogoMark tone="dark" className="h-6 w-6" />
          {/* the browser-tab icon */}
          <img src="/icon.svg" alt="" className="h-8 w-8" />
          <img src="/icon.svg" alt="" className="h-4 w-4" />
        </div>
      </section>
      <section data-theme="teacher" className="flex flex-col items-start gap-10 p-12" style={{ background: "#e7ece5", color: "#16302a" }}>
        <Wordmark tone="light" className="text-[5rem]" />
        <Wordmark tone="light" className="text-2xl" />
        <div className="flex items-end gap-6">
          <LogoMark tone="light" className="h-32 w-32" />
          <LogoMark tone="light" className="h-12 w-12" />
          <LogoMark tone="light" className="h-6 w-6" />
        </div>
      </section>
    </main>
  );
}
