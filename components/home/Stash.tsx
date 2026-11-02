"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { GloamBox } from "@/components/game/Stage";
import { InkButton } from "@/components/ui/InkButton";
import { Sheet } from "@/components/ui/Sheet";
import type { AgeStyle } from "@/lib/age-styles";
import { gameUi } from "@/lib/age-styles/game-ui";
import { MAX_OUT, OUTFIT_SHOP, STASH, stashArt, type OutfitId, type StashId } from "@/lib/game/stash";
import { outfitsFor, wearColors } from "@/components/gloam/rig/outfit";
import { OutfitPicture } from "./OutfitPicture";
import type { StashState } from "@/lib/student/stash";
import { useCalmMotion } from "@/lib/useCalmMotion";

const FIREFLY = "#d6ee8a";

/**
 * The things around Gloam's home: each one stands on the ground beside Gloam, where it belongs.
 * A new one drops in with a bounce (calm motion: it's just there). Ones that wouldn't fit on screen wait.
 */
export function Props({ placed, age, gloam, fresh, minX = 0 }: { placed: string[]; age: string; gloam: GloamBox | null; fresh: string | null; minX?: number }) {
  const calm = useCalmMotion();
  if (!gloam) return null;
  // packed outward from Gloam's sides, each on its favourite side if there's room (else the other), never
  // over the page's words (minX) or off the screen. Further out = a step back: a little smaller and higher.
  const gap = gloam.w * 0.06;
  let left = gloam.cx - gloam.w * 0.42;
  let right = gloam.cx + gloam.w * 0.42;
  // (the biggest prizes get the spots nearest Gloam; the small ones fit in at the edges)
  const spots: { s: (typeof STASH)[number]; h: number; cx: number; lift: number }[] = [];
  for (const s of [...STASH].filter((x) => placed.includes(x.id)).sort((a, b) => b.price - a.price)) {
    const sides: (-1 | 1)[] = s.side < 0 ? [-1, 1] : [1, -1];
    for (const side of sides) {
      const depth = side < 0 ? Math.max(0, (gloam.cx - left) / gloam.w - 0.6) : Math.max(0, (right - gloam.cx) / gloam.w - 0.6);
      const k = Math.max(0.7, 1 - depth * 0.18);
      const h = Math.round(gloam.h * s.size * k);
      const w = h * s.aspect;
      const x0 = side < 0 ? left - gap - w : right + gap;
      if (x0 < minX + 8 || x0 + w > gloam.stageW - 8) continue;
      if (side < 0) left = x0;
      else right = x0 + w;
      spots.push({ s, h, cx: x0 + w / 2, lift: Math.round((1 - k) * gloam.h * 0.25) });
      break;
    }
  }
  return (
    <>
      {spots.map(({ s, h, cx, lift }) => (
        <motion.img
          key={s.id}
          src={stashArt(s.id, age)}
          alt=""
          aria-hidden="true"
          draggable={false}
          className="pointer-events-none absolute z-[5] drop-shadow-[0_8px_6px_rgb(0_0_0/0.35)]"
          style={{ height: h, left: cx, top: gloam.top + gloam.h - h - lift, translateX: "-50%", transformOrigin: "50% 100%" }}
          initial={calm || fresh !== s.id ? false : { y: -260, opacity: 0 }}
          animate={{ y: 0, opacity: 1, scaleY: calm || fresh !== s.id ? 1 : [1, 0.86, 1.04, 1] }}
          // (the drop is a spring; the squash when it lands is timed to the landing)
          transition={{ y: { type: "spring", stiffness: 260, damping: 15 }, opacity: { duration: 0.2 }, scaleY: { duration: 0.55, delay: 0.25, times: [0, 0.35, 0.7, 1] } }}
        />
      ))}
    </>
  );
}

/** Gloam's stash: a drawer of painted things to get with fireflies, and to put out or away */
export function StashDrawer({ style, stash, onChange, onClose }: { style: AgeStyle; stash: StashState; onChange: (s: StashState, bought?: StashId | OutfitId) => void; onClose: () => void }) {
  const ui = gameUi(style.id, style.language);
  const calm = useCalmMotion();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    close.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      opener?.focus?.({ preventScroll: true });
    };
  }, [onClose]);
  // what this age's Gloam can wear, in the colours it wears them in
  const rig = style.look.rig;
  const colors = wearColors(rig);
  const canWear = rig ? outfitsFor(rig) : [];
  const send = async (body: object, bought?: StashId | OutfitId) => {
    setBusy(true);
    setProblem(null);
    const r = await fetch("/api/me/stash", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const j = r ? await r.json().catch(() => null) : null;
    setBusy(false);
    if (!r?.ok || !j?.stash) return setProblem(j?.error ?? "That didn't work. Check you're online and try again.");
    onChange(j.stash, bought);
  };
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="stash-title" className="fixed inset-0 z-40">
      <motion.div className="absolute inset-0 bg-black/40" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.div
        className="absolute inset-y-0 right-0 flex w-full flex-col p-3 min-[56rem]:w-[min(520px,44vw)]"
        initial={calm ? false : { x: 60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={calm ? undefined : { x: 60, opacity: 0 }}
        transition={{ type: "spring", stiffness: 160, damping: 22 }}
      >
        <Sheet seed="stash" tone="slate" radius={22} className="flex min-h-0 flex-1 flex-col">
          <div className="flex h-[calc(100dvh-24px)] flex-col">
          <div className="flex items-start justify-between gap-3 px-6 pt-6">
            <div>
              <h2 id="stash-title" className="voice text-xl text-ink">
                {ui.stashTitle}
              </h2>
              <p className="mt-1 flex items-center gap-2 text-sm font-bold text-ink">
                <span aria-hidden="true" className="size-2.5 rounded-full" style={{ background: FIREFLY, boxShadow: `0 0 8px ${FIREFLY}` }} />
                {ui.youHave(stash.jar)}
              </p>
            </div>
            <InkButton ref={close} variant="ghost" onClick={onClose}>
              {style.copy.close}
            </InkButton>
          </div>
          <p className="px-6 pt-2 text-sm text-ink-dim">{ui.stashIntro}</p>
          {problem && (
            <p role="alert" className="mx-6 mt-3 rounded-md border border-dashed border-line px-3 py-2 text-sm text-ink">
              {problem}
            </p>
          )}
          <div className="mt-4 flex-1 overflow-y-auto px-6 pb-6">
          {canWear.length > 0 && (
            <>
              <h3 className="text-md font-bold text-ink">{ui.wearTitle}</h3>
              <ul className="mt-2 mb-5 space-y-3">
                {OUTFIT_SHOP.filter((o) => canWear.includes(o.id)).map((o) => {
                  const owned = stash.owned.includes(o.id);
                  const on = stash.dressed.includes(o.id);
                  const short = o.price - stash.jar;
                  return (
                    <li key={o.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-line px-3 py-2">
                      <OutfitPicture id={o.id} c={colors} className="h-16 w-16 shrink-0" />
                      <div className="min-w-0 flex-[1_1_6rem]">
                        <p className="text-md font-bold text-ink">{ui.outfits[o.id]}</p>
                        {!owned && short > 0 && <p className="text-sm text-ink-dim">{ui.need(short)}</p>}
                      </div>
                      {owned ? (
                        <InkButton variant="quiet" className="ml-auto" disabled={busy} aria-pressed={on} onClick={() => void send({ wear: o.id, on: !on })}>
                          {on ? ui.takeOff : ui.putOn}
                        </InkButton>
                      ) : (
                        <InkButton className="ml-auto" disabled={busy || short > 0} onClick={() => void send({ buy: o.id }, o.id)}>
                          {ui.buy(o.price)}
                        </InkButton>
                      )}
                    </li>
                  );
                })}
              </ul>
              <h3 className="text-md font-bold text-ink">{ui.placeTitle}</h3>
            </>
          )}
          <ul className="mt-2 space-y-3">
            {STASH.map((s) => {
              const owned = stash.owned.includes(s.id);
              const out = stash.placed.includes(s.id);
              const short = s.price - stash.jar;
              const full = !out && stash.placed.length >= MAX_OUT;
              return (
                <li key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-line px-3 py-2">
                  {/* eslint-disable-next-line @next/next/no-img-element -- small local painted props, no optimisation needed */}
                  <img src={stashArt(s.id, style.id)} alt="" className="h-16 w-16 shrink-0 object-contain" />
                  <div className="min-w-0 flex-[1_1_6rem]">
                    <p className="text-md font-bold text-ink">{ui.stash[s.id]}</p>
                    {!owned && short > 0 && <p className="text-sm text-ink-dim">{ui.need(short)}</p>}
                    {owned && full && <p className="text-sm text-ink-dim">{ui.full}</p>}
                  </div>
                  {owned ? (
                    <InkButton variant="quiet" className="ml-auto" disabled={busy || full} onClick={() => void send({ place: s.id, on: !out })}>
                      {out ? ui.putAway : ui.putOut}
                    </InkButton>
                  ) : (
                    <InkButton className="ml-auto" disabled={busy || short > 0} onClick={() => void send({ buy: s.id }, s.id)}>
                      {ui.buy(s.price)}
                    </InkButton>
                  )}
                </li>
              );
            })}
          </ul>
          </div>
          </div>
        </Sheet>
      </motion.div>
    </div>
  );
}

