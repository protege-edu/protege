import { createHash } from "node:crypto";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { dataDir } from "@/lib/db/location";
import { SITE_URL } from "@/lib/hosting/site";
import { clearTunnel, saveTunnel, saveTunnelRoom } from "@/lib/hosting/tunnel";

/**
 * "Start Protégé online": Cloudflare's quick tunnel, so students reach this computer from any network (even a
 * school Wi-Fi that keeps devices apart). No account. Both ends connect OUT to the internet, which schools allow.
 *
 * cloudflared (Cloudflare's free, open-source tunnel program) is downloaded once, from its GitHub releases,
 * into Protégé's data folder, and checked against the checksum GitHub publishes before it ever runs.
 * Plainly: Cloudflare's servers can see what passes through a quick tunnel, and its address changes every time.
 */

const RELEASES = "https://api.github.com/repos/cloudflare/cloudflared/releases/latest";

/** Which download fits this computer (Windows on ARM runs the x64 one) */
function assetName(): string | null {
  const arm = os.arch() === "arm64";
  if (process.platform === "win32") return "cloudflared-windows-amd64.exe";
  if (process.platform === "darwin") return arm ? "cloudflared-darwin-arm64.tgz" : "cloudflared-darwin-amd64.tgz";
  if (process.platform === "linux") return arm ? "cloudflared-linux-arm64" : "cloudflared-linux-amd64";
  return null;
}

const toolPath = () => path.join(dataDir(), "tools", process.platform === "win32" ? "cloudflared.exe" : "cloudflared");

/** cloudflared, from this computer if it has it, otherwise downloaded (once). Null if it can't be had. */
export async function cloudflared(say: (s: string) => void): Promise<string | null> {
  const found = spawnSync(process.platform === "win32" ? "where" : "which", ["cloudflared"], { encoding: "utf8" });
  if (found.status === 0) return found.stdout.split(/\r?\n/)[0].trim();
  if (fs.existsSync(toolPath())) return toolPath();
  const name = assetName();
  if (!name) return null;
  try {
    say("… getting Cloudflare's tunnel program (once, about 40 MB)");
    const release = (await (await fetch(RELEASES, { headers: { accept: "application/vnd.github+json" } })).json()) as { tag_name: string; assets: { name: string; browser_download_url: string; digest?: string }[] };
    const asset = release.assets.find((a) => a.name === name);
    if (!asset?.digest?.startsWith("sha256:")) throw new Error("no checksum published for it");
    const data = Buffer.from(await (await fetch(asset.browser_download_url)).arrayBuffer());
    // never run something that isn't exactly what Cloudflare published
    if (createHash("sha256").update(data).digest("hex") !== asset.digest.slice(7)) throw new Error("the download didn't match its checksum");
    fs.mkdirSync(path.dirname(toolPath()), { recursive: true });
    if (name.endsWith(".tgz")) {
      const tgz = `${toolPath()}.tgz`;
      fs.writeFileSync(tgz, data);
      spawnSync("tar", ["-xzf", tgz, "-C", path.dirname(toolPath())]);
      fs.rmSync(tgz, { force: true });
    } else {
      fs.writeFileSync(toolPath(), data);
    }
    if (process.platform !== "win32") fs.chmodSync(toolPath(), 0o755);
    say(`✓ Cloudflare's tunnel program ${release.tag_name}, checked`);
    return toolPath();
  } catch (e) {
    say(`! Couldn't get Cloudflare's tunnel program (${e instanceof Error ? e.message : e}). Is this computer online?`);
    return null;
  }
}

/** Open the quick tunnel to `port`. Resolves with its address once Cloudflare has connected it (or null). */
export function quickTunnel(bin: string, port: number, children: ChildProcess[]): Promise<string | null> {
  return new Promise((resolve) => {
    const c = spawn(bin, ["tunnel", "--no-autoupdate", "--url", `http://localhost:${port}`], { stdio: ["ignore", "pipe", "pipe"] });
    children.push(c);
    let url: string | null = null;
    let settled = false;
    const done = (u: string | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (u) saveTunnel(u, c.pid ?? 0);
      resolve(u);
    };
    // (the address appears first; it works once a connection to Cloudflare is registered)
    const timer = setTimeout(() => done(url), 45_000);
    const read = (chunk: Buffer) => {
      const text = chunk.toString();
      url ??= text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/)?.[0] ?? null;
      if (url && /Registered tunnel connection/.test(text)) done(url);
    };
    c.stdout?.on("data", read);
    c.stderr?.on("data", read);
    c.on("exit", () => {
      clearTunnel();
      done(null);
    });
  });
}

/** This laptop's room on the website, and the secret that proves it's this laptop's (it stays here) */
const roomFile = () => path.join(dataDir(), "room.json");

/**
 * Tell the website where this laptop's room is now (site/room.ts), so students go to SITE_URL/j and type
 * the short code. The same room every time, so a link a teacher posted once keeps working. If the website
 * can't be reached (or has no rooms set up), students use the tunnel's own address instead.
 */
export async function registerRoom(url: string, say: (s: string) => void): Promise<string | null> {
  let mine: { room?: string; secret?: string } = {};
  try {
    mine = JSON.parse(fs.readFileSync(roomFile(), "utf8"));
  } catch {
    // (the first time online: the website gives this laptop a room)
  }
  try {
    const res = await fetch(`${SITE_URL}/api/room`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url, room: mine.room, secret: mine.secret }), signal: AbortSignal.timeout(10_000) });
    const r = (await res.json().catch(() => ({}))) as { room?: string; secret?: string; error?: string };
    if (!res.ok || !r.room || !r.secret) throw new Error(r.error ?? `the website answered ${res.status}`);
    fs.writeFileSync(roomFile(), JSON.stringify({ room: r.room, secret: r.secret }));
    saveTunnelRoom(r.room);
    return r.room;
  } catch (e) {
    say(`· No room on ${SITE_URL.replace(/^https?:\/\//, "")} this time (${e instanceof Error ? e.message : e}). Students use the tunnel's address instead.`);
    return null;
  }
}
