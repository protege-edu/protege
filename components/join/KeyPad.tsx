"use client";

import { AnimatePresence, motion } from "motion/react";
import { Cut } from "@/components/ui/Cut";
import type { JoinCopy } from "@/lib/age-styles/types";
import { PICTURES, type Picture } from "@/lib/student/pictures";
import { useCalmMotion } from "@/lib/useCalmMotion";

export const pictureSrc = (p: Picture) => `/art/keys/${p}.webp`;

/**
 * The secret-picture key: a row of slots, and nine painted pictures to tap in order.
 *   reveal: show the pictures in the slots (picking a NEW key, so you can remember it).
 *           Off when signing back in: the slots only fill with dots, so nobody behind you learns your key.
 *   shake:  goes up by one on a wrong key (the slots shake and empty)
 */
export function KeyPad({
  size,
  picked,
  onPick,
  reveal,
  big = false,
  disabled = false,
  shake = 0,
  countLabel,
  t,
}: {
  size: number;
  picked: Picture[];
  onPick: (p: Picture) => void;
  reveal: boolean;
  big?: boolean;
  disabled?: boolean;
  shake?: number;
  countLabel: string;
  /** the words (picture names for screen readers) in the class's language */
  t: JoinCopy;
}) {
  const calm = useCalmMotion();
  const tile = big ? 92 : 78;
  return (
    <div>
      <motion.div
        key={shake}
        className="flex items-center gap-3"
        animate={shake && !calm ? { x: [0, -10, 9, -6, 4, 0] } : undefined}
        transition={{ duration: 0.45 }}
        aria-live="polite"
      >
        {Array.from({ length: size }, (_, i) => (
          <Slot key={i} picture={picked[i]} reveal={reveal} size={big ? 64 : 54} index={i} t={t} />
        ))}
        <span className="ml-1 text-sm font-bold text-ink-dim">{countLabel}</span>
      </motion.div>

      <div role="group" aria-label={t.pictureGroup} className="mt-4 grid w-max grid-cols-3 gap-2.5">
        {PICTURES.map((p, i) => (
          <motion.button
            key={p}
            type="button"
            disabled={disabled || picked.length >= size}
            onClick={() => onPick(p)}
            aria-label={t.pictures[p]}
            whileTap={calm ? undefined : { scale: 0.9, rotate: i % 2 ? 3 : -3 }}
            className="key-tile relative grid cursor-pointer place-items-center rounded-[14px] disabled:cursor-default"
            style={{ width: tile, height: tile }}
          >
            <Cut w={tile} h={tile} seed={`key-${p}`} radius={14} wobble={1.4} fill="var(--t-panel-2, var(--t-panel))" stroke="var(--t-line)" depth={4} depthFill="rgb(0 0 0 / 0.35)" />
            {/* a soft pool of light behind each picture, so dark ones (the iron lantern) still stand out */}
            <span aria-hidden="true" className="absolute inset-[12%] z-[1] rounded-full bg-[radial-gradient(circle,rgb(255_255_255/0.14),transparent_70%)]" />
            {/* eslint-disable-next-line @next/next/no-img-element -- small local painted icons, no optimisation needed */}
            <img src={pictureSrc(p)} alt="" draggable={false} className="relative z-[2] h-[86%] w-[86%] object-contain select-none" />
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function Slot({ picture, reveal, size, index, t }: { picture?: Picture; reveal: boolean; size: number; index: number; t: JoinCopy }) {
  const calm = useCalmMotion();
  return (
    <span className="relative grid place-items-center" style={{ width: size, height: size }}>
      <Cut w={size} h={size} seed={`slot-${index}`} radius={12} wobble={1.2} fill={picture ? "var(--t-panel)" : "transparent"} stroke="var(--t-line)" strokeWidth={picture ? 1.5 : 1.2} />
      <AnimatePresence>
        {picture && (
          <motion.span
            key={picture + index}
            className="relative z-[1] grid h-full w-full place-items-center"
            initial={calm ? false : { scale: 0.3, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={calm ? undefined : { scale: 0.5, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 20 }}
          >
            {reveal ? (
              // eslint-disable-next-line @next/next/no-img-element -- small local painted icons
              <img src={pictureSrc(picture)} alt={t.pictures[picture]} className="h-[84%] w-[84%] object-contain" />
            ) : (
              <span className="block h-3.5 w-3.5 rounded-full bg-ink" aria-label={t.slotPicked} />
            )}
          </motion.span>
        )}
      </AnimatePresence>
      {!picture && <span className="sr-only">{t.slotEmpty}</span>}
    </span>
  );
}

/** The key shown big, to remember (right after picking it) */
export function KeyShow({ picture, big, t }: { picture: Picture[]; big?: boolean; t: JoinCopy }) {
  const calm = useCalmMotion();
  const size = big ? 104 : 92;
  return (
    <ol className="flex gap-4" aria-label={t.pictureOrder}>
      {picture.map((p, i) => (
        <motion.li
          key={i}
          className="relative grid place-items-center"
          style={{ width: size, height: size }}
          initial={calm ? false : { opacity: 0, y: 18, rotate: i % 2 ? 6 : -6 }}
          animate={{ opacity: 1, y: 0, rotate: i % 2 ? 2 : -2 }}
          transition={{ delay: 0.15 + i * 0.22, type: "spring", stiffness: 260, damping: 18 }}
        >
          <Cut w={size} h={size} seed={`show-${i}`} radius={16} wobble={1.6} fill="var(--t-panel-2, var(--t-panel))" stroke="var(--t-line)" depth={5} depthFill="rgb(0 0 0 / 0.35)" />
          {/* eslint-disable-next-line @next/next/no-img-element -- small local painted icons */}
          <img src={pictureSrc(p)} alt={t.pictures[p]} className="relative z-[1] h-[84%] w-[84%] object-contain" />
          <span className="absolute -bottom-6 text-sm font-bold text-ink-dim" aria-hidden="true">
            {i + 1}
          </span>
        </motion.li>
      ))}
    </ol>
  );
}
