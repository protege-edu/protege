/**
 * The launcher inside the Protégé download: what "Start Protégé" runs. A teacher needs nothing else
 * installed: Node comes in the download, and the first time, this finds (or helps install) Ollama and
 * downloads Gloam's model. Built into one file by scripts/release.ts.
 *
 *   node launch.js                 start Protégé for class (opens the teacher page)
 *   node launch.js --tunnel        ...and open a free tunnel, so students can join from anywhere
 *   node launch.js --setup-voice   download voice typing (whisper.cpp, runs on this laptop only), once
 *   node launch.js --no-open       don't open the browser (for tests)
 *   node launch.js --restore [date]          put Protégé back to an earlier day (stop it first)
 *   node launch.js --access-log [--all]      who viewed or changed students' information
 *   node launch.js --reset-teacher <email>   a new recovery code for a teacher
 *
 * A school can change settings in protege.env, next to this file (see protege.env.example).
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { announce, children, ensureAI, openInBrowser, relay, say, startVoice, stopAll } from "./lib/run";
import { setupVoice } from "./voice-setup";

declare const PROTEGE_VERSION: string;
const here = path.dirname(path.resolve(process.argv[1] ?? "."));
const env = path.join(here, "protege.env");
if (fs.existsSync(env)) process.loadEnvFile(env);
const PORT = Number(process.env.PORT ?? 3000);
const has = (flag: string) => process.argv.includes(flag);

async function main() {
  say(`\nProtégé ${typeof PROTEGE_VERSION === "string" ? PROTEGE_VERSION : ""}: getting ready for class\n`);
  if (has("--setup-voice")) {
    await setupVoice();
    return;
  }
  // jobs for whoever runs Protégé (restore a backup, the access log, reset a teacher): run inside the app,
  // which has the database library
  const job = ["--restore", "--access-log", "--reset-teacher"].find((j) => has(j));
  if (job) {
    const rest = process.argv.slice(process.argv.indexOf(job) + 1);
    const run = spawn(process.execPath, [path.join(here, "app", "admin.js"), job.slice(2), ...rest], { cwd: path.join(here, "app"), stdio: "inherit" });
    await new Promise((r) => run.on("exit", r));
    return;
  }
  // already running (a second double-click)? just open it
  const running = await fetch(`http://localhost:${PORT}/api/health`, { signal: AbortSignal.timeout(1500) }).then(
    () => true,
    () => false,
  );
  if (running) {
    say("Protégé is already running. Opening it.");
    openInBrowser(`http://localhost:${PORT}/teacher`);
    return;
  }
  await ensureAI({ help: true });
  await startVoice();

  const app = path.join(here, "app");
  const server = spawn(process.execPath, [path.join(app, "server.js")], {
    cwd: app,
    env: { ...process.env, PORT: String(PORT), HOSTNAME: "0.0.0.0", NODE_ENV: "production" },
    stdio: ["ignore", "pipe", "inherit"],
  });
  children.push(server);
  relay(server);
  server.on("exit", (code) => {
    say(`Protégé stopped${code ? ` (code ${code})` : ""}. Double-click Start Protégé to run it again.`);
    stopAll();
  });
  await announce(PORT, { useTunnel: has("--tunnel"), open: !has("--no-open") });
}

process.on("SIGINT", stopAll);
process.on("SIGTERM", stopAll);
main().catch((e) => {
  say(`Something went wrong starting Protégé: ${e instanceof Error ? e.message : e}`);
  process.exit(1);
});
