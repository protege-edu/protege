"use client";

import { LostScreen } from "@/components/lost/LostScreen";

/** Something broke on our side: never a raw error. Gloam (sheepish) and a way to try again. */
export default function Error({ reset }: { error: Error; reset: () => void }) {
  // (the server can't be asked who this is right now, so the browser's language decides)
  const language = typeof navigator !== "undefined" && /^fr\b/i.test(navigator.language) ? "fr" : "en";
  return <LostScreen kind="broke" language={language} onRetry={reset} />;
}
