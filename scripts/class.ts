/**
 * Run Protégé for a real class, in one command:
 *   npm run class                 build, start, and show the address students use (same Wi-Fi)
 *   npm run class -- --tunnel     ...and open a free tunnel, so students can join from anywhere
 *   npm run class -- --no-build   start the last build again (faster)
 *
 * It checks the AI first (Ollama running, Gloam's model downloaded), so class doesn't start with a broken Gloam.
 */
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import os from "node:os";
import { loadEnvConfig } from "@next/env";
import QRCode from "qrcode";

loadEnvConfig(process.cwd());
const PORT = Number(process.env.PORT ?? 3000);
const has = (flag: string) => process.argv.includes(flag);
const aiBase = (process.env.AI_BASE_URL ?? "http://localhost:11434/v1").replace(/\/v1\/?$/, "");
const model = process.env.AI_MODEL ?? "qwen3:4b-instruct";
const say = (s = "") => console.log(s);
const children: ChildProcess[] = [];

function lanAddress(): string | null {
  for (const i of Object.values(os.networkInterfaces()).flat()) {
    if (i && i.family === "IPv4" && !i.internal && /^(10|172\.(1[6-9]|2\d|3[01])|192\.168)\./.test(i.address)) return i.address;
  }
  return null;
}

async function checkAI() {
  try {
    const tags = (await (await fetch(`${aiBase}/api/tags`, { signal: AbortSignal.timeout(4000) })).json()) as { models?: { name: string }[] };
    if (!tags.models?.some((m) => m.name === model || m.name === `${model}:latest`)) {
      say(`Gloam's brain (${model}) isn't downloaded yet. Run:\n\n  ollama pull ${model}\n`);
      process.exit(1);
    }
  } catch {
    say("Ollama isn't running. Open the Ollama app, then run this again.");
    process.exit(1);
  }
  say(`✓ Gloam's brain is ready (${model})`);
}

async function qr(url: string) {
  say(await QRCode.toString(url, { type: "terminal", small: true }));
}

function exists(cmd: string) {
  return spawnSync(process.platform === "win32" ? "where" : "which", [cmd], { stdio: "ignore" }).status === 0;
}

/** Open a free tunnel. Tailscale Funnel gives a fixed address (needed for Google); Cloudflare's quick tunnel needs no account. */
function tunnel(): Promise<string | null> {
  if (process.env.PUBLIC_URL && exists("tailscale")) {
    children.push(spawn("tailscale", ["funnel", String(PORT)], { stdio: "ignore" }));
    return Promise.resolve(process.env.PUBLIC_URL);
  }
  if (exists("cloudflared")) {
    return new Promise((resolve) => {
      const c = spawn("cloudflared", ["tunnel", "--url", `http://localhost:${PORT}`]);
      children.push(c);
      const timer = setTimeout(() => resolve(null), 30000);
      const find = (chunk: Buffer) => {
        const m = chunk.toString().match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
        if (m) {
          clearTimeout(timer);
          resolve(m[0]);
        }
      };
      c.stdout?.on("data", find);
      c.stderr?.on("data", find);
    });
  }
  say("No tunnel program found. Install Tailscale or cloudflared (see the README, \"Putting Protégé online\").");
  return Promise.resolve(null);
}

async function main() {
  say("\nProtégé: getting ready for class\n");
  await checkAI();

  if (!has("--no-build")) {
    say("… building (about a minute)");
    const b = spawnSync("npx next build", { stdio: "ignore", shell: true });
    if (b.status !== 0) {
      say("The build failed. Run `npx next build` to see why.");
      process.exit(1);
    }
    say("✓ Built");
  }

  const server = spawn(`npx next start -p ${PORT} -H 0.0.0.0`, { stdio: ["ignore", "pipe", "inherit"], shell: true });
  children.push(server);
  // pass on what the server prints that matters (like the first-time setup code)
  server.stdout?.on("data", (d: Buffer) => {
    const text = d.toString();
    if (/setup code|│|┌|└|error/i.test(text)) process.stdout.write(text);
  });
  for (let i = 0; i < 60; i++) {
    try {
      await fetch(`http://localhost:${PORT}/api/health`, { signal: AbortSignal.timeout(2000) });
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  // warm Gloam up (loads the model) and print the setup code if nobody has an account yet
  await fetch(`http://localhost:${PORT}/api/teacher/auth`).catch(() => undefined);
  say(`✓ Protégé is running\n`);

  say(`Teacher:  http://localhost:${PORT}/teacher  (on this laptop)`);
  const lan = lanAddress();
  let students = lan ? `http://${lan}:${PORT}` : null;
  if (has("--tunnel")) {
    say("… opening the tunnel");
    const url = await tunnel();
    if (url) students = url;
  } else if (process.env.PUBLIC_URL) {
    students = process.env.PUBLIC_URL;
  }
  if (students) {
    say(`Students: ${students}  (or the QR code below; then they type the class code)\n`);
    await qr(`${students}/join`);
  }
  say("Keep this window open and the laptop awake during class. Press Ctrl+C to stop.\n");
}

const stop = () => {
  for (const c of children) c.kill();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
void main();
