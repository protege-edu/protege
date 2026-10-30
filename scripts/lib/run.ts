/**
 * The steps to run Protégé for a class, shared by `npm run class` (from the code) and the launcher in
 * the download (scripts/launch.ts): check the AI, start voice typing, open a tunnel, show the address.
 */
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import QRCode from "qrcode";
import { speakConfig, voiceConfig } from "@/lib/voice/config";
import { speakMissing, startSpeaker } from "../speak";
import { voiceCommand } from "../voice";
import { clearTunnel } from "@/lib/hosting/tunnel";
import { SITE_URL } from "@/lib/hosting/site";
import { cloudflared, quickTunnel, registerRoom } from "./tunnel";

export const say = (s = "") => console.log(s);
export const children: ChildProcess[] = [];
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const aiBase = () => (process.env.AI_BASE_URL ?? "http://localhost:11434/v1").replace(/\/v1\/?$/, "");
export const aiModel = () => process.env.AI_MODEL ?? "qwen3:4b-instruct";

export async function models(): Promise<string[] | null> {
  try {
    const tags = (await (await fetch(`${aiBase()}/api/tags`, { signal: AbortSignal.timeout(4000) })).json()) as { models?: { name: string }[] };
    return tags.models?.map((m) => m.name) ?? [];
  } catch {
    return null;
  }
}

/** Open a web page in the teacher's browser */
export function openInBrowser(url: string) {
  const cmd = process.platform === "win32" ? ["cmd", ["/c", "start", "", url]] : process.platform === "darwin" ? ["open", [url]] : ["xdg-open", [url]];
  spawn(cmd[0] as string, cmd[1] as string[], { stdio: "ignore", detached: true }).unref();
}

/**
 * Gloam's brain: Ollama running with the model downloaded.
 * `help`: when it's missing, start it (or open its free download page) and download the model, instead of just stopping.
 */
export async function ensureAI({ help = false } = {}) {
  let have = await models();
  if (!have && help) {
    // installed but not running? start it
    const app = process.platform === "win32" ? `${process.env.LOCALAPPDATA}\\Programs\\Ollama\\ollama app.exe` : process.platform === "darwin" ? "/Applications/Ollama.app" : null;
    if (app && fs.existsSync(app)) {
      say("… starting Ollama (it runs Gloam's AI)");
      if (process.platform === "darwin") spawn("open", ["-a", "Ollama"], { stdio: "ignore", detached: true }).unref();
      else spawn(app, [], { stdio: "ignore", detached: true }).unref();
    } else {
      say("Gloam's AI runs on Ollama, which is free. Opening its download page: install it, and this window carries on by itself.");
      openInBrowser("https://ollama.com/download");
    }
    for (let i = 0; i < 400 && !have; i++) {
      await wait(3000);
      have = await models();
    }
  }
  if (!have) {
    say("Ollama isn't running. Open the Ollama app, then run this again.");
    process.exit(1);
  }
  const model = aiModel();
  if (!have.some((m) => m === model || m === `${model}:latest`)) {
    if (!help) {
      say(`Gloam's brain (${model}) isn't downloaded yet. Run:\n\n  ollama pull ${model}\n`);
      process.exit(1);
    }
    say(`… downloading Gloam's brain (${model}, about 2.5 GB, once)`);
    const res = await fetch(`${aiBase()}/api/pull`, { method: "POST", body: JSON.stringify({ name: model, stream: true }) });
    let shown = -1;
    let line = "";
    for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
      line += Buffer.from(chunk).toString();
      const parts = line.split("\n");
      line = parts.pop() ?? "";
      for (const p of parts) {
        const ev = JSON.parse(p || "{}") as { total?: number; completed?: number; error?: string };
        if (ev.error) {
          say(`The download didn't work: ${ev.error}. Check the internet connection, then run this again.`);
          process.exit(1);
        }
        const pct = ev.total && ev.completed ? Math.floor((ev.completed / ev.total) * 100) : -1;
        if (pct >= 0 && pct !== shown && pct % 10 === 0) {
          shown = pct;
          process.stdout.write(`  ${pct}%`);
        }
      }
    }
    say("");
  }
  say(`✓ Gloam's brain is ready (${model})`);
}

/** Voice typing: start whisper.cpp on this laptop (only this computer can reach it), if it's set up */
export async function startVoice() {
  const up = await fetch(voiceConfig.url, { signal: AbortSignal.timeout(1500) }).then(
    () => true,
    () => false,
  );
  if (up) return say("✓ Voice typing is ready");
  const cmd = voiceCommand();
  if ("missing" in cmd) return say("· Voice typing is off (optional: set it up once to turn it on, see the README)");
  children.push(spawn(cmd.exe, cmd.args, { cwd: voiceConfig.dir, stdio: "ignore" }));
  say("✓ Voice typing is starting");
}

/**
 * Read-aloud in Gloam's voice: start the helper on this laptop (only this computer can reach it), if it's set up.
 * `entry` is how this Node runs scripts/speak.ts (the download runs it from inside launch.js).
 */
export async function startReadAloud(entry: string[]) {
  const up = await fetch(speakConfig.url, { signal: AbortSignal.timeout(1500) }).then(
    () => true,
    () => false,
  );
  if (up) return say("✓ Gloam's read-aloud voice is ready");
  if (speakMissing()) return say("· Read-aloud uses each device's own voice (optional: set up Gloam's voice once, see the README)");
  children.push(startSpeaker(entry));
  say("✓ Gloam's read-aloud voice is starting");
}

export function lanAddress(): string | null {
  for (const i of Object.values(os.networkInterfaces()).flat()) {
    if (i && i.family === "IPv4" && !i.internal && /^(10|172\.(1[6-9]|2\d|3[01])|192\.168)\./.test(i.address)) return i.address;
  }
  return null;
}

function exists(cmd: string) {
  return spawnSync(process.platform === "win32" ? "where" : "which", [cmd], { stdio: "ignore" }).status === 0;
}

/**
 * Open a free tunnel, so students reach this computer from any network. A fixed address (PUBLIC_URL, e.g. a
 * school's own Tailscale Funnel) if there is one; otherwise Cloudflare's quick tunnel, which needs no account
 * (scripts/lib/tunnel.ts). The projector and "Ready for class?" show its address while it runs.
 */
export async function tunnel(port: number): Promise<string | null> {
  if (process.env.PUBLIC_URL && exists("tailscale")) {
    children.push(spawn("tailscale", ["funnel", String(port)], { stdio: "ignore" }));
    return process.env.PUBLIC_URL;
  }
  const bin = await cloudflared(say);
  if (!bin) {
    say("No tunnel this time. Students on this computer's network can still join with the address below.");
    return null;
  }
  // said plainly every time: a quick tunnel isn't private from Cloudflare
  say("… opening a Cloudflare quick tunnel. Cloudflare's servers can see what students type through it: fine for trying Protégé out; for a real class, check your school is okay with it.");
  const url = await quickTunnel(bin, port, children);
  if (!url) {
    say("! The tunnel didn't open (some networks block it). Students on this computer's network can still join with the address below.");
    return null;
  }
  // its room on the website: students go to the website and type the short code on "Show the code"
  const room = await registerRoom(url, say);
  if (room) say(`✓ This laptop's room on the website: ${room} (the same every time). Students go to ${SITE_URL.replace(/^https?:\/\//, "")}/j and type the code on Show the code.`);
  return url;
}

/** Wait for Protégé to answer, warm Gloam up, and print where teachers and students go */
export async function announce(port: number, { useTunnel = false, open = false as boolean | string } = {}) {
  for (let i = 0; i < 90; i++) {
    try {
      await fetch(`http://localhost:${port}/api/health`, { signal: AbortSignal.timeout(2000) });
      break;
    } catch {
      await wait(1000);
    }
  }
  // warms Gloam up (loads the model) and prints the setup code if nobody has an account yet
  await fetch(`http://localhost:${port}/api/teacher/auth`).catch(() => undefined);
  say(`✓ Protégé is running\n`);
  say(`Teacher:  http://localhost:${port}/teacher  (on this laptop)`);
  const lan = lanAddress();
  let students = lan ? `http://${lan}:${port}` : null;
  if (useTunnel) {
    say("… opening the tunnel");
    const url = await tunnel(port);
    if (url) students = url;
  } else if (process.env.PUBLIC_URL) {
    students = process.env.PUBLIC_URL;
  }
  if (students) {
    say(`Students: ${students}  (or the QR code below; then they type the class code)\n`);
    say(await QRCode.toString(`${students}/join`, { type: "terminal", small: true }));
  }
  say("Keep this window open and the laptop awake during class. To stop Protégé, close this window.\n");
  // `open` can be the page to open (the download opens its setup page)
  if (open) openInBrowser(`http://localhost:${port}${typeof open === "string" ? open : "/teacher"}`);
}

/** Pass on what the server prints that matters (the first-time setup code, errors) */
export function relay(server: ChildProcess) {
  server.stdout?.on("data", (d: Buffer) => {
    const text = d.toString();
    if (/setup code|│|┌|└|error/i.test(text)) process.stdout.write(text);
  });
}

export function stopAll() {
  for (const c of children) c.kill();
  clearTunnel();
  process.exit(0);
}
