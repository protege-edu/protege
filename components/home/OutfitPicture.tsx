import type { WearColors } from "@/components/gloam/rig/outfit";
import type { OutfitId } from "@/lib/game/stash";

/**
 * A little drawing of an outfit for Gloam's stash, in the colours this age's Gloam wears it in (the same ones
 * the rig draws on it). Hand-drawn shapes, so they sit with the painted props instead of looking like icons.
 */
export function OutfitPicture({ id, c, className }: { id: OutfitId; c: WearColors; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      {id === "glasses" && (
        <g fill="none" stroke={c.frame} strokeWidth="3.2" strokeLinecap="round">
          <circle cx="20" cy="34" r="11" fill="rgb(255 255 255 / 0.12)" />
          <circle cx="44" cy="34" r="11" fill="rgb(255 255 255 / 0.12)" />
          <path d="M30.5 31.5 Q32 28.5 33.5 31.5" />
          <path d="M9.2 31 L3 27.5 M54.8 31 L61 27.5" />
          <path d="M13.5 30 A8 8 0 0 1 18.5 26" stroke="#fff" strokeOpacity="0.6" strokeWidth="2" />
          <path d="M37.5 30 A8 8 0 0 1 42.5 26" stroke="#fff" strokeOpacity="0.6" strokeWidth="2" />
        </g>
      )}
      {id === "scarf" && (
        <g>
          <path d="M6 20 Q32 30 58 20 L58 32 Q32 42 6 32 Z" fill={c.scarf} />
          <path d="M6 24 Q32 34 58 24 M6 28.5 Q32 38.5 58 28.5" fill="none" stroke={c.stripe} strokeWidth="2.2" />
          <path d="M38 33 L48 32 L52 56 L41 57 Z" fill={c.scarf} />
          <path d="M38 33 L48 32 L52 56 L41 57 Z" fill="#000" fillOpacity="0.12" />
          <path d="M39.6 42 L49.6 41 M40.4 47 L50.4 46" stroke={c.stripe} strokeWidth="2.2" />
          <path d="M42 57 v5 M45 57 v5 M48 56.6 v5 M51 56.2 v5" stroke={c.scarf} strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="43" cy="33" r="5.5" fill={c.scarf} />
          <circle cx="41.6" cy="31.6" r="2.2" fill="#fff" fillOpacity="0.15" />
        </g>
      )}
      {id === "beanie" && (
        <g>
          <path d="M10 44 Q8 18 32 14 Q56 18 54 44 Z" fill={c.hat} />
          <path d="M34 15 Q52 20 54 44 L40 44 Q44 26 34 15 Z" fill="#000" fillOpacity="0.16" />
          <path d="M18 42 Q16 26 26 19 M26 43 Q25 26 30 16 M38 43 Q39 26 34 16 M46 42 Q48 26 38 19" fill="none" stroke="#000" strokeOpacity="0.13" strokeWidth="1.4" />
          <path d="M7 41 Q32 47 57 41 L58 53 Q32 59 6 53 Z" fill={c.cuff} />
          <path d="M11 43 v11 M17 44 v11.5 M23 45 v12 M29 45.5 v12 M35 45.5 v12 M41 45 v12 M47 44 v11.5 M53 43 v11" stroke="#000" strokeOpacity="0.2" strokeWidth="1.3" />
          {c.pompom && (
            <g fill={c.pompom}>
              <circle cx="32" cy="11" r="6" />
              <circle cx="27.5" cy="10" r="3.6" />
              <circle cx="36.5" cy="10" r="3.6" />
              <circle cx="32" cy="6.5" r="3.6" />
            </g>
          )}
        </g>
      )}
      {id === "cape" && (
        <g>
          <path d="M22 10 L42 10 Q50 34 58 56 Q52 60 46 56 Q40 61 32 57 Q24 61 18 56 Q12 60 6 56 Q14 34 22 10 Z" fill={c.capeIn} stroke={c.cape} strokeWidth="3" strokeLinejoin="round" />
          <path d="M27 14 L19 54 M37 14 L45 54" stroke="#000" strokeOpacity="0.18" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M20 11 Q32 18 44 11" fill="none" stroke={c.cape} strokeWidth="3.4" strokeLinecap="round" />
          <circle cx="32" cy="15" r="2.6" fill={c.frame} />
        </g>
      )}
    </svg>
  );
}
