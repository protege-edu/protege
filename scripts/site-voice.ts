/**
 * Records Gloam's website lines (site/js/lines.ts) in its real voice: Kokoro (Apache 2.0), the same voice
 * the high school Gloam uses in Protégé, made on this laptop. Writes site/audio/<id>.mp3 (small, mono).
 *
 *   npm run voice            (starts the voice helper; `npm run voice:setup` once first)
 *   npx tsx scripts/site-voice.ts
 * Needs ffmpeg (free) to turn the recordings into mp3.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { senior } from "@/lib/age-styles/senior";
import { speakConfig } from "@/lib/voice/config";
import { LINES } from "../site/js/lines";

const out = path.join(process.cwd(), "site", "audio");
const voice = senior.input.spoken.en;

async function main() {
  fs.mkdirSync(out, { recursive: true });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gloam-voice-"));
  for (const [id, text] of Object.entries(LINES)) {
    const res = await fetch(`${speakConfig.url}/speak`, { method: "POST", body: JSON.stringify({ text, voice: voice.name, speed: voice.speed }) });
    if (!res.ok) throw new Error(`The voice helper said ${res.status}. Is it running (npm run voice)?`);
    const wav = path.join(tmp, `${id}.wav`);
    fs.writeFileSync(wav, Buffer.from(await res.arrayBuffer()));
    // mono mp3 at 48 kbps: clear speech, a few KB a second (every browser plays mp3)
    const r = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-i", wav, "-ac", "1", "-b:a", "48k", path.join(out, `${id}.mp3`)], { stdio: "inherit" });
    if (r.status !== 0) throw new Error("ffmpeg couldn't make the mp3 (is ffmpeg installed?).");
    console.log(`✓ ${id}`);
  }
  fs.rmSync(tmp, { recursive: true, force: true });
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
