/**
 * Start voice typing on this laptop: whisper.cpp's server, listening ONLY to this computer
 * (Protégé passes students' clips to it; it's never reachable from the network).
 *
 *   npm run voice           (run `npm run voice:setup` once first)
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { voiceConfig } from "@/lib/voice/config";

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
  if ("missing" in cmd) {
    console.error(cmd.missing);
    process.exit(1);
  }
  console.log(`Voice typing is listening on ${voiceConfig.url} (this computer only). Ctrl+C stops it.`);
  const child = spawn(cmd.exe, cmd.args, { cwd: voiceConfig.dir, stdio: ["ignore", "ignore", "inherit"] });
  child.on("exit", (code) => process.exit(code ?? 0));
}
