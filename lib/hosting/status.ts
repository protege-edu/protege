import "server-only";
import fs from "node:fs";
import { aiConfig } from "@/lib/ai/config";
import { listBackups } from "@/lib/db/backup";
import { dataDir } from "@/lib/db/location";
import { voiceReady } from "@/lib/voice/server";
import pkg from "../../package.json";

/**
 * The teacher's status page: is everything this laptop runs for a class working, and if not,
 * what to do about it, in plain words.
 */
export interface StatusCheck {
  id: "ai" | "voice" | "address" | "disk" | "backup";
  ok: boolean | "optional";
  title: string;
  detail: string;
}

export const VERSION: string = pkg.version;
/** Where updates are published (GitHub releases). Set PROTEGE_REPO="owner/name", or "repository" in package.json. */
export const UPDATE_REPO: string | null = process.env.PROTEGE_REPO ?? ((pkg as { repository?: string }).repository?.replace(/^github:/, "") || null);

async function aiCheck(): Promise<StatusCheck> {
  const base = aiConfig.baseUrl.replace(/\/v1\/?$/, "");
  try {
    const tags = (await (await fetch(`${base}/api/tags`, { signal: AbortSignal.timeout(3000) })).json()) as { models?: { name: string }[] };
    const has = tags.models?.some((m) => m.name === aiConfig.model || m.name === `${aiConfig.model}:latest`);
    return has
      ? { id: "ai", ok: true, title: "Gloam's brain is ready", detail: `The AI model (${aiConfig.model}) runs on this laptop.` }
      : { id: "ai", ok: false, title: "Gloam's brain isn't downloaded", detail: `Open a terminal and run: ollama pull ${aiConfig.model}` };
  } catch {
    return { id: "ai", ok: false, title: "Gloam's brain isn't running", detail: "Open the Ollama app on this laptop. Students' messages wait safely until it's back." };
  }
}

function diskCheck(): StatusCheck {
  try {
    const s = fs.statfsSync(dataDir());
    const gb = (s.bavail * s.bsize) / 1e9;
    return gb < 2
      ? { id: "disk", ok: false, title: "This laptop is almost full", detail: `Only ${gb.toFixed(1)} GB free. Free up some space so Protégé can keep saving students' work.` }
      : { id: "disk", ok: true, title: "Plenty of space", detail: `${gb.toFixed(0)} GB free.` };
  } catch {
    return { id: "disk", ok: true, title: "Space", detail: "Couldn't check the free space on this laptop." };
  }
}

function backupCheck(): StatusCheck {
  const last = listBackups()[0];
  if (!last) return { id: "backup", ok: "optional", title: "No backup yet", detail: "Protégé makes one each day it runs (the first a minute after it starts). They stay on this laptop." };
  const days = Math.floor((Date.now() - last.at.getTime()) / 86_400_000);
  return days > 2
    ? { id: "backup", ok: false, title: `Last backup was ${days} days ago`, detail: "Backups happen while Protégé runs. Start it and leave it on for a minute." }
    : { id: "backup", ok: true, title: "Backed up", detail: `The last 7 days are kept, on this laptop only. Newest: ${last.at.toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" })}` };
}

export async function laptopStatus(address: { url: string; local: boolean }): Promise<StatusCheck[]> {
  const voice = await voiceReady();
  return [
    await aiCheck(),
    voice
      ? { id: "voice", ok: true, title: "Voice typing is on", detail: "Students can talk instead of typing. Their voice is turned into words on this laptop and never saved." }
      : { id: "voice", ok: "optional", title: "Voice typing is off", detail: "Optional. To turn it on, run `npm run voice:setup` once, then start class with `npm run class`." },
    address.local
      ? { id: "address", ok: true, title: `Students go to ${address.url}`, detail: "Works when students are on the same Wi-Fi as this laptop. To reach it from anywhere, see \"Putting Protégé online\" in the README." }
      : /trycloudflare\.com/.test(address.url)
        ? { id: "address", ok: false, title: `Students go to ${address.url}`, detail: "This is a Cloudflare quick tunnel: students' messages pass through Cloudflare's servers. Use the school network or Tailscale instead, unless your school approved it." }
        : { id: "address", ok: true, title: `Students go to ${address.url}`, detail: "Reachable from anywhere, over https, encrypted all the way to this laptop." },
    diskCheck(),
    backupCheck(),
  ];
}

const newer = (a: string, b: string) => {
  const [x, y] = [a, b].map((v) => v.replace(/^v/, "").split(".").map((n) => parseInt(n, 10) || 0));
  for (let i = 0; i < 3; i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) > (y[i] ?? 0);
  return false;
};

/** Only when the teacher presses "Check for updates": asks GitHub for the latest release (no student data involved) */
export async function checkForUpdate(): Promise<{ state: "none" | "available" | "unknown"; latest?: string; url?: string; message: string }> {
  if (!UPDATE_REPO) return { state: "unknown", message: "Updates aren't set up for this copy of Protégé yet." };
  try {
    const res = await fetch(`https://api.github.com/repos/${UPDATE_REPO}/releases/latest`, { headers: { accept: "application/vnd.github+json" }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) return { state: "unknown", message: "Couldn't check right now. Try again later." };
    const r = (await res.json()) as { tag_name: string; html_url: string };
    return newer(r.tag_name, VERSION)
      ? { state: "available", latest: r.tag_name, url: r.html_url, message: `Version ${r.tag_name.replace(/^v/, "")} is out (you have ${VERSION}).` }
      : { state: "none", message: `You have the latest version (${VERSION}).` };
  } catch {
    return { state: "unknown", message: "Couldn't reach the internet to check. That's fine: Protégé works without it." };
  }
}
