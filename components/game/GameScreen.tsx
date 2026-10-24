"use client";

import { AnimatePresence } from "motion/react";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { EurekaMoment } from "@/components/scene/EurekaMoment";
import { getAgeStyle } from "@/lib/age-styles";
import type { ClientLesson } from "@/lib/lesson/types";
import { DialogueBand, IntroBand } from "./DialogueBand";
import { EndingPanel, HelpDialog, LogDrawer, PauseMenu, StoryCaption, TitleScreen, TopBar } from "./Overlays";
import { Stage } from "./Stage";
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
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [caption, setCaption] = useState<string | null>(null);
  const steps = useMemo(() => style.copy.intro(lesson.topic, lesson.concepts.length), [style, lesson.topic, lesson.concepts.length]);

  // The camera, per shot. focus = where Gloam stands across the screen, groundAt = where the ground sits down it.
  const shot =
    s.phase === "title" || s.phase === "loading"
      ? { focus: wide ? 0.66 : 0.5, groundAt: wide ? 0.8 : 0.56, scale: wide ? 0.9 : 0.7 }
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
        >
          {(s.phase === "teach" || s.phase === "intro") && <TopBar style={style} lesson={lesson} chapter={1} onPause={() => setOverlay("pause")} />}
          <StoryCaption text={s.phase === "teach" ? caption : null} />
          <EurekaMoment moment={s.moment} style={style} x={focus} onPeak={s.onPeak} onDone={s.onMomentDone} />
          <AnimatePresence>
            {s.phase === "title" && <TitleScreen key="title" style={style} lesson={lesson} resumable={s.resumable} onStart={s.start} onHelp={() => setOverlay("help")} />}
          </AnimatePresence>
          {s.phase === "ending" && s.recap && (
            <EndingPanel style={style} recap={s.recap} onKeepTalking={() => s.setPhase("teach")} onTeachAgain={s.startOver} onTitle={toTitle} />
          )}
        </Stage>
      </div>

      {s.phase === "intro" && <IntroBand s={s} style={style} steps={steps} />}
      {s.phase === "teach" && <DialogueBand s={s} style={style} onOpenLog={() => setOverlay("log")} />}

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
