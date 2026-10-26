"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { TravelQuip } from "@/components/game/JourneyMoments";
import { Stage, type GloamBox } from "@/components/game/Stage";
import { InkButton } from "@/components/ui/InkButton";
import { Sheet } from "@/components/ui/Sheet";
import { Wordmark } from "@/components/ui/Logo";
import { getAgeStyle, type AgeStyleId } from "@/lib/age-styles";
import type { StudentHome as Home } from "@/lib/student/home";
import { useCalmMotion } from "@/lib/useCalmMotion";

/**
 * "Your Gloam": the student's home in their class. Gloam stands in the valley at its level
 * (its lantern grows with everything this student has taught it, and it shows off its tricks when idle),
 * the lessons their teacher gave them, and Gloam's journal of every idea they've taught it, all year.
 */
export function StudentHome({ home }: { home: Home }) {
  const style = getAgeStyle(home.ageStyle as AgeStyleId, home.language);
  const t = style.copy.home;
  const calm = useCalmMotion();
  const router = useRouter();
  const [gloamBox, setGloamBox] = useState<GloamBox | null>(null);
  const [wide, setWide] = useState(true);
  const [journal, setJournal] = useState(false);
  const [line, setLine] = useState<string | null>(null);
  const level = home.gloam.level;
  const taught = home.journal.reduce((n, j) => n + j.ideas.length, 0);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setWide(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Gloam says hello (picked by level, so it changes as Gloam grows), then goes quiet
  useEffect(() => {
    const hellos = t.hello(home.nickname);
    const show = setTimeout(() => setLine(home.paused ? null : hellos[level % hellos.length]), calm ? 0 : 1200);
    const hide = setTimeout(() => setLine(null), 7000);
    if (!home.metGloam) void fetch("/api/me", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ metGloam: true }) });
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [t, home.nickname, home.paused, home.metGloam, level, calm]);

  const signOut = async () => {
    await fetch("/api/me", { method: "DELETE" });
    window.location.replace("/join");
  };

  return (
    <div data-age-style={style.id} className="relative h-dvh overflow-hidden bg-bg text-ink">
      <div className="absolute inset-0">
        <Stage
          style={style}
          mood={home.paused ? "asleep" : "curious"}
          // the lantern only ever shows understanding: it glows with what this student has taught it
          brightness={taught ? Math.min(0.9, 0.25 + level * 0.08) : 0}
          concepts={[]}
          understanding={{}}
          flash={null}
          typingTick={0}
          eurekaTick={0}
          focus={wide ? 0.74 : 0.5}
          groundAt={wide ? 0.8 : 0.36}
          gloamScale={wide ? 0.9 : 0.5}
          showCandles={false}
          onGloamBox={setGloamBox}
          journey={{ talking: !!line, waiting: !home.paused, level, levels: [], stop: 0 }}
        >
          <TravelQuip text={line} gloam={gloamBox} />
        </Stage>
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgb(var(--t-scrim)/0.92)_0%,rgb(var(--t-scrim)/0.75)_42%,transparent_66%)] max-md:bg-[linear-gradient(0deg,rgb(var(--t-scrim)/0.96)_0%,rgb(var(--t-scrim)/0.85)_60%,transparent_80%)]" />

      <header className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 py-3 md:px-[5vw]">
        <span className="text-lg text-ink">
          <Wordmark tone={style.look.tone} mark={false} />
        </span>
        <InkButton variant="ghost" onClick={() => void signOut()}>
          {t.signOut}
        </InkButton>
      </header>

      <main className="relative flex h-full flex-col justify-end overflow-y-auto px-5 pt-20 pb-6 md:w-[min(620px,52vw)] md:justify-center md:px-[5vw] md:pb-0">
        <motion.div initial={calm ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
          <p className="text-sm font-bold text-ink-dim">{home.className}</p>
          <h1 className="mt-1 text-xl font-bold text-ink md:text-2xl">{t.title(home.nickname)}</h1>
          <p className="voice mt-2 text-md text-ink" style={{ ["--casual" as string]: 1, ["--slant" as string]: -6 }}>
            {t.level(level)}
          </p>
          <p className="mt-1 max-w-[44ch] text-sm text-ink-dim">{t.levelHint}</p>

          {home.paused && (
            <p role="status" className="mt-5 max-w-[44ch] rounded-md border border-dashed border-line px-4 py-3 text-sm font-bold text-ink">
              {t.paused}
            </p>
          )}

          <section aria-labelledby="lessons-title" className="mt-7">
            <h2 id="lessons-title" className="text-md font-bold text-ink">
              {t.lessonsTitle}
            </h2>
            {home.lessons.length === 0 ? (
              <p className="mt-2 max-w-[44ch] text-sm text-ink-dim">{t.noLessons}</p>
            ) : (
              <ul className="mt-2 divide-y divide-dashed divide-line border-y border-dashed border-line">
                {home.lessons.map((l) => (
                  <li key={l.id} className="flex flex-wrap items-center gap-x-5 gap-y-2 py-3">
                    <div className="min-w-48 flex-1">
                      <p className="text-md font-bold text-ink">{l.title}</p>
                      <div className="mt-1 flex items-center gap-3">
                        <Wicks lit={l.lit} total={l.ideas} />
                        <span className="text-sm text-ink-dim">{!l.started ? t.lessonNew : l.finished ? t.lessonDone : t.lessonProgress(l.lit, l.ideas)}</span>
                      </div>
                    </div>
                    {home.paused ? null : (
                      <InkButton variant={l.finished ? "quiet" : "primary"} onClick={() => router.push(`/play/${encodeURIComponent(l.id)}`)}>
                        {!l.started ? t.start : l.finished ? t.visit : t.keepGoing}
                      </InkButton>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="tricks-title" className="mt-6">
            <h2 id="tricks-title" className="text-md font-bold text-ink">
              {t.tricksTitle}
            </h2>
            {home.gloam.tricks.length ? (
              <ul className="mt-2 flex flex-wrap gap-2">
                {home.gloam.tricks.map((k) => (
                  <li key={k} className="voice rounded-full border border-line px-3 py-1 text-sm text-ink" style={{ ["--casual" as string]: 1 }}>
                    {t.trickNames[k]}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 max-w-[44ch] text-sm text-ink-dim">{t.noTricks}</p>
            )}
          </section>

          <div className="mt-6">
            <InkButton variant="quiet" onClick={() => setJournal(true)}>
              {t.journalTitle}
            </InkButton>
          </div>
        </motion.div>
      </main>

      <AnimatePresence>{journal && <Journal key="journal" home={home} onClose={() => setJournal(false)} />}</AnimatePresence>
    </div>
  );
}

/** One small candle per idea in a lesson: lit ones glow (gold = understanding), the rest wait */
function Wicks({ lit, total }: { lit: number; total: number }) {
  return (
    <span className="flex items-end gap-1" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <svg key={i} viewBox="0 0 10 18" width="9" height="16">
          {i < lit && <path d="M5 1 C 7.4 4 7.6 5.6 6.8 7 C 6.2 8 3.8 8 3.2 7 C 2.4 5.6 2.6 4 5 1 Z" fill="var(--color-lantern)" />}
          <rect x="3" y="8" width="4" height="9" rx="1" fill={i < lit ? "#efe4c8" : "var(--t-line)"} />
        </svg>
      ))}
    </span>
  );
}

/** Gloam's journal: every idea this student has taught it, newest lesson first, in the blueprint's own words */
function Journal({ home, onClose }: { home: Home; onClose: () => void }) {
  const style = getAgeStyle(home.ageStyle as AgeStyleId, home.language);
  const t = style.copy.home;
  const calm = useCalmMotion();
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
  return (
    <motion.div className="fixed inset-0 z-30" role="dialog" aria-modal="true" aria-labelledby="journal-title">
      <motion.div className="absolute inset-0 bg-black/40" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.section
        className="absolute inset-y-0 right-0 flex w-full flex-col p-3 md:w-[min(520px,44vw)]"
        initial={calm ? false : { x: 60, opacity: 0, rotate: 1.5 }}
        animate={{ x: 0, opacity: 1, rotate: 0 }}
        exit={calm ? undefined : { x: 40, opacity: 0, transition: { duration: 0.2 } }}
        transition={{ type: "spring", stiffness: 140, damping: 20 }}
      >
        <Sheet seed="home-journal" tone="slate" radius={22} className="flex min-h-0 flex-1 flex-col">
          <div className="flex h-[calc(100dvh-24px)] flex-col">
            <div className="flex-1 overflow-y-auto bg-[repeating-linear-gradient(180deg,transparent_0,transparent_31px,rgb(211_221_214/0.07)_31px,rgb(211_221_214/0.07)_32px)] px-6 pt-8 pb-4 md:px-8">
              <h2 id="journal-title" className="voice text-xl text-ink" style={{ ["--casual" as string]: 1, ["--voice-weight" as string]: 800, ["--slant" as string]: -4 }}>
                {style.voice.lowercase ? t.journalTitle.toLowerCase() : t.journalTitle}
              </h2>
              {home.journal.length === 0 && <p className="mt-4 text-sm text-ink-dim">{t.journalEmpty}</p>}
              {home.journal.map((j) => (
                <div key={j.lesson} className="mt-7">
                  <h3 className="text-sm font-bold text-ink-dim">{j.lesson}</h3>
                  <ul className="mt-3 space-y-4">
                    {j.ideas.map((idea) => (
                      <li key={idea.name} className="flex gap-3">
                        <Wicks lit={1} total={1} />
                        <span>
                          <span className="block text-sm font-bold text-ink">{idea.name}</span>
                          <span className="text-sm text-ink-dim">{idea.recap}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="border-t border-dashed border-line px-6 py-4 md:px-8">
              <InkButton ref={close} onClick={onClose}>
                {style.copy.close}
              </InkButton>
            </div>
          </div>
        </Sheet>
      </motion.section>
    </motion.div>
  );
}
