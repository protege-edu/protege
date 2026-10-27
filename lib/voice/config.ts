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

/**
 * Read-aloud on the teacher's laptop: Gloam's lines in a natural voice (Kokoro, Apache 2.0), made by a
 * small helper (scripts/speak.ts) that only this computer can reach. Without it, read-aloud uses the
 * device's own voices. Lines are never written to disk or logged.
 *
 *   SPEAK_URL          the local read-aloud helper (default http://127.0.0.1:8179)
 *   SPEAK_THREADS      CPU cores it may use for one line (default: about a quarter of them)
 */
export const speakConfig = {
  url: process.env.SPEAK_URL ?? "http://127.0.0.1:8179",
  /** the voice model and the engine that runs it, inside the voice folder */
  dir: path.join(process.env.VOICE_DIR ?? path.join(dataDir(), "voice"), "speak"),
  /** 0 = automatic (see scripts/speak.ts) */
  threads: Number(process.env.SPEAK_THREADS ?? 0),
  timeoutMs: Number(process.env.SPEAK_TIMEOUT_MS ?? 15_000),
};

/** What scripts/voice-setup.ts downloads for read-aloud (pinned versions, free and open source) */
export const speakDownloads = {
  /** sherpa-onnx runs the voice model in Node (Apache 2.0). 1.x still has espeak-ng built in for French and new words. */
  engineVersion: "1.13.8",
  npm: (name: string, version: string) => `https://registry.npmjs.org/${name}/-/${name}-${version}.tgz`,
  /** Kokoro 82M v1.0 (Apache 2.0) packed for sherpa-onnx */
  model: "https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/kokoro-multi-lang-v1_0.tar.bz2",
  /** what's kept from the model download (the rest is for Chinese) */
  keep: ["model.onnx", "voices.bin", "tokens.txt", "lexicon-us-en.txt", "lexicon-gb-en.txt", "espeak-ng-data", "LICENSE"],
};
