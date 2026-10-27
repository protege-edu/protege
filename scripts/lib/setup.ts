/**
 * The first run, done for the teacher: find (or install) Ollama, download Gloam's model, and the voices if
 * they want them. The launcher runs this; the setup page (app/setup) shows it, through a small control
 * channel that only this computer can reach (127.0.0.1, with a secret).
 *
 * Nothing here needs admin rights: Ollama installs for this user only, like Protégé itself.
 */
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { dataDir } from "@/lib/db/location";
import type { SetupState } from "@/lib/setup/types";
import { setupVoice, voicesReady } from "../voice-setup";
import { download, type Reporter } from "./download";
import { aiBase, aiModel, models } from "./run";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const platform = process.platform === "win32" ? "windows" : process.platform === "darwin" ? "mac" : "other";

/** Where Ollama puts itself when it installs for one user */
const ollamaApp = () =>
  platform === "windows"
    ? path.join(process.env.LOCALAPPDATA ?? path.join(os.homedir(), "AppData", "Local"), "Programs", "Ollama", "ollama app.exe")
    : platform === "mac"
      ? ["/Applications/Ollama.app", path.join(os.homedir(), "Applications", "Ollama.app")].find((p) => fs.existsSync(p)) ?? null
      : null;

/** Ollama's own downloads (MIT licence), straight from ollama.com */
const OLLAMA = {
  windows: "https://ollama.com/download/OllamaSetup.exe",
  mac: "https://ollama.com/download/Ollama-darwin.zip",
};

/** What the teacher decided about voices, so Protégé doesn't ask every time */
const choicesFile = () => path.join(dataDir(), "setup.json");
function savedVoices(): "later" | null {
  try {
    return JSON.parse(fs.readFileSync(choicesFile(), "utf8")).voices === "later" ? "later" : null;
  } catch {
    return null;
  }
}

class SetupError extends Error {
  constructor(
    public what: string,
    public fix: string,
  ) {
    super(what);
  }
}

/** The plain-language version of whatever went wrong */
function explain(e: unknown): { what: string; fix: string } {
  if (e instanceof SetupError) return { what: e.what, fix: e.fix };
  const msg = e instanceof Error ? `${e.message} ${(e as { cause?: { code?: string } }).cause?.code ?? ""}` : String(e);
  if (/ENOSPC/.test(msg)) return { what: "This computer ran out of space.", fix: "Free up some space (empty the Recycle Bin or delete big files), then press Try again." };
  if (/fetch failed|ENOTFOUND|ECONNRESET|ETIMEDOUT|EAI_AGAIN|network|socket/i.test(msg)) {
    return { what: "The internet connection dropped.", fix: "Check the Wi-Fi, then press Try again. Gloam picks up where it left off when it can." };
  }
  return { what: "Something went wrong while setting up.", fix: "Press Try again. If it keeps happening, restart Protégé." };
}

export class Setup {
  state: SetupState = {
    phase: "checking",
    got: 0,
    total: 0,
    rate: 0,
    overall: 0,
    voices: voicesReady() ? "ready" : savedVoices() ?? "ask",
    voiceGot: 0,
    voiceTotal: 0,
    voiceStep: "",
    error: null,
    model: aiModel(),
    platform,
  };
  private running: Promise<void> | null = null;
  /** called when everything this run was going to do is done (the launcher starts the voices then) */
  onDone: () => void = () => {};

  /** is Gloam's brain already fully here? (then there's nothing to show) */
  static async brainReady(): Promise<boolean> {
    const have = await models();
    const m = aiModel();
    return !!have?.some((x) => x === m || x === `${m}:latest`);
  }

  /** start (or restart after an error) */
  run() {
    if (this.running) return this.running;
    this.state.error = null;
    this.running = this.brain()
      .then(() => this.voicesNow())
      .then(() => this.onDone())
      .catch((e) => {
        this.state.phase = "error";
        this.state.error = explain(e);
      })
      .finally(() => {
        this.running = null;
      });
    return this.running;
  }

  /** the teacher's answer to "want Gloam to talk and listen?" */
  chooseVoices(yes: boolean) {
    if (this.state.voices === "ready" || this.state.voices === "downloading") return;
    this.state.voices = yes ? "queued" : "later";
    fs.mkdirSync(dataDir(), { recursive: true });
    fs.writeFileSync(choicesFile(), JSON.stringify({ voices: yes ? "yes" : "later" }));
    // the brain's already done: start the voices now
    if (yes && this.state.phase === "ready" && !this.running) {
      this.running = this.voicesNow()
        .then(() => this.onDone())
        .finally(() => {
          this.running = null;
        });
    }
  }

  // ---- the brain: Ollama, then the model ----

  private async brain() {
    const s = this.state;
    s.phase = "checking";
    let have = await models();
    if (!have) {
      const app = ollamaApp();
      if (app && fs.existsSync(app)) {
        s.phase = "brain-start";
        startOllama(app);
      } else {
        await this.installOllama();
      }
      have = await this.waitForOllama();
    }
    const m = aiModel();
    if (!have.some((x) => x === m || x === `${m}:latest`)) await this.pullModel(m);
    s.phase = "ready";
    s.overall = 1;
  }

  private async installOllama() {
    const s = this.state;
    if (platform === "other") {
      throw new SetupError("Protégé can't install Gloam's brain on this kind of computer by itself.", "Install Ollama from ollama.com/download (it's free), then press Try again.");
    }
    await this.checkSpace(platform === "windows" ? 8 : 6);
    const dir = path.join(os.tmpdir(), "protege-setup");
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, platform === "windows" ? "OllamaSetup.exe" : "Ollama-darwin.zip");
    s.phase = "brain-download";
    await download(platform === "windows" ? OLLAMA.windows : OLLAMA.mac, file, this.meter((got, total) => (s.overall = total ? 0.4 * (got / total) : 0)));
    s.phase = "brain-install";
    s.got = s.total = 0;
    if (platform === "windows") {
      // Ollama's installer installs for this user only (no admin) and starts Ollama when it's done
      const code = await new Promise<number | null>((resolve) => {
        const p = spawn(file, ["/VERYSILENT", "/SUPPRESSMSGBOXES", "/NORESTART", "/SP-"], { stdio: "ignore", windowsHide: true });
        p.on("exit", resolve);
        p.on("error", () => resolve(-1));
      });
      if (code !== 0) {
        throw new SetupError("Gloam's brain (Ollama) didn't finish installing.", "Press Try again. If it happens again, install Ollama from ollama.com/download yourself, then press Try again.");
      }
    } else {
      // the Mac app goes in Applications (or the user's own Applications folder if that's not allowed)
      const into = canWrite("/Applications") ? "/Applications" : path.join(os.homedir(), "Applications");
      fs.mkdirSync(into, { recursive: true });
      const code = await new Promise<number | null>((resolve) => spawn("ditto", ["-x", "-k", file, into], { stdio: "ignore" }).on("exit", resolve));
      if (code !== 0) throw new SetupError("Gloam's brain (Ollama) didn't finish installing.", "Press Try again. If it happens again, install Ollama from ollama.com/download yourself.");
      startOllama(path.join(into, "Ollama.app"));
    }
    fs.rmSync(file, { force: true });
    s.phase = "brain-start";
    s.overall = 0.4;
    // (Ollama starts itself after installing; start it if it hasn't)
    await wait(4000);
    if (!(await models())) {
      const app = ollamaApp();
      if (app) startOllama(app);
    }
  }

  private async waitForOllama(): Promise<string[]> {
    for (let i = 0; i < 60; i++) {
      const have = await models();
      if (have) return have;
      await wait(2000);
    }
    throw new SetupError(
      "Gloam's brain is installed, but it won't start.",
      platform === "mac" ? "Open Ollama from your Applications folder, then press Try again." : "Open Ollama from the Start menu, then press Try again.",
    );
  }

  private async pullModel(model: string) {
    const s = this.state;
    await this.checkSpace(4);
    s.phase = "model";
    s.got = s.total = s.rate = 0;
    const start = s.overall;
    const report = this.meter((got, total) => (s.overall = start + (1 - start) * (total ? got / total : 0)));
    const res = await fetch(`${aiBase()}/api/pull`, { method: "POST", body: JSON.stringify({ name: model, stream: true }) });
    if (!res.ok || !res.body) throw new SetupError("Ollama wouldn't download Gloam's model.", "Press Try again. If it keeps happening, restart Ollama.");
    // the model comes in a few parts: add them all up
    const parts = new Map<string, { total: number; completed: number }>();
    let line = "";
    for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
      line += Buffer.from(chunk).toString();
      const lines = line.split("\n");
      line = lines.pop() ?? "";
      for (const l of lines) {
        if (!l.trim()) continue;
        const ev = JSON.parse(l) as { digest?: string; total?: number; completed?: number; error?: string };
        if (ev.error) throw new Error(`network: ${ev.error}`);
        if (ev.digest && ev.total) parts.set(ev.digest, { total: ev.total, completed: ev.completed ?? 0 });
        let got = 0;
        let total = 0;
        for (const p of parts.values()) {
          got += p.completed;
          total += p.total;
        }
        if (total) report.progress(got, total);
      }
    }
    if (!(await Setup.brainReady())) throw new SetupError("Gloam's model didn't finish downloading.", "Press Try again: it picks up where it stopped.");
  }

  // ---- voices (after the brain, so they don't fight over the internet) ----

  private async voicesNow() {
    const s = this.state;
    if (s.voices !== "queued" && s.voices !== "error") return;
    s.voices = "downloading";
    try {
      await setupVoice({
        say: (m) => {
          if (/^Downloading/.test(m)) {
            s.voiceStep = m.replace(/…$/, "");
            s.voiceGot = s.voiceTotal = 0;
          }
        },
        progress: (got, total) => {
          s.voiceGot = got;
          s.voiceTotal = total;
        },
      });
      s.voices = voicesReady() || platform !== "windows" ? "ready" : "error";
    } catch {
      s.voices = "error";
    }
  }

  // ---- helpers ----

  /** a Reporter that keeps the page's numbers (bytes, smoothed speed) */
  private meter(onProgress: (got: number, total: number) => void): Reporter {
    const s = this.state;
    let lastT = Date.now();
    let lastGot = 0;
    return {
      say: () => {},
      progress: (got, total) => {
        const now = Date.now();
        if (got < lastGot) lastGot = 0;
        const dt = (now - lastT) / 1000;
        if (dt > 0.25) {
          const r = (got - lastGot) / dt;
          s.rate = s.rate ? s.rate * 0.85 + r * 0.15 : r;
          lastT = now;
          lastGot = got;
        }
        s.got = got;
        s.total = total;
        onProgress(got, total);
      },
    };
  }

  private async checkSpace(gb: number) {
    try {
      const st = await fs.promises.statfs(os.homedir());
      const free = st.bavail * st.bsize;
      if (free < gb * 1e9) {
        throw new SetupError(
          `This computer only has ${(free / 1e9).toFixed(1)} GB of free space, and Gloam needs about ${gb} GB.`,
          "Free up some space (empty the Recycle Bin or delete big files), then press Try again.",
        );
      }
    } catch (e) {
      if (e instanceof SetupError) throw e;
    }
  }
}

function canWrite(dir: string) {
  try {
    fs.accessSync(dir, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

function startOllama(app: string) {
  if (platform === "mac") spawn("open", ["-a", app], { stdio: "ignore", detached: true }).unref();
  else spawn(app, [], { stdio: "ignore", detached: true }).unref();
}

// ---- the control channel: the setup page (through Protégé's server) talks to the launcher here ----

export interface Running {
  /** the address the launcher answers on, and its secret */
  control: string;
  token: string;
  /** the secret the setup page proves itself with (in its address, after #) */
  key: string;
  port: number;
  pid: number;
}

const runningFile = () => path.join(dataDir(), "running.json");

/** The launcher that's running now, if any (for "Stop Protégé" and a second double-click) */
export function running(): Running | null {
  try {
    return JSON.parse(fs.readFileSync(runningFile(), "utf8")) as Running;
  } catch {
    return null;
  }
}

/** Listen for the setup page (only on this computer). `stop` shuts Protégé down. */
export async function control(setup: Setup, port: number, stop: () => void): Promise<Running> {
  const token = crypto.randomBytes(24).toString("base64url");
  const key = crypto.randomBytes(24).toString("base64url");
  const server = http.createServer(async (req, res) => {
    const given = Buffer.from(req.headers.authorization?.replace(/^Bearer /, "") ?? "");
    const want = Buffer.from(token);
    if (given.length !== want.length || !crypto.timingSafeEqual(given, want)) return void res.writeHead(403).end();
    const send = (body: unknown) => res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(body));
    if (req.method === "GET" && req.url === "/state") return send(setup.state);
    let raw = "";
    for await (const c of req) {
      raw += c;
      if (raw.length > 1000) return void res.writeHead(413).end();
    }
    const body = (() => {
      try {
        return JSON.parse(raw || "{}") as { yes?: unknown };
      } catch {
        return {};
      }
    })();
    if (req.method === "POST" && req.url === "/voices") {
      setup.chooseVoices(body.yes === true);
      return send(setup.state);
    }
    if (req.method === "POST" && req.url === "/retry") {
      void setup.run();
      return send(setup.state);
    }
    if (req.method === "POST" && req.url === "/stop") {
      send({ ok: true });
      setTimeout(stop, 200);
      return;
    }
    res.writeHead(404).end();
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const addr = server.address();
  const info: Running = { control: `http://127.0.0.1:${typeof addr === "object" && addr ? addr.port : 0}`, token, key, port, pid: process.pid };
  fs.mkdirSync(dataDir(), { recursive: true });
  // only this user can read it (it's in their own app-data folder)
  fs.writeFileSync(runningFile(), JSON.stringify(info), { mode: 0o600 });
  const gone = () => {
    try {
      if (running()?.pid === process.pid) fs.rmSync(runningFile(), { force: true });
    } catch {}
  };
  process.on("exit", gone);
  server.unref();
  return info;
}
