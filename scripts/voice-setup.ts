/**
 * One-time setup for voice typing on the teacher's laptop: downloads whisper.cpp (MIT, free) and a
 * speech model that understands English and French into Protégé's data folder. Nothing is installed
 * system-wide, and nothing a student says is ever sent anywhere but this laptop.
 *
 *   npm run voice:setup            (then `npm run voice` starts it; `npm run class` does that for you)
 */
import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import { voiceConfig, voiceDownloads } from "@/lib/voice/config";

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

async function main() {
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
  console.log("Voice typing is ready. Start it with `npm run voice` (or `npm run class`).");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
