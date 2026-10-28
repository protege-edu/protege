"use client";

import "./lost.css";
import { useEffect, useRef } from "react";
import { Wordmark } from "@/components/ui/Logo";
import { getAgeStyle, type AgeStyleId, type Language } from "@/lib/age-styles";
import { useCalmMotion } from "@/lib/useCalmMotion";
import { mountLost, type LostKind } from "./mount";
import { PROPS } from "./props";

export interface LostProps {
  kind: LostKind;
  /** the signed-in student's class (age style and language), or the browser's language and the high school look */
  style?: AgeStyleId;
  language?: Language;
  /** signed in as a student: the way back is their own Gloam, not "join a class" */
  student?: boolean;
  /** "broke" only: try the page again */
  onRetry?: () => void;
}

/**
 * The lost page: nothing at this address, a lesson that was taken down, or something that broke.
 * The night valley in the dark, a pool of moonlight that follows the student, and Gloam searching with them
 * (see mount.ts). The same scene as the website's 404 (site/js/lost.ts), in this age style's own world.
 */
export function LostScreen({ kind, style, language = "en", student = false, onRetry }: LostProps) {
  const root = useRef<HTMLElement>(null);
  const calm = useCalmMotion();
  const age = getAgeStyle(style, language);
  const copy = age.copy.lost;
  const words = copy[kind];
  const world = age.look.world;
  const rig = age.look.rig;

  useEffect(() => {
    if (!root.current || !rig) return;
    return mountLost(root.current, { copy, kind, rig, calm });
  }, [copy, kind, rig, calm]);

  // (full page loads on purpose: after an error they clear whatever broke)
  /* eslint-disable @next/next/no-html-link-for-pages */
  return (
    <main ref={root} className="lost" data-kind={kind} data-tone={age.look.tone} data-age-style={age.id} lang={age.language}>
      <div className="lost-scene" aria-hidden="true">
        {world?.layers.map((l) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={l.id} className="lost-layer" src={age.look.tone === "light" ? l.lit : l.dark} alt="" decoding="async" />
        ))}
      </div>
      <div className="lost-dark" aria-hidden="true" />
      {/* (first in the page: the keyboard reaches the way out before the hiding spots) */}
      <div className="lost-words">
        <p className="lost-brand">
          <Wordmark tone="dark" />
        </p>
        <h1 className="lost-title">{words.title}</h1>
        <p className="lost-body">{words.body}</p>
        <div className="lost-actions">
          {kind === "broke" && onRetry && (
            <button type="button" className="lost-btn primary" onClick={onRetry}>
              {copy.retry}
            </button>
          )}
          {student ? (
            <a href="/me" className={`lost-btn ${kind === "broke" ? "quiet" : "primary"}`}>
              {age.copy.toMyGloam}
            </a>
          ) : kind === "broke" ? (
            <a href="/" className="lost-btn quiet">
              {copy.start}
            </a>
          ) : (
            <>
              <a href="/join" className="lost-btn primary">
                {copy.join}
              </a>
              <a href="/teacher" className="lost-btn quiet">
                {copy.teacher}
              </a>
            </>
          )}
        </div>
        {kind !== "broke" && <p className="lost-hint">{copy.hint}</p>}
      </div>
      <div className="lost-stage">
        {kind === "missing" &&
          (["rock", "sign", "bush"] as const).map((id) => (
            <button key={id} type="button" className="lost-spot" data-spot={id} aria-label={copy.spots[id].label}>
              <span dangerouslySetInnerHTML={{ __html: PROPS[id] }} />
              <span className="lost-glint" aria-hidden="true" />
            </button>
          ))}
        {kind === "gone" && world && (
          <button type="button" className="lost-spot" data-spot="shrine" aria-label={copy.shrine.label}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="lost-prop" src={world.shrine.src} alt="" />
            <span className="lost-glint" aria-hidden="true" />
          </button>
        )}
      </div>
      <div className="lost-canvas" aria-hidden="true" />
      <button type="button" className="lost-poke" aria-label={copy.gloamLabel} />
      <div className="lost-bubble is-empty" aria-hidden="true">
        <p className="lost-say">
          <span data-shown="" />
          <span data-rest="" />
        </p>
      </div>
      <p className="lost-sr sr-only" aria-live="polite" />

    </main>
  );
  /* eslint-enable @next/next/no-html-link-for-pages */
}
