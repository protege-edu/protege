/**
 * One-time setup for voices on the teacher's laptop, into Protégé's data folder:
 *   - voice typing: whisper.cpp (MIT) and a speech model that understands English and French
 *   - read-aloud: Gloam's natural voice, Kokoro (Apache 2.0), and sherpa-onnx (Apache 2.0) to run it
 * Nothing is installed system-wide, and nothing a student says or reads is ever sent anywhere but this laptop.
 *
 *   npm run voice:setup            (then `npm run voice` starts it; `npm run class` does that for you)
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import JSZip from "jszip";
import { speakConfig, speakDownloads, voiceConfig, voiceDownloads } from "@/lib/voice/config";

async function download(url: string, to: string) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok || !res.body) throw new Error(`Couldn't download ${url} (${res.status})`);
  const total = Number(res.headers.get("content-length") ?? 0);
  const out = fs.createWriteStream(to + ".part");
  let got = 0;
  let shown = -1;
  for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
    out.write(chunk);
    got += chunk.length;
    const pct = total ? Math.floor((got / total) * 100) : -1;
    if (pct !== shown && pct % 10 === 0) {
      shown = pct;
      process.stdout.write(`  ${pct}%`);
    }
  }
  await new Promise<void>((resolve, reject) => out.end((e?: Error | null) => (e ? reject(e) : resolve())));
  fs.renameSync(to + ".part", to);
  console.log("");
}

/** Download whisper.cpp and the speech model into the voice folder (skips what's already there) */
export async function setupVoice() {
  const dir = voiceConfig.dir;
  fs.mkdirSync(dir, { recursive: true });
  console.log(`Voice typing lives in ${dir}`);

  const exe = path.join(dir, process.platform === "win32" ? "whisper-server.exe" : "whisper-server");
  if (fs.existsSync(exe)) console.log("whisper.cpp is already here.");
  else if (process.platform !== "win32") {
    console.log("On Mac or Linux, build whisper.cpp's server (see README, \"Voice typing\") and put whisper-server in this folder.");
  } else {
    console.log("Downloading whisper.cpp (MIT licence)…");
    const zipFile = path.join(dir, "whisper.zip");
    await download(voiceDownloads.windows, zipFile);
    const zip = await JSZip.loadAsync(fs.readFileSync(zipFile));
    // keep just the server and the libraries it needs, flat in the voice folder
    for (const [name, entry] of Object.entries(zip.files)) {
      if (entry.dir) continue;
      const base = path.basename(name);
      if (!/\.(exe|dll)$/i.test(base) || (/\.exe$/i.test(base) && !/^whisper-server\.exe$/i.test(base))) continue;
      fs.writeFileSync(path.join(dir, base), await entry.async("nodebuffer"));
    }
    fs.rmSync(zipFile);
    if (!fs.existsSync(exe)) throw new Error("The whisper.cpp download didn't contain whisper-server.exe. Check README, \"Voice typing\".");
  }

  const model = path.join(dir, voiceConfig.model);
  if (fs.existsSync(model)) console.log(`The speech model (${voiceConfig.model}) is already here.`);
  else {
    console.log(`Downloading the speech model ${voiceConfig.model} (English + French, a few hundred MB)…`);
    await download(voiceDownloads.model(voiceConfig.model), model);
  }
  console.log("Voice typing is ready.");
  await setupSpeech();
  console.log("Voices are ready. Start them with `npm run voice` (or `npm run class`).");
}

/** Unpack a .tgz or .tar.bz2 with the tar every Windows 10+, Mac and Linux computer has */
function untar(file: string, into: string, strip = 0) {
  fs.mkdirSync(into, { recursive: true });
  // Windows' own tar (Git's tar would read "C:" as another computer)
  const tar = process.platform === "win32" ? path.join(process.env.SystemRoot ?? "C:\\Windows", "System32", "tar.exe") : "tar";
  const args = ["-xf", file, "-C", into, ...(strip ? [`--strip-components=${strip}`] : [])];
  const run = spawnSync(tar, args, { stdio: "inherit" });
  if (run.status !== 0) throw new Error(`Couldn't unpack ${path.basename(file)}.`);
}

/** Read-aloud in Gloam's voice: the engine (for this computer) and the voice model */
export async function setupSpeech() {
  const dir = speakConfig.dir;
  fs.mkdirSync(dir, { recursive: true });
  const platform = `${process.platform === "win32" ? "win" : process.platform}-${process.arch}`;
  const v = speakDownloads.engineVersion;
  for (const name of ["sherpa-onnx-node", `sherpa-onnx-${platform}`]) {
    const into = path.join(dir, "node_modules", name);
    const have = fs.existsSync(path.join(into, "package.json")) && JSON.parse(fs.readFileSync(path.join(into, "package.json"), "utf8")).version === v;
    if (have) continue;
    console.log(`Downloading ${name} ${v} (Apache 2.0)…`);
    const file = path.join(dir, `${name}.tgz`);
    await download(speakDownloads.npm(name, v), file);
    fs.rmSync(into, { recursive: true, force: true });
    untar(file, into, 1);
    fs.rmSync(file);
  }

  const model = path.join(dir, "kokoro");
  if (fs.existsSync(path.join(model, "model.onnx"))) console.log("Gloam's read-aloud voice is already here.");
  else {
    console.log("Downloading Gloam's read-aloud voice (Kokoro, Apache 2.0, about 350 MB)…");
    const file = path.join(dir, "kokoro.tar.bz2");
    await download(speakDownloads.model, file);
    const unpacked = path.join(dir, "kokoro-unpacked");
    fs.rmSync(unpacked, { recursive: true, force: true });
    untar(file, unpacked, 1);
    fs.mkdirSync(model, { recursive: true });
    // keep only what English and French need
    for (const keep of speakDownloads.keep) {
      const from = path.join(unpacked, keep);
      if (fs.existsSync(from)) fs.renameSync(from, path.join(model, keep));
    }
    fs.rmSync(unpacked, { recursive: true, force: true });
    fs.rmSync(file);
    if (!fs.existsSync(path.join(model, "model.onnx"))) throw new Error("The voice download didn't contain the model. Check README, \"Read-aloud\".");
  }
  console.log("Read-aloud is ready.");
}

// run directly (npm run voice:setup), not when the launcher imports it
if (process.argv[1] && /voice-setup/.test(process.argv[1])) {
  setupVoice().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
