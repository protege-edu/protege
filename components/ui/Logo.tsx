/**
 * Protégé's logo: Gloam's face. A round rust-orange felt creature, unimpressed, half-lidded,
 * with its stalk curling over to a paper lantern. The lantern is pale paper (not gold: gold only
 * ever means understanding). Works from a browser tab (16 px) up to the title screen.
 *
 * tone="dark" for dark backgrounds (moonlit stalk), "light" for paper backgrounds (ink stalk).
 */
const RUST = "#e2661d";
const RUST_DEEP = "#b34a17";
const CREAM = "#f6e7c8";
const INK = "#16302a";
const MOON = "#d3ddd6";

export function LogoMark({ tone = "dark", className = "", title }: { tone?: "dark" | "light"; className?: string; title?: string }) {
  const line = tone === "dark" ? MOON : INK;
  return (
    <svg viewBox="0 0 64 64" className={className} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      {/* stalk: up out of the head, curling over to the lantern, one leaf */}
      <path d="M35 26 C 34.5 17, 28 9.5, 19.5 10.5 C 14.5 11.2, 13.4 15, 14.6 17.6" fill="none" stroke={line} strokeWidth="3.1" strokeLinecap="round" />
      <path d="M31.4 15.6 c 2.6 -3.4 6.6 -3.9 8.6 -2.4 c -1.6 2.7 -5.4 3.8 -8.6 2.4 z" fill="#6f8f4a" />
      {/* the paper lantern: caps, ribs, pale paper */}
      <rect x="11.4" y="17.6" width="7" height="2.4" rx="0.9" fill={line} />
      <ellipse cx="14.9" cy="25.4" rx="6.6" ry="6" fill={CREAM} stroke={line} strokeWidth="2" />
      <path d="M14.9 19.6 C 12.4 22, 12.4 28.8, 14.9 31.2 M14.9 19.6 C 17.4 22, 17.4 28.8, 14.9 31.2" fill="none" stroke={RUST} strokeWidth="1" opacity="0.55" />
      <rect x="12.1" y="30.6" width="5.6" height="2.1" rx="0.8" fill={line} />
      {/* body */}
      <path d="M34 25 C 46 25, 55 33, 55 43.5 C 55 54, 45.5 59.5, 34 59.5 C 22.5 59.5, 13 54, 13 43.5 C 13 33, 22 25, 34 25 Z" fill={RUST} />
      <path d="M13.6 47 C 16 55, 24.5 59.5, 34 59.5 C 43.5 59.5, 52 55, 54.4 47 C 50 52.5, 42.5 55, 34 55 C 25.5 55, 18 52.5, 13.6 47 Z" fill={RUST_DEEP} opacity="0.7" />
      {/* muzzle */}
      <ellipse cx="34" cy="47.6" rx="10.6" ry="7.6" fill={CREAM} />
      {/* unimpressed eyes: lids halfway down */}
      {[26.9, 41.1].map((x) => (
        <g key={x}>
          <ellipse cx={x} cy="39.6" rx="4.6" ry="4.2" fill={CREAM} />
          <circle cx={x + 0.4} cy="40.6" r="2.7" fill={INK} />
          <circle cx={x - 0.5} cy="41.2" r="0.8" fill="#fff" />
          {/* the lid: Gloam's own orange, halfway down, with a dark lash line */}
          <path d={`M${x - 5.2} 39.1 A 4.9 4.6 0 0 1 ${x + 5.2} 39.1 Z`} fill={RUST} />
          <path d={`M${x - 4.8} 39.1 H ${x + 4.8}`} stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
        </g>
      ))}
      {/* a flat little mouth */}
      <path d="M31 47.3 q 3 1.1 6 0" fill="none" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/** The full logo: Gloam's face + "protégé" in Gloam's handwriting (Recursive, casual) */
export function Wordmark({ tone = "dark", className = "", mark = true }: { tone?: "dark" | "light"; className?: string; mark?: boolean }) {
  return (
    <span className={`voice inline-flex items-center gap-[0.18em] leading-none ${className}`} style={{ ["--casual" as string]: 1, ["--voice-weight" as string]: 800 }} role="img" aria-label="Protégé" data-brand>
      {mark && <LogoMark tone={tone} className="h-[1.25em] w-[1.25em] shrink-0 translate-y-[0.04em]" />}
      <span aria-hidden="true">protégé</span>
    </span>
  );
}
