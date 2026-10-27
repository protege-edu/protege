/**
 * Read-aloud on the teacher's laptop: a small helper that turns Gloam's lines into a natural voice with
 * Kokoro (Apache 2.0) through sherpa-onnx (Apache 2.0). It listens ONLY to this computer: Protégé asks it
 * for a line and passes the sound on to the student's browser. Nothing is written to disk or logged.
 *
 *   npm run voice           (starts it with voice typing; run `npm run voice:setup` once first)
 *
 * It's its own process (not inside Protégé's server) so making a line never slows anyone else's page,
 * and so the engine's libraries can be found on a Mac.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { speakConfig } from "@/lib/voice/config";
import { isSpokenVoice, SPOKEN_MAX_CHARS, SPOKEN_VOICES } from "@/lib/voice/voices";

type Tts = {
  sampleRate: number;
  generateAsync(req: { text: string; sid: number; speed: number }): Promise<{ samples: Float32Array; sampleRate: number }>;
};

const engineDir = () => path.join(speakConfig.dir, "node_modules", "sherpa-onnx-node");
const modelDir = () => path.join(speakConfig.dir, "kokoro");

/** Is read-aloud set up on this laptop? (null = yes, otherwise why not) */
export function speakMissing(): string | null {
  if (!fs.existsSync(path.join(engineDir(), "package.json")) || !fs.existsSync(path.join(modelDir(), "model.onnx"))) {
    return "Read-aloud with Gloam's voice isn't set up yet. Run `npm run voice:setup` once.";
  }
  return null;
}

/** The environment the helper needs (on a Mac, where the engine's libraries are) */
export function speakEnv(): NodeJS.ProcessEnv {
  const lib = path.join(speakConfig.dir, "node_modules", `sherpa-onnx-${process.platform === "win32" ? "win" : process.platform}-${process.arch}`);
  if (process.platform === "darwin") return { ...process.env, DYLD_LIBRARY_PATH: [lib, process.env.DYLD_LIBRARY_PATH].filter(Boolean).join(":") };
  if (process.platform === "linux") return { ...process.env, LD_LIBRARY_PATH: [lib, process.env.LD_LIBRARY_PATH].filter(Boolean).join(":") };
  return process.env;
}

// one voice model per language, loaded the first time it's needed (French is only loaded for French classes)
const voices = new Map<"en" | "fr", Promise<Tts>>();
function voiceFor(lang: "en" | "fr"): Promise<Tts> {
  let v = voices.get(lang);
  if (!v) {
    const sherpa = createRequire(path.join(speakConfig.dir, "x.js"))("sherpa-onnx-node") as { OfflineTts: { createAsync(c: unknown): Promise<Tts> } };
    const m = modelDir();
    const threads = speakConfig.threads || Math.max(2, Math.min(6, Math.round(os.availableParallelism() / 4)));
    v = sherpa.OfflineTts.createAsync({
      model: {
        kokoro: {
          model: path.join(m, "model.onnx"),
          voices: path.join(m, "voices.bin"),
          tokens: path.join(m, "tokens.txt"),
          dataDir: path.join(m, "espeak-ng-data"),
          // English uses a word list (and espeak-ng for words it doesn't know); French is all espeak-ng
          lexicon: lang === "en" ? path.join(m, "lexicon-us-en.txt") : "",
          lang: lang === "en" ? "en-us" : "fr",
        },
        numThreads: threads,
        debug: 0,
      },
      maxNumSentences: 1,
    });
    voices.set(lang, v);
    v.catch(() => voices.delete(lang));
  }
  return v;
}

/** Words Kokoro trips on, tidied: no markdown, no emoji, hyphens and dashes read as pauses */
export function tidyForSpeech(text: string): string {
  return text
    .replace(/[*_`#~]+/g, "")
    .replace(/\p{Extended_Pictographic}|️/gu, "")
    .replace(/(\p{L})-(\p{L})/gu, "$1 $2")
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/\.{3,}/g, "…")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, SPOKEN_MAX_CHARS);
}

/** 16-bit mono WAV (every browser plays it) */
function wav(samples: Float32Array, rate: number): Buffer {
  const out = Buffer.alloc(44 + samples.length * 2);
  out.write("RIFF", 0);
  out.writeUInt32LE(36 + samples.length * 2, 4);
  out.write("WAVEfmt ", 8);
  out.writeUInt32LE(16, 16);
  out.writeUInt16LE(1, 20);
  out.writeUInt16LE(1, 22);
  out.writeUInt32LE(rate, 24);
  out.writeUInt32LE(rate * 2, 28);
  out.writeUInt16LE(2, 32);
  out.writeUInt16LE(16, 34);
  out.write("data", 36);
  out.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), 44 + i * 2);
  return out;
}

// one line at a time: each one already uses several cores
let queue: Promise<unknown> = Promise.resolve();
function inTurn<T>(job: () => Promise<T>): Promise<T> {
  const run = queue.then(job, job);
  queue = run.catch(() => undefined);
  return run;
}

/** Run the helper (blocks until stopped) */
export function runSpeaker() {
  const missing = speakMissing();
  if (missing) {
    console.error(missing);
    process.exit(1);
  }
  const { hostname, port } = new URL(speakConfig.url);
  const server = http.createServer(async (req, res) => {
    if (req.method === "GET") {
      res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ ok: true }));
      return;
    }
    if (req.method !== "POST" || req.url !== "/speak") return void res.writeHead(404).end();
    let body = "";
    for await (const chunk of req) {
      body += chunk;
      if (body.length > 4000) return void res.writeHead(413).end();
    }
    try {
      const ask = JSON.parse(body) as { text?: unknown; voice?: unknown; speed?: unknown };
      const text = typeof ask.text === "string" ? tidyForSpeech(ask.text) : "";
      const name = typeof ask.voice === "string" && isSpokenVoice(ask.voice) ? ask.voice : null;
      const speed = typeof ask.speed === "number" && ask.speed >= 0.7 && ask.speed <= 1.3 ? ask.speed : 1;
      if (!text || !name) return void res.writeHead(400).end();
      const voice = SPOKEN_VOICES[name];
      const tts = await voiceFor(voice.lang);
      const audio = await inTurn(() => tts.generateAsync({ text, sid: voice.id, speed }));
      res.writeHead(200, { "content-type": "audio/wav" }).end(wav(audio.samples, audio.sampleRate));
    } catch {
      res.writeHead(500).end();
    }
  });
  server.listen(Number(port), hostname, () => {
    console.log(`Gloam's read-aloud voice is listening on ${speakConfig.url} (this computer only).`);
    // load English now, so the first line doesn't wait for the model
    void voiceFor("en").catch((e) => console.error("The read-aloud voice didn't load:", e instanceof Error ? e.message : e));
  });
}

/** Start the helper as its own process (the same Node, so it works from the download too) */
export function startSpeaker(entry: string[]) {
  return spawn(process.execPath, entry, { env: speakEnv(), stdio: ["ignore", "ignore", "inherit"] });
}

if (process.argv[1] && /speak(\.ts|\.js)?$/.test(process.argv[1])) runSpeaker();
