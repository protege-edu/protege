import path from "node:path";
import { dataDir } from "@/lib/db/location";

/**
 * The ONLY place that knows how voice typing turns speech into words on the teacher's laptop.
 * It's whisper.cpp (MIT, runs locally, like Ollama for the AI). A student's voice goes from their
 * Chromebook to this laptop and nowhere else, and is never saved. Change .env.local to swap it.
 *
 *   VOICE_URL          the local whisper.cpp server (default http://127.0.0.1:8178)
 *   VOICE_MODEL        the speech model file in the voice folder (default: small, English + French)
 *   VOICE_CONCURRENCY  clips turned into words at once (the rest wait their turn; it runs on the CPU)
 */
export const voiceConfig = {
  url: process.env.VOICE_URL ?? "http://127.0.0.1:8178",
  model: process.env.VOICE_MODEL ?? "ggml-small-q5_1.bin",
  /** where whisper.cpp and its model live: next to the database, outside the project */
  dir: process.env.VOICE_DIR ?? path.join(dataDir(), "voice"),
  concurrency: Math.max(1, Number(process.env.VOICE_CONCURRENCY ?? 2)),
  timeoutMs: Number(process.env.VOICE_TIMEOUT_MS ?? 30_000),
  /** longest clip a student can send (a long explanation, not a recording of the class) */
  maxSeconds: 60,
};

/** What scripts/voice-setup.ts downloads (pinned versions, free and open source) */
export const voiceDownloads = {
  /** whisper.cpp v1.9.2 for Windows, CPU build (MIT licence) */
  windows: "https://github.com/ggml-org/whisper.cpp/releases/download/v1.9.2/whisper-bin-x64.zip",
  model: (file: string) => `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/${file}`,
};
