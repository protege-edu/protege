"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState, type ReactNode } from "react";
import type { TeachSession } from "@/components/game/useTeachSession";
import { TypedLine } from "@/components/game/TypedLine";
import { InkButton } from "@/components/ui/InkButton";
import { Sheet } from "@/components/ui/Sheet";
import type { AgeStyle } from "@/lib/age-styles";
import { gameLines } from "@/lib/age-styles/game-lines";
import { gameUi } from "@/lib/age-styles/game-ui";
import type { EncounterView } from "@/lib/game/types";
import { useCalmMotion } from "@/lib/useCalmMotion";

/** The rival's own colour (its scarf), and the Muddle's smoke: nobody else uses them */
const CORVIN = "#b4472e";
const MUDDLE = "#36423d";

/**
 * A challenge (or the boss fight), just above where the student writes, kept small so Gloam stays the star.
 * Each one is its own thing in the world, not a generic panel:
 *   notebook  a moonlit page of Gloam's notes in its handwriting: tap the wrong line, fix it below
 *   rival     the rival's claim, on its colour
 *   what if   the twist, in Gloam's voice
 *   recital   Gloam presenting, slowly, with a big Stop! button
 *   order     Gloam's dropped paper cards, in a row: move them (buttons, keyboard), then the why
 *   boss      the Muddle's claim in its fog, and the patches of wrong ideas still left
 * Typing always goes in the ordinary box below; this card only holds what's different.
 */
export function EncounterCard({ s, style }: { s: TeachSession; style: AgeStyle }) {
  const e = s.encounter;
  const calm = useCalmMotion();
  const ui = gameUi(style.id, style.language);
  const g = gameLines(style.id, style.language);
  const busy = s.status !== "ready" || !!s.moment;
  if (!e) return null;
  const title =
    e.kind === "notebook" ? ui.notebookTitle : e.kind === "rival" ? g.rival : e.kind === "whatif" ? ui.whatifTitle : e.kind === "recital" ? ui.recitalTitle : e.kind === "order" ? ui.orderTitle : ui.bossTitle;
  const skip =
    e.kind !== "boss" ? (
      <InkButton variant="ghost" className="!min-h-9 !px-2 !text-xs" disabled={busy} onClick={() => s.act({ type: "skip" }, ui.skip)}>
        {ui.skip}
      </InkButton>
    ) : null;
  const paper = e.kind === "notebook" || e.kind === "order";

  return (
    <motion.section
      aria-label={title}
      data-encounter={e.kind}
      className={paper ? "paper" : undefined}
      initial={calm ? false : { opacity: 0, y: 16, rotate: paper ? -1.4 : 0 }}
      animate={{ opacity: 1, y: 0, rotate: paper ? -0.5 : 0 }}
      exit={calm ? undefined : { opacity: 0, y: 10, transition: { duration: 0.2 } }}
      transition={{ type: "spring", stiffness: 240, damping: 22 }}
    >
      <Sheet seed={`encounter-${e.kind}`} radius={paper ? 6 : 16} className="px-4 py-3 sm:px-5" style={e.kind === "boss" ? { ["--t-panel" as string]: MUDDLE } : undefined}>
        {e.kind === "rival" && <span aria-hidden="true" className="absolute inset-y-3 left-0 w-1 rounded-full" style={{ background: CORVIN }} />}
        <Body e={e} s={s} style={style} busy={busy} title={<h2 className="voice text-md font-bold">{title}</h2>} skip={skip} />
      </Sheet>
    </motion.section>
  );
}

function Header({ title, skip, children }: { title: ReactNode; skip: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
      {title}
      <span className="flex items-center gap-2">
        {children}
        {skip}
      </span>
    </div>
  );
}

function Body({ e, s, style, busy, title, skip }: { e: EncounterView; s: TeachSession; style: AgeStyle; busy: boolean; title: ReactNode; skip: ReactNode }) {
  const ui = gameUi(style.id, style.language);
  // the newest thing the rival or the Muddle said (they speak here: Gloam has the speech panel)
  const voiced = [...s.entries].reverse().find((x) => x.kind === "rival" || x.kind === "muddle");
  switch (e.kind) {
    case "notebook":
      return <Notebook e={e} s={s} style={style} busy={busy} title={title} skip={skip} />;
    case "rival":
      return (
        <div aria-live="polite">
          <Header title={title} skip={skip} />
          {voiced?.kind === "rival" && <p className="voice mt-1 text-md text-ink">{voiced.text}</p>}
          <p className="mt-1 text-xs text-ink-dim">{ui.rivalHint}</p>
        </div>
      );
    case "whatif":
      return (
        <div aria-live="polite">
          <Header title={title} skip={skip} />
          <p className="voice mt-1 text-md text-ink">{e.scenario}</p>
        </div>
      );
    case "recital":
      return <Recital e={e} s={s} style={style} busy={busy} title={title} skip={skip} />;
    case "order":
      return <Cards key={e.cards.join("|")} e={e} s={s} style={style} busy={busy} title={title} skip={skip} />;
    case "boss":
      return (
        <div aria-live="polite">
          <Header title={title} skip={null}>
            <Fog e={e} style={style} />
          </Header>
          {/* the wrong idea it's throwing right now always stays in view; its last reaction sits under it */}
          <p className="voice mt-1 text-md text-ink">&ldquo;{e.claim}&rdquo;</p>
          {voiced?.kind === "muddle" && !voiced.text.includes(e.claim.slice(0, 24)) && <p className="voice mt-1 text-sm italic text-ink-dim">{voiced.text}</p>}
        </div>
      );
  }
}

/** Gloam's notes: a ruled page in its handwriting. Tap the wrong line; a fine one gets defended, proudly. */
function Notebook({ e, s, style, busy, title, skip }: { e: Extract<EncounterView, { kind: "notebook" }>; s: TeachSession; style: AgeStyle; busy: boolean; title: ReactNode; skip: ReactNode }) {
  const calm = useCalmMotion();
  const ui = gameUi(style.id, style.language);
  const [tapped, setTapped] = useState<number | null>(null);
  // a line that was fine gives a little "no no, that one's right" wobble
  const wobble = s.gameEvent?.event === "wrongPick" ? s.gameEvent.key : 0;
  return (
    <div aria-live="polite">
      <Header title={title} skip={skip} />
      {e.phase === "spot" && <p className="text-xs text-ink-dim">{ui.notebookHint}</p>}
      <ul className="mt-1">
        {e.lines.map((line, i) => {
          const wrong = e.phase === "fix" && e.picked === i;
          const shake = !calm && tapped === i && wobble ? { x: [0, -6, 6, -4, 4, 0] } : undefined;
          const text = "voice block min-h-11 w-full px-2 py-2.5 text-left text-sm leading-snug";
          return (
            // (each line is ruled under its own text, so a line that wraps never has the rule through it)
            <li key={i} className="border-b border-[var(--t-line)]">
              {e.phase === "spot" ? (
                <motion.button
                  key={`${i}-${wobble}`}
                  type="button"
                  disabled={busy}
                  animate={shake}
                  transition={{ duration: 0.45 }}
                  onClick={() => {
                    setTapped(i);
                    s.act({ type: "pick", value: i }, ui.pickedSaid(line));
                  }}
                  className={`${text} cursor-pointer rounded-sm text-ink hover:bg-[rgb(0_0_0/0.05)] focus-visible:bg-[rgb(0_0_0/0.05)] disabled:cursor-default`}
                >
                  {line}
                </motion.button>
              ) : (
                <p className={`${text} ${wrong ? "text-ink-dim line-through decoration-2" : "text-ink"}`} style={wrong ? { textDecorationColor: CORVIN } : undefined}>
                  {line}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Gloam presents to the rival, slowly enough to catch it. Stop! is big: interrupting is the whole game. */
function Recital({ e, s, style, busy, title, skip }: { e: Extract<EncounterView, { kind: "recital" }>; s: TeachSession; style: AgeStyle; busy: boolean; title: ReactNode; skip: ReactNode }) {
  const ui = gameUi(style.id, style.language);
  return (
    <div>
      <Header title={title} skip={skip} />
      <div className="mt-1 flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <TypedLine text={e.speech} shape={8} animate={e.phase === "listen"} className="text-md text-ink" />
        </div>
        {e.phase === "listen" && (
          <InkButton size="lg" disabled={busy} onClick={() => s.act({ type: "stop" }, ui.stopSaid)}>
            {ui.stop}
          </InkButton>
        )}
      </div>
    </div>
  );
}

/** Gloam's dropped paper cards, in a row on a wide screen (a column on a phone). Buttons move them; then the why. */
function Cards({ e, s, style, busy, title, skip }: { e: Extract<EncounterView, { kind: "order" }>; s: TeachSession; style: AgeStyle; busy: boolean; title: ReactNode; skip: ReactNode }) {
  const calm = useCalmMotion();
  const ui = gameUi(style.id, style.language);
  // the student's order, as indexes into the cards as dealt (a new deal is a new list: the parent keys this by the cards)
  const [order, setOrder] = useState(() => e.cards.map((_, i) => i));
  const move = (k: number, by: -1 | 1) =>
    setOrder((o) => {
      const j = k + by;
      if (j < 0 || j >= o.length) return o;
      const next = [...o];
      [next[k], next[j]] = [next[j], next[k]];
      return next;
    });
  const settled = e.phase === "link";
  const shown = settled ? e.cards.map((_, i) => i) : order;
  return (
    <div>
      <Header title={title} skip={skip}>
        {!settled && (
          <InkButton disabled={busy} className="!min-h-9" onClick={() => s.act({ type: "order", value: order }, ui.orderSaid)}>
            {ui.orderDone}
          </InkButton>
        )}
      </Header>
      {!settled && <p className="text-xs text-ink-dim">{ui.orderHint}</p>}
      {/* one row of cards (on a phone it scrolls sideways, so Gloam stays in view) */}
      <ol className="-mx-1 mt-2 flex snap-x gap-2 overflow-x-auto px-1 pt-1 pb-2 [scrollbar-width:thin]">
        <AnimatePresence initial={false}>
          {shown.map((cardIndex, k) => (
            <motion.li
              key={e.cards[cardIndex]}
              layout={!calm}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              className="flex min-w-[8.5rem] flex-1 snap-start flex-col justify-between gap-1 rounded-[5px] border border-line bg-chip px-2.5 py-2 shadow-[0_2px_0_rgb(0_0_0/0.18)]"
              style={calm ? undefined : { rotate: `${((cardIndex * 37) % 5) - 2}deg` }}
            >
              <span className="voice text-sm leading-snug text-ink">
                <span className="mr-1 text-ink-dim">{k + 1}.</span>
                {e.cards[cardIndex]}
              </span>
              {!settled && (
                <span className="flex shrink-0 justify-end gap-1">
                  <InkButton variant="quiet" className="!min-h-9 !min-w-9 !px-0" aria-label={ui.moveUp(e.cards[cardIndex])} disabled={busy || k === 0} onClick={() => move(k, -1)}>
                    <span aria-hidden="true">←</span>
                  </InkButton>
                  <InkButton variant="quiet" className="!min-h-9 !min-w-9 !px-0" aria-label={ui.moveDown(e.cards[cardIndex])} disabled={busy || k === shown.length - 1} onClick={() => move(k, 1)}>
                    <span aria-hidden="true">→</span>
                  </InkButton>
                </span>
              )}
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>
    </div>
  );
}

/** The boss's wrong ideas, as patches of fog: each hit clears one (no health bar, no numbers on screen) */
function Fog({ e, style }: { e: Extract<EncounterView, { kind: "boss" }>; style: AgeStyle }) {
  const calm = useCalmMotion();
  const ui = gameUi(style.id, style.language);
  return (
    <span role="img" aria-label={ui.bossRounds(e.round, e.rounds)} className="flex shrink-0 gap-1.5">
      {Array.from({ length: e.rounds }, (_, i) => (
        <motion.span
          key={i}
          className="block size-3.5 rounded-full"
          style={{ background: i < e.round ? "transparent" : "var(--t-ink-dim)", boxShadow: i < e.round ? "inset 0 0 0 1.5px var(--t-line)" : "none" }}
          animate={calm ? undefined : i === e.round ? { scale: [1, 1.18, 1] } : { scale: 1 }}
          transition={i === e.round ? { duration: 2.4, repeat: Infinity, ease: "easeInOut" } : undefined}
        />
      ))}
    </span>
  );
}
