"use client";

import { useSyncExternalStore } from "react";

/**
 * Test mode: only while developing (npm run dev), and only when the address has ?test in it,
 * e.g. http://localhost:3000/?test. It lets you paste answers (normally pasted text doesn't
 * teach Gloam) and shows shortcuts to see every moment. A real build never has it.
 */
export const TEST_MODE_POSSIBLE = process.env.NODE_ENV !== "production";

const subscribe = () => () => {};
const read = () => TEST_MODE_POSSIBLE && new URLSearchParams(window.location.search).has("test");

export function useTestMode(): boolean {
  return useSyncExternalStore(subscribe, read, () => false);
}
