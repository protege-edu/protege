/**
 * The first-run setup, as the setup page sees it. The launcher (scripts/lib/setup.ts) does the work and
 * keeps this up to date; the page (app/setup) asks for it through /api/setup.
 */
export type SetupPhase =
  /** looking for Ollama (Gloam's brain) and the model */
  | "checking"
  /** downloading Ollama's installer */
  | "brain-download"
  /** Ollama's installer running (silently) */
  | "brain-install"
  /** Ollama installed, waiting for it to start */
  | "brain-start"
  /** downloading Gloam's model through Ollama */
  | "model"
  /** Gloam's brain is ready */
  | "ready"
  | "error";

export type VoicesState =
  /** already downloaded */
  | "ready"
  /** not decided yet: the page asks */
  | "ask"
  /** yes, waiting for the brain to finish downloading first */
  | "queued"
  | "downloading"
  /** the teacher said not now */
  | "later"
  | "error";

export interface SetupState {
  phase: SetupPhase;
  /** bytes of the current download (total 0 = not known yet) */
  got: number;
  total: number;
  /** bytes per second, smoothed */
  rate: number;
  /** 0..1 across everything the brain needs (the page's dawn) */
  overall: number;
  voices: VoicesState;
  /** the voice download, separately (it comes after the brain) */
  voiceGot: number;
  voiceTotal: number;
  voiceStep: string;
  error: { what: string; fix: string } | null;
  model: string;
  platform: "windows" | "mac" | "other";
}

/** "about 12 minutes left" from bytes and a rate */
export function timeLeft(got: number, total: number, rate: number): string | null {
  if (!total || rate < 1024 || got >= total) return null;
  const s = (total - got) / rate;
  if (s < 50) return "less than a minute left";
  const m = Math.round(s / 60);
  if (m < 60) return `about ${m} minute${m === 1 ? "" : "s"} left`;
  const h = Math.floor(m / 60);
  const rest = Math.round((m % 60) / 5) * 5;
  return `about ${h} hour${h === 1 ? "" : "s"}${rest ? ` ${rest} minutes` : ""} left`;
}

/** "1.2 GB" */
export function size(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${Math.round(bytes / 1e6)} MB`;
  return `${Math.max(1, Math.round(bytes / 1e3))} KB`;
}
