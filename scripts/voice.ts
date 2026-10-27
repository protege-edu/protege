/**
 * Start the voices on this laptop, listening ONLY to this computer (never reachable from the network):
 * voice typing (whisper.cpp's server: Protégé passes students' clips to it) and read-aloud in Gloam's
 * voice (scripts/speak.ts).
 *
 *   npm run voice           (run `npm run voice:setup` once first)
 */
import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { voiceConfig } from "@/lib/voice/config";
import { speakMissing, startSpeaker } from "./speak";

/** The command that starts whisper.cpp, or null (with the reason) when it isn't set up */
export function voiceCommand(): { exe: string; args: string[] } | { missing: string } {
  const exe = path.join(voiceConfig.dir, process.platform === "win32" ? "whisper-server.exe" : "whisper-server");
  const model = path.join(voiceConfig.dir, voiceConfig.model);
  if (!fs.existsSync(exe) || !fs.existsSync(model)) return { missing: "Voice typing isn't set up yet. Run `npm run voice:setup` once." };
  const { port, hostname } = new URL(voiceConfig.url);
  // leave a couple of cores for Protégé and the browser
  const threads = String(Math.max(2, Math.min(8, os.availableParallelism() - 2)));
  return { exe, args: ["-m", model, "--host", hostname, "--port", port, "-t", threads, "--no-timestamps"] };
}

if (process.argv[1] && path.basename(process.argv[1]).startsWith("voice")) {
  const cmd = voiceCommand();
  const reading = speakMissing();
  if ("missing" in cmd && reading) {
    console.error(cmd.missing);
    process.exit(1);
  }
  const kids: ChildProcess[] = [];
  if ("missing" in cmd) console.log(cmd.missing);
  else {
    console.log(`Voice typing is listening on ${voiceConfig.url} (this computer only).`);
    kids.push(spawn(cmd.exe, cmd.args, { cwd: voiceConfig.dir, stdio: ["ignore", "ignore", "inherit"] }));
  }
  if (reading) console.log(reading);
  // the read-aloud helper, run by this same Node (tsx), as its own process
  else kids.push(startSpeaker([...process.execArgv, path.join(path.dirname(path.resolve(process.argv[1])), "speak.ts")]));
  console.log("Ctrl+C stops them.");
  for (const k of kids) k.on("exit", (code) => {
    for (const other of kids) other.kill();
    process.exit(code ?? 0);
  });
}
