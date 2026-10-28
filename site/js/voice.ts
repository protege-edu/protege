/**
 * Gloam's voice on the website: its lines, recorded ahead of time in its real voice (site/audio, made by
 * scripts/site-voice.ts). Off until the visitor switches it on (browsers only allow sound after a click
 * anyway); the choice is remembered on this device only. Nothing is sent anywhere.
 */
import type { LineId } from "./lines";

const KEY = "protege-site-voice";

/** `lang`: English or French recordings; `root`: the way back to the site's root from this page */
export function createVoice(lang: string, root: string, onTalking: (talking: boolean) => void) {
  let on = false;
  try {
    on = localStorage.getItem(KEY) === "on";
  } catch {}
  let current: HTMLAudioElement | null = null;

  const stop = () => {
    if (!current) return;
    current.pause();
    current = null;
    onTalking(false);
  };

  return {
    get on() {
      return on;
    },
    set(next: boolean) {
      on = next;
      try {
        localStorage.setItem(KEY, on ? "on" : "off");
      } catch {}
      if (!on) stop();
    },
    /** say a line out loud (when the voice is on, or `always` for an explicit "read it to me") */
    play(id: LineId, always = false): Promise<void> {
      stop();
      if (!on && !always) return Promise.resolve();
      const a = new Audio(`${root}audio/${lang === "fr" ? "fr/" : ""}${id}.mp3`);
      current = a;
      onTalking(true);
      return new Promise((resolve) => {
        const done = () => {
          if (current === a) {
            current = null;
            onTalking(false);
          }
          resolve();
        };
        a.onended = done;
        a.onerror = done;
        a.play().catch(done);
      });
    },
    stop,
  };
}

export type Voice = ReturnType<typeof createVoice>;
