/**
 * The launcher inside the Protégé download: what "Start Protégé" runs. A teacher needs nothing else
 * installed: Node comes in the download, and the first time, the setup page (app/setup) shows Gloam waking
 * up while this installs Ollama and downloads Gloam's model (scripts/lib/setup.ts). Built into one file by
 * scripts/release.ts.
 *
 *   node launch.js                 start Protégé for class (opens the setup page, which goes on to the teacher page)
 *   node launch.js --stop          stop the Protégé that's running
 *   node launch.js --tunnel        ...and open a free tunnel, so students can join from anywhere
 *   node launch.js --setup-voice   download the voices, once: voice typing (whisper.cpp) and Gloam's
 *                                  read-aloud voice (Kokoro); both run on this laptop only
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
import { announce, children, openInBrowser, relay, say, startReadAloud, startVoice, stopAll } from "./lib/run";
import { control, running, Setup } from "./lib/setup";
import { runSpeaker } from "./speak";
import { setupVoice } from "./voice-setup";

declare const PROTEGE_VERSION: string;
const here = path.dirname(path.resolve(process.argv[1] ?? "."));
const env = path.join(here, "protege.env");
if (fs.existsSync(env)) process.loadEnvFile(env);
const PORT = Number(process.env.PORT ?? 3000);
const has = (flag: string) => process.argv.includes(flag);

async function main() {
  // the read-aloud helper, started by the launcher itself (see startReadAloud)
  if (has("--speaker")) return runSpeaker();
  // "Stop Protégé" (the Start menu shortcut)
  if (has("--stop")) {
    const r = running();
    const stopped = r && (await fetch(`${r.control}/stop`, { method: "POST", headers: { authorization: `Bearer ${r.token}` } }).then((res) => res.ok, () => false));
    say(stopped ? "Protégé stopped." : "Protégé isn't running.");
    return;
  }
  say(`\nProtégé ${typeof PROTEGE_VERSION === "string" ? PROTEGE_VERSION : ""}: getting ready for class\n`);
  // the window's name in the taskbar
  process.title = "Protégé is running (close this window to stop it)";
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
  const up = await fetch(`http://localhost:${PORT}/api/teacher/auth`, { signal: AbortSignal.timeout(1500) }).then(
    () => true,
    () => false,
  );
  if (up) {
    say("Protégé is already running. Opening it.");
    const r = running();
    openInBrowser(`http://localhost:${PORT}${r ? `/setup#${r.key}` : "/teacher"}`);
    return;
  }

  // The first run is done in the browser (app/setup): Gloam wakes up while its brain installs and downloads.
  // The setup page also greets the teacher on every later start, then goes straight to their page.
  const setup = new Setup();
  const info = await control(setup, PORT, stopAll);
  const helpers = async () => {
    await startVoice();
    await startReadAloud([path.resolve(process.argv[1]), "--speaker"]);
  };
  setup.onDone = () => void helpers();

  const app = path.join(here, "app");
  const server = spawn(process.execPath, [path.join(app, "server.js")], {
    cwd: app,
    env: {
      ...process.env,
      PORT: String(PORT),
      HOSTNAME: "0.0.0.0",
      NODE_ENV: "production",
      PROTEGE_CONTROL: info.control,
      PROTEGE_CONTROL_TOKEN: info.token,
      PROTEGE_SETUP_KEY: info.key,
    },
    stdio: ["ignore", "pipe", "inherit"],
  });
  children.push(server);
  relay(server);
  server.on("exit", (code) => {
    say(`Protégé stopped${code ? ` (code ${code})` : ""}. Double-click Start Protégé to run it again.`);
    stopAll();
  });
  // PROTEGE_SETUP=off (in protege.env): school IT manages Ollama and the model itself, so Protégé never installs or
  // downloads anything when it starts (the "Ready for class?" page still says if something's missing)
  if (process.env.PROTEGE_SETUP === "off") {
    Object.assign(setup.state, { phase: "ready", overall: 1, voices: setup.state.voices === "ask" ? "later" : setup.state.voices });
    void helpers();
  } else void setup.run();
  await announce(PORT, { useTunnel: has("--tunnel"), open: has("--no-open") ? false : `/setup#${info.key}` });
}

process.on("SIGINT", stopAll);
process.on("SIGTERM", stopAll);
main().catch((e) => {
  say(`Something went wrong starting Protégé: ${e instanceof Error ? e.message : e}`);
  process.exit(1);
});
