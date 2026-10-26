"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { EurekaMoment } from "@/components/scene/EurekaMoment";
import { getAgeStyle, pickLine } from "@/lib/age-styles";
import { useCalmMotion } from "@/lib/useCalmMotion";
import type { ClientLesson } from "@/lib/lesson/types";
import { DialogueBand, IntroBand } from "./DialogueBand";
import { EndingPanel, HelpDialog, LogDrawer, PauseMenu, StoryCaption, TitleScreen, TopBar } from "./Overlays";
import { ChapterCard, LevelUpCard, TravelQuip } from "./JourneyMoments";
import { Stage, type GloamBox } from "./Stage";
import { useTeachSession } from "./useTeachSession";

type Overlay = null | "pause" | "help" | "log";

const WIDE = "(min-width: 56rem)";
function useWide() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(WIDE);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(WIDE).matches,
    () => true,
  );
}

/**
 * The whole game: title → intro → teaching → ending, plus pause, help and the conversation log.
 * Everything visual and every word comes from the lesson's age style.
 */
export function GameScreen({ lesson }: { lesson: ClientLesson }) {
  const style = getAgeStyle(lesson.ageStyle);
  const s = useTeachSession(lesson, style);
  const wide = useWide();
  const calm = useCalmMotion();
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [caption, setCaption] = useState<string | null>(null);
  const [gloamBox, setGloamBox] = useState<GloamBox | null>(null);
  const litCount = lesson.concepts.filter((c) => s.shown[c.id] === 3).length;

  // ---- the adventure ----
  const world = style.look.world;
  // one shrine per idea, in lesson order. Gloam waits at the first idea it doesn't get yet,
  // and only sets off for it once the "I get it" moment has played
  const levels = lesson.concepts.map((c) => s.shown[c.id] ?? 0);
  const firstUnlit = levels.findIndex((l) => l < 3);
  const nextStop = firstUnlit === -1 ? levels.length : firstUnlit;
  const [walkLit, setWalkLit] = useState(nextStop);
  useEffect(() => {
    if (s.moment) return;
    const t = setTimeout(() => setWalkLit(nextStop), 0);
    return () => clearTimeout(t);
  }, [nextStop, s.moment]);
  const [quip, setQuip] = useState<string | null>(null);
  // the finale: Gloam walks to the overlook first, then the journal opens
  const [finaleArrived, setFinaleArrived] = useState(false);
  const walkingNow = useRef(false);
  // if Gloam is already at the overlook (a finished lesson, reopened), open the journal anyway
  useEffect(() => {
    if (s.phase !== "ending" || finaleArrived) return;
    const t = setTimeout(() => setFinaleArrived(true), walkingNow.current ? 9000 : 1400);
    return () => clearTimeout(t);
  }, [s.phase, finaleArrived]);
  const [chapter, setChapter] = useState<number | null>(null);
  const saidQuips = useRef<string[]>([]);
  const arrivedAt = useRef(walkLit);
  const onWalking = useCallback(
    (walking: boolean) => {
      if (!world) return;
      walkingNow.current = walking;
      if (walking) {
        const line = pickLine(world.travel, { topic: lesson.topic, question: "" }, saidQuips.current);
        saidQuips.current = [...saidQuips.current.slice(-3), line];
        setQuip(line);
        return;
      }
      setTimeout(() => setQuip(null), 1800);
      if (walkLit >= lesson.concepts.length) setTimeout(() => setFinaleArrived(true), 900);
      // arrived at a new shrine: a new chapter
      if (walkLit > arrivedAt.current && walkLit < lesson.concepts.length) {
        setChapter(walkLit + 1);
        setTimeout(() => setChapter(null), 5200);
      }
      arrivedAt.current = walkLit;
    },
    [world, lesson.topic, lesson.concepts.length, walkLit],
  );
  const beat = lesson.storyBeats[Math.min(lesson.storyBeats.length - 1, Math.round((walkLit / Math.max(1, lesson.concepts.length)) * (lesson.storyBeats.length - 1)))];
  // each level gets its own line (no randomness while rendering)
  const levelLine = style.lines.levelUp[(s.levelUp?.level ?? 0) % style.lines.levelUp.length];
  // The opening shot: the camera starts on the sky and cranes down into the valley
  const [opened, setOpened] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setOpened(true), 350);
    return () => clearTimeout(t);
  }, []);
  const steps = useMemo(() => style.copy.intro(lesson.topic, lesson.concepts.length), [style, lesson.topic, lesson.concepts.length]);

  // The camera, per shot. focus = where Gloam stands across the screen, groundAt = where the ground sits down it.
  const shot =
    s.phase === "title" || s.phase === "loading"
      ? { focus: wide ? 0.66 : 0.5, groundAt: !opened ? 1.05 : wide ? 0.8 : 0.56, scale: wide ? 0.9 : 0.7 }
      : s.phase === "ending"
        ? { focus: wide ? 0.29 : 0.5, groundAt: wide ? 0.74 : 0.5, scale: 1 }
        : { focus: 0.5, groundAt: wide ? 0.6 : 0.5, scale: 1 };
  const focus = shot.focus;

  // Story beats float over the scene for a few seconds
  const lastEntry = s.entries[s.entries.length - 1];
  useEffect(() => {
    if (s.phase !== "teach" || lastEntry?.kind !== "story") return;
    const show = setTimeout(() => setCaption(lastEntry.text), 0);
    const hide = setTimeout(() => setCaption(null), 6500);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [lastEntry, s.phase]);

  // Escape pauses while teaching
  useEffect(() => {
    if (s.phase !== "teach" || overlay || s.moment) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOverlay("pause");
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [s.phase, overlay, s.moment]);

  const toTitle = () => {
    setOverlay(null);
    s.setPhase("title");
  };

  return (
    <div
      data-age-style={style.id}
      data-screen={s.moment ? "moment" : s.status}
      data-phase={s.phase}
      className="relative h-dvh overflow-hidden bg-bg text-ink"
    >
      <div className="absolute inset-0">
        <Stage
          style={style}
          mood={s.mood}
          brightness={s.light}
          concepts={lesson.concepts}
          understanding={s.shown}
          flash={s.flash}
          typingTick={s.typingTick}
          eurekaTick={s.eurekaTick}
          focus={focus}
          groundAt={shot.groundAt}
          gloamScale={shot.scale}
          showCandles={s.phase !== "title" && s.phase !== "loading"}
          onGloamBox={setGloamBox}
          journey={{
            talking: s.talking,
            waiting: s.phase === "teach" && s.status === "ready" && !s.moment,
            level: s.gloam.level,
            levels,
            stop: walkLit,
            onWalking,
          }}
        >
          {(s.phase === "teach" || s.phase === "intro") && <TopBar style={style} lesson={lesson} levels={levels} current={world ? walkLit : litCount} onPause={() => setOverlay("pause")} />}
          <StoryCaption text={s.phase === "teach" && !world ? caption : null} />
          {world && <TravelQuip text={s.phase === "teach" ? quip : null} gloam={gloamBox} />}
          {world && <ChapterCard style={style} chapter={s.phase === "teach" ? chapter : null} total={lesson.concepts.length} beat={beat} />}
          <LevelUpCard style={style} level={s.levelUp && !s.moment ? s.levelUp.level : null} line={levelLine} onDone={s.clearLevelUp} />
          <EurekaMoment moment={s.moment} style={style} x={focus} onPeak={s.onPeak} onDone={s.onMomentDone} />
          <AnimatePresence>
            {s.phase === "title" && <TitleScreen key="title" style={style} lesson={lesson} resumable={s.resumable} light={s.light} onStart={s.start} onHelp={() => setOverlay("help")} />}
          </AnimatePresence>
          {s.phase === "ending" && s.recap && (!world || finaleArrived) && (
            <EndingPanel style={style} recap={s.recap} gloam={s.gloam} onKeepTalking={() => s.setPhase("teach")} onTeachAgain={s.startOver} onTitle={toTitle} />
          )}
        </Stage>
      </div>

      {s.phase === "intro" && <IntroBand s={s} style={style} steps={steps} gloam={gloamBox} wide={wide} />}
      {s.phase === "teach" && <DialogueBand s={s} style={style} gloam={gloamBox} wide={wide} onOpenLog={() => setOverlay("log")} />}

      {/* fade in from black, like the start of a film */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-50 bg-black"
        initial={{ opacity: calm ? 0 : 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 2.4, ease: [0.4, 0, 0.2, 1], delay: 0.2 }}
      />

      <AnimatePresence>
        {overlay === "pause" && (
          <PauseMenu
            key="pause"
            style={style}
            sound={s.sound}
            onResume={() => setOverlay(null)}
            onHelp={() => setOverlay("help")}
            onLog={() => setOverlay("log")}
            onToggleSound={s.toggleSound}
            onStartOver={() => {
              setOverlay(null);
              void s.startOver();
            }}
            onTitle={toTitle}
            canSeeRecap={s.finished && !!s.recap}
            onRecap={() => {
              setOverlay(null);
              s.setPhase("ending");
            }}
          />
        )}
        {overlay === "help" && <HelpDialog key="help" style={style} lesson={lesson} onClose={() => setOverlay(null)} />}
        {overlay === "log" && <LogDrawer key="log" style={style} entries={s.entries} onClose={() => setOverlay(null)} />}
      </AnimatePresence>
    </div>
  );
}
