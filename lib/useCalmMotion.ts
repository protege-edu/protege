"use client";

import { useSyncExternalStore } from "react";
import { useSavedAccess } from "@/lib/access/store";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/** True when the student's DEVICE asks for less motion (the "Ways to play" panel says so) */
export function useDeviceCalm(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}

/**
 * True when the student wants less motion: their device asks for it, or they switched on
 * "less motion" in Ways to play. The server can't know either, so it renders "false" first and the
 * browser updates right after, without the page flickering or React complaining that the two don't match.
 */
export function useCalmMotion(): boolean {
  const device = useDeviceCalm();
  return useSavedAccess().calm === true || device;
}
