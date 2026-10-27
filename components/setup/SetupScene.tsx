"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { GloamMood } from "@/components/gloam/poses";
import { TypedLine } from "@/components/game/TypedLine";
import { InkButton } from "@/components/ui/InkButton";
import { Wordmark } from "@/components/ui/Logo";
import { Sheet } from "@/components/ui/Sheet";
import { lineFor, SETUP_LINES as L } from "@/lib/setup/lines";
import { size, timeLeft, type SetupState } from "@/lib/setup/types";
import { useCalmMotion } from "@/lib/useCalmMotion";
import { SetupWorld } from "./SetupWorld";

interface Reply {
  available: boolean;
  state: SetupState | null;
  firstTeacher: boolean;
  signedIn: boolean;
}

type Card = "hello" | "account" | "recovery" | "voices" | "waiting" | "awake" | "back" | "elsewhere";

const KEY = "protege-setup-key";

/** The secret the launcher put in this page's address (kept for reloads, and taken out of the address bar) */
function setupKey(): string | null {
  const fromHash = window.location.hash.slice(1);
  try {
    if (fromHash) {
      sessionStorage.setItem(KEY, fromHash);
      window.history.replaceState(null, "", window.location.pathname);
      return fromHash;
    }
    return sessionStorage.getItem(KEY);
  } catch {
    return fromHash || null;
  }
}

/**
 * The first time Protégé starts on a teacher's laptop: Gloam is asleep in its valley while its brain
 * installs and downloads. The teacher makes their account and decides about voices meanwhile, and when
 * everything's ready Gloam wakes up. On every later start it just says hi and goes to the teacher page.
 */
export function SetupScene() {
  const calm = useCalmMotion();
  const key = useRef<string | null>(null);
  const [reply, setReply] = useState<Reply | null>(null);
  const [card, setCard] = useState<Card | null>(null);
  const [recovery, setRecovery] = useState<string | null>(null);
  const [poked, setPoked] = useState<string | null>(null);
  const [typingTick, setTypingTick] = useState(0);
  const [wide, setWide] = useState(true);
  // seconds on this page (for Gloam's slowly changing lines), counted by the poll below
  const [elapsed, setElapsed] = useState(0);
  const pokes = useRef(0);

  // ask the launcher how it's going, often (it's all on this computer)
  useEffect(() => {
    key.current = setupKey();
    let stop = false;
    const ask = async () => {
      try {
        const res = await fetch("/api/setup", { headers: { "x-setup-key": key.current ?? "" }, cache: "no-store" });
        if (res.status === 403) return setReply({ available: false, state: null, firstTeacher: false, signedIn: false });
        setReply((await res.json()) as Reply);
      } catch {
        // Protégé stopped: keep showing the last state
      }
    };
    void ask();
    const t = setInterval(() => {
      if (!stop) void ask();
      setElapsed((e) => e + 0.7);
    }, 700);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 56rem)");
    const update = () => setWide(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const state = reply?.state ?? null;
  const ready = state?.phase === "ready";

  // which card to show, from what's true right now (the teacher moves through hello → account → voices themselves)
  useEffect(() => {
    if (!reply) return;
    void Promise.resolve().then(() =>
      setCard((c) => {
        if (!reply.available || !reply.state) return "elsewhere";
        if (c === "recovery" || c === "account") return c;
        if (reply.firstTeacher) return c === "hello" || c === null ? "hello" : "account";
        if (reply.state.voices === "ask") return "voices";
        if (reply.state.phase === "ready") return c === "waiting" || c === "voices" ? "awake" : c === "awake" ? "awake" : "back";
        return "waiting";
      }),
    );
  }, [reply]);

  // a later start with everything ready: hi, then straight to the teacher page
  useEffect(() => {
    if (card !== "back") return;
    const t = setTimeout(() => window.location.replace("/teacher"), calm ? 300 : 1900);
    return () => clearTimeout(t);
  }, [card, calm]);

  const send = useCallback(async (body: unknown) => {
    const res = await fetch("/api/setup", { method: "POST", headers: { "content-type": "application/json", "x-setup-key": key.current ?? "" }, body: JSON.stringify(body) });
    const data = (await res.json().catch(() => ({}))) as { error?: string; recoveryCode?: string; state?: SetupState };
    return { ok: res.ok, data };
  }, []);

  const onPoke = () => {
    const awake = ready && card !== "hello";
    const lines = awake ? L.pokedAwake : L.poked;
    setPoked(lines[pokes.current++ % lines.length]);
    setTypingTick((t) => t + 1);
    setTimeout(() => setPoked(null), 2600);
  };

  const seconds = elapsed;
  const awakeNow = card === "awake" || card === "back";
  const mood: GloamMood = poked ? (awakeNow ? "skeptical" : "confused") : awakeNow ? (seconds % 9 < 6 ? "proud" : "curious") : card === "elsewhere" ? "curious" : "asleep";
  const progress = card === "back" ? 1 : (state?.overall ?? 0);

  const line = poked ?? gloamLine(card, state, seconds);

  return (
    <main data-age-style="senior" className="relative h-dvh overflow-hidden bg-bg text-ink">
      <SetupWorld
        progress={progress}
        mood={mood}
        talking={!!line}
        typingTick={typingTick}
        focus={wide ? 0.3 : 0.5}
        height={wide ? 0.42 : 0.19}
        groundAt={wide ? null : 0.39}
        onPoke={onPoke}
        pokeLabel={awakeNow ? "Poke Gloam" : "Poke Gloam (it's asleep)"}
      />

      <header className="pointer-events-none absolute top-0 left-0 p-5 min-[56rem]:p-8">
        <Wordmark tone="light" className="h-8" />
      </header>

      {/* what Gloam says: right above its head */}
      {line && (
        <div
          className={`pointer-events-none absolute ${wide ? "top-[14%] left-[30%] w-[min(380px,32vw)] -translate-x-1/2" : "top-[3.75rem] left-1/2 w-[min(330px,86vw)] -translate-x-1/2"}`}
          aria-live="polite"
        >
          <TypedLine key={line} text={line} shape={awakeNow ? 40 : -10} animate className="text-center text-md leading-snug text-ink drop-shadow-[0_2px_10px_rgb(0_0_0/0.8)]" />
        </div>
      )}

      <section
        className={
          wide
            ? "absolute top-1/2 right-[6vw] w-[min(460px,40vw)] -translate-y-1/2"
            : "absolute inset-x-0 bottom-0 top-[42dvh] overflow-y-auto px-4 pb-6"
        }
        aria-label="Setting up Protégé"
      >
        <AnimatePresence mode="wait">
          {card && (
            <motion.div
              key={card}
              initial={calm ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={calm ? undefined : { opacity: 0, y: -10 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              <Sheet seed={card} tone="night" className="w-full" bodyClassName="p-6 min-[56rem]:p-8">
                {card === "hello" && <Hello onGo={() => setCard("account")} state={state} />}
                {card === "account" && (
                  <Account
                    state={state}
                    onTyping={() => setTypingTick((t) => t + 1)}
                    onDone={(code) => {
                      setRecovery(code);
                      setCard("recovery");
                    }}
                    send={send}
                  />
                )}
                {card === "recovery" && recovery && <Recovery code={recovery} onDone={() => setCard(state?.voices === "ask" ? "voices" : ready ? "awake" : "waiting")} />}
                {card === "voices" && state && (
                  <Voices
                    state={state}
                    onChoose={async (yes) => {
                      await send({ action: "voices", yes });
                      setCard(ready ? "awake" : "waiting");
                    }}
                  />
                )}
                {card === "waiting" && state && <Waiting state={state} onRetry={() => void send({ action: "retry" })} />}
                {card === "awake" && state && <Awake state={state} />}
                {card === "back" && <Back />}
                {card === "elsewhere" && <Elsewhere />}
              </Sheet>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </main>
  );
}

/** Gloam's line for this moment (null: it's quiet) */
function gloamLine(card: Card | null, s: SetupState | null, seconds: number): string | null {
  if (card === "hello") return L.hello;
  if (card === "account") return L.account;
  if (card === "voices") return L.voices;
  if (card === "awake") return L.awake;
  if (card === "back") return L.welcomeBack;
  if (!s || card !== "waiting") return null;
  if (s.phase === "error") return L.error;
  if (s.phase === "checking") return L.checking;
  if (s.phase === "brain-download") return lineFor(L.brainDownload, seconds);
  if (s.phase === "brain-install") return L.brainInstall;
  if (s.phase === "brain-start") return L.brainStart;
  if (s.phase === "model") return lineFor(L.model, seconds, 26);
  return null;
}

// ---- the cards ----

function Title({ children }: { children: ReactNode }) {
  return <h1 className="text-lg leading-tight font-bold text-ink">{children}</h1>;
}

function Hello({ onGo, state }: { onGo: () => void; state: SetupState | null }) {
  const big = state && state.phase !== "ready";
  return (
    <div>
      <Title>Let&apos;s get Protégé ready</Title>
      <p className="mt-3 text-sm leading-relaxed text-ink-dim">
        Protégé runs on this computer, AI included, so nothing about your students ever leaves it.
        {big
          ? " The first time, Gloam's brain has to download. It's big (a few GB), so it takes a while. You can make your account while it downloads."
          : " Gloam's brain is already here, so this only takes a minute."}
      </p>
      <Progress state={state} compact />
      <InkButton size="lg" className="mt-6 w-full" onClick={onGo}>
        Make my teacher account
      </InkButton>
    </div>
  );
}

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="mt-4 block">
      <span className="text-sm font-bold text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-dim">{hint}</span>}
    </label>
  );
}

const input = "mt-1.5 block min-h-11 w-full rounded-md border border-line bg-[var(--t-panel-2)] px-3 text-sm text-ink placeholder:text-ink-dim/70";

function Account({ state, onTyping, onDone, send }: { state: SetupState | null; onTyping: () => void; onDone: (code: string) => void; send: (b: unknown) => Promise<{ ok: boolean; data: { error?: string; recoveryCode?: string } }> }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await send({ action: "account", name, email, password }).catch(() => ({ ok: false, data: { error: "Can't reach Protégé. Is it still running?" } as { error?: string; recoveryCode?: string } }));
    setBusy(false);
    if (!r.ok || !r.data.recoveryCode) return setError(r.data.error ?? "That didn't work. Try again.");
    onDone(r.data.recoveryCode);
  };
  return (
    <form onSubmit={submit} onChange={onTyping}>
      <Title>Make your teacher account</Title>
      <p className="mt-2 text-sm text-ink-dim">It stays on this computer. Other teachers at your school can join later with an invite.</p>
      <Field label="Your name" hint="What your students call you is fine.">
        <input className={input} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required maxLength={60} />
      </Field>
      <Field label="Email">
        <input className={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required maxLength={120} />
      </Field>
      <Field label="Password" hint="At least 8 characters.">
        <input className={input} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required minLength={8} maxLength={200} />
      </Field>
      {error && (
        <p role="alert" className="mt-4 text-sm font-bold text-[var(--t-warn)]">
          {error}
        </p>
      )}
      <InkButton type="submit" size="lg" className="mt-6 w-full" disabled={busy}>
        {busy ? "Making your account…" : "Make my account"}
      </InkButton>
      <Progress state={state} compact />
    </form>
  );
}

function Recovery({ code, onDone }: { code: string; onDone: () => void }) {
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const download = () => {
    const blob = new Blob([`Protégé recovery code: ${code}\n\nIf you ever forget your password, sign in with "I forgot my password" and type this code.\nKeep it somewhere safe. It works once, then you get a new one.\n`], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "Protégé recovery code.txt";
    a.click();
    URL.revokeObjectURL(a.href);
    setSaved(true);
  };
  return (
    <div>
      <Title>Save your recovery code</Title>
      <p className="mt-2 text-sm text-ink-dim">If you ever forget your password, this code lets you back in. Nobody else can reset it for you, so keep it somewhere safe.</p>
      <p className="mt-5 rounded-md border border-dashed border-[var(--t-moon)] px-4 py-4 text-center font-mono text-lg font-bold tracking-[0.1em] whitespace-nowrap text-ink select-all">{code}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <InkButton
          variant="quiet"
          onClick={() => {
            void navigator.clipboard?.writeText(code).then(() => {
              setCopied(true);
              setSaved(true);
            });
          }}
        >
          {copied ? "Copied" : "Copy it"}
        </InkButton>
        <InkButton variant="quiet" onClick={download}>
          Save it as a file
        </InkButton>
      </div>
      <label className="mt-5 flex min-h-11 cursor-pointer items-center gap-3 text-sm text-ink">
        <input type="checkbox" className="h-5 w-5 accent-[var(--t-moon)]" checked={saved} onChange={(e) => setSaved(e.target.checked)} />
        I saved my recovery code
      </label>
      <InkButton size="lg" className="mt-4 w-full" disabled={!saved} onClick={onDone}>
        Continue
      </InkButton>
    </div>
  );
}

function Voices({ state, onChoose }: { state: SetupState; onChoose: (yes: boolean) => void }) {
  const mac = state.platform !== "windows";
  return (
    <div>
      <Title>Do you want Gloam to talk and listen?</Title>
      <ul className="mt-3 space-y-2 text-sm leading-relaxed text-ink-dim">
        {!mac && (
          <li>
            <b className="text-ink">Talk instead of typing:</b> students can say their explanation. Their voice is turned into words on this computer and never saved.
          </li>
        )}
        <li>
          <b className="text-ink">Read aloud:</b> Gloam reads its words out in a natural voice, made on this computer.
        </li>
      </ul>
      <p className="mt-3 text-sm text-ink-dim">It&apos;s optional, and about {mac ? "350 MB" : "850 MB"} more. It downloads after Gloam&apos;s brain. Students who need it most (and the youngest ones) get the most out of it.</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <InkButton size="lg" className="flex-1" onClick={() => onChoose(true)}>
          Yes, add voices
        </InkButton>
        <InkButton size="lg" variant="quiet" className="flex-1" onClick={() => onChoose(false)}>
          Not now
        </InkButton>
      </div>
    </div>
  );
}

function Waiting({ state, onRetry }: { state: SetupState; onRetry: () => void }) {
  if (state.phase === "error" && state.error) {
    return (
      <div role="alert">
        <Title>{state.error.what}</Title>
        <p className="mt-3 text-sm leading-relaxed text-ink-dim">{state.error.fix}</p>
        <InkButton size="lg" className="mt-6 w-full" onClick={onRetry}>
          Try again
        </InkButton>
      </div>
    );
  }
  return (
    <div>
      <Title>Gloam&apos;s brain is on its way</Title>
      <p className="mt-2 text-sm text-ink-dim">You can leave this page open and do something else. Protégé keeps going by itself.</p>
      <Progress state={state} />
      <VoiceNote state={state} />
    </div>
  );
}

function Awake({ state }: { state: SetupState }) {
  const router = useRouter();
  return (
    <div>
      <Title>Protégé is ready</Title>
      <p className="mt-3 text-sm leading-relaxed text-ink-dim">Make a class, give it a lesson (your own notes, or the built-in one), and press Show the code. Students go to the address on the screen and join with the code.</p>
      <VoiceNote state={state} />
      <InkButton size="lg" className="mt-6 w-full" onClick={() => router.push("/teacher")}>
        Make my first class
      </InkButton>
    </div>
  );
}

function Back() {
  return (
    <div>
      <Title>Opening your classes…</Title>
      <p className="mt-3">
        <a href="/teacher" className="text-sm font-bold text-ink underline decoration-[var(--t-moon)] underline-offset-4">
          Go now
        </a>
      </p>
    </div>
  );
}

function Elsewhere() {
  return (
    <div>
      <Title>This page only works on the computer running Protégé</Title>
      <p className="mt-3 text-sm leading-relaxed text-ink-dim">It opens by itself when Protégé starts. If you&apos;re a teacher, go to the teacher page instead.</p>
      <a href="/teacher" className="mt-6 inline-block text-sm font-bold text-ink underline decoration-[var(--t-moon)] underline-offset-4">
        Go to the teacher page
      </a>
    </div>
  );
}

/** What's happening, in plain words with real numbers, and a thin line of moonlight */
function Progress({ state, compact = false }: { state: SetupState | null; compact?: boolean }) {
  if (!state || state.phase === "ready") return null;
  const what: Record<string, string> = {
    checking: "Looking for Gloam's brain on this computer…",
    "brain-download": "Downloading Gloam's brain (Ollama, free and open source)",
    "brain-install": "Installing Ollama. This takes a minute or two.",
    "brain-start": "Starting Gloam's brain…",
    model: `Downloading what Gloam knows (${state.model})`,
    error: "Setup stopped.",
  };
  const counting = (state.phase === "brain-download" || state.phase === "model") && state.total > 0;
  const left = counting ? timeLeft(state.got, state.total, state.rate) : null;
  const pct = Math.round(state.overall * 100);
  return (
    <div className={compact ? "mt-5" : "mt-6"}>
      <p className="text-sm font-bold text-ink">{what[state.phase]}</p>
      {counting && (
        <p className="mt-1 text-xs text-ink-dim">
          {size(state.got)} of {size(state.total)}
          {left ? `, ${left}` : ""}
        </p>
      )}
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--t-chip)]" role="progressbar" aria-label="Setup" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
        <div className="h-full rounded-full bg-[var(--t-moon)] shadow-[0_0_12px_rgb(142_197_220/0.7)] transition-[width] duration-700" style={{ width: `${Math.max(2, pct)}%` }} />
      </div>
    </div>
  );
}

function VoiceNote({ state }: { state: SetupState }) {
  if (state.voices === "queued") return <p className="mt-4 text-xs text-ink-dim">Gloam&apos;s voices download next.</p>;
  if (state.voices === "downloading") {
    return (
      <p className="mt-4 text-xs text-ink-dim">
        Gloam&apos;s voices are downloading{state.voiceTotal ? ` (${size(state.voiceGot)} of ${size(state.voiceTotal)} of this part)` : ""}. You can start using Protégé already.
      </p>
    );
  }
  if (state.voices === "error") return <p className="mt-4 text-xs text-ink-dim">The voices didn&apos;t download. Protégé works without them. It asks again next time it starts.</p>;
  return null;
}
