"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { AgeStyle } from "@/lib/age-styles/types";
import { ACCESS_KEY, ACCOMMODATIONS_KEY } from "./boot";
import { type Access, type AccessPatch, cleanAccess, defaultAccess } from "./settings";

/**
 * The student's "Ways to play" in the browser. Only what they CHANGED is kept (an age's own defaults
 * fill in the rest), on the device, and on their account when they're signed in to a class.
 * Settings that change how the page looks are set on <html> as data attributes, which CSS reads
 * (app/globals.css); app/layout.tsx sets them before the first paint so nothing flashes.
 */
const OLD_SOUND_KEY = "protege.sound";
const EMPTY: AccessPatch = {};

let saved: AccessPatch = EMPTY;
// what their teacher switched on (an accommodation): under the student's own choices
let accommodations: AccessPatch = EMPTY;
// the two together, one object until either changes (what screens read)
let merged: AccessPatch = EMPTY;
let loaded = false;
let signedIn = false;
const listeners = new Set<() => void>();

const storage = <T,>(fn: () => T, fallback: T): T => {
  try {
    return fn();
  } catch {
    return fallback;
  }
};

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  const raw = storage(() => JSON.parse(localStorage.getItem(ACCESS_KEY) ?? "null"), null);
  saved = cleanAccess(raw);
  accommodations = cleanAccess(storage(() => JSON.parse(localStorage.getItem(ACCOMMODATIONS_KEY) ?? "null"), null));
  // sound used to be its own switch
  if (saved.sound === undefined && storage(() => localStorage.getItem(OLD_SOUND_KEY), null) === "on") saved = { ...saved, sound: true };
  merged = { ...accommodations, ...saved };
}

/** Put the look-changing settings on <html>, where CSS can see them */
export function applyAccess(a: AccessPatch) {
  const d = document.documentElement.dataset;
  d.text = String(a.text ?? 0);
  if (a.contrast) d.contrast = "more";
  else delete d.contrast;
  d.reading = a.reading ?? "normal";
  if (a.calm) d.motion = "calm";
  else delete d.motion;
}

function commit(next: AccessPatch, acc = accommodations) {
  saved = next;
  accommodations = acc;
  merged = { ...acc, ...next };
  storage(() => localStorage.setItem(ACCESS_KEY, JSON.stringify(next)), undefined);
  storage(() => localStorage.setItem(ACCOMMODATIONS_KEY, JSON.stringify(acc)), undefined);
  applyAccess(merged);
  for (const fn of listeners) fn();
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
const snapshot = () => {
  load();
  return merged;
};

/** What the student and their teacher changed (no age defaults filled in) */
export function useSavedAccess(): AccessPatch {
  return useSyncExternalStore(subscribe, snapshot, () => EMPTY);
}

/** The settings in force for this age style: its defaults, plus what the student changed */
export function useAccess(style: Pick<AgeStyle, "input">): Access {
  const s = useSavedAccess();
  return useMemo(() => ({ ...defaultAccess(style), ...s }), [style, s]);
}

/** Change some settings. Signed in? They're saved on the student's account too (best effort: the device keeps them anyway). */
export function setAccess(patch: AccessPatch) {
  load();
  commit({ ...saved, ...patch });
  if (signedIn) {
    void fetch("/api/me/access", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(patch), keepalive: true }).catch(() => {});
  }
}

/**
 * A signed-in student's page: their account's settings win over whatever this (maybe shared) Chromebook had.
 * null = they never changed anything, so they start from their age's defaults, not the last student's.
 */
export function adoptAccess(parts: { own: AccessPatch | null; accommodations: AccessPatch | null } | null) {
  load();
  signedIn = true;
  const own = parts?.own ? cleanAccess(parts.own) : EMPTY;
  const acc = parts?.accommodations ? cleanAccess(parts.accommodations) : EMPTY;
  if (JSON.stringify(own) !== JSON.stringify(saved) || JSON.stringify(acc) !== JSON.stringify(accommodations)) commit(own, acc);
}

/** Leaving a signed-in page for practice or another student: stop saving to the account */
export function forgetAccount() {
  signedIn = false;
}
