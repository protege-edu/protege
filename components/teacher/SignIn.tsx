"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { InkButton } from "@/components/ui/InkButton";
import { Wordmark } from "@/components/ui/Logo";
import { Sheet } from "@/components/ui/Sheet";
import { useCalmMotion } from "@/lib/useCalmMotion";

type Mode = "signin" | "signup" | "recover";

export interface AuthStatus {
  teacher: { id: string; email: string; name: string; onboardedAt: string | null; schoolId: string | null; owner: boolean } | null;
  firstTeacher: boolean;
  /** setup: no accounts yet, the first (the owner) needs the setup code Protégé printed. staff: needs their school's staff code. */
  signUp: "setup" | "staff";
  google: boolean;
}

async function post<T>(body: unknown): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await fetch("/api/teacher/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    return res.ok ? { ok: true, data } : { ok: false, error: data.error ?? "Something went wrong. Try again." };
  } catch {
    return { ok: false, error: "Can't reach Protégé. Check your internet connection, then try again." };
  }
}

/**
 * The teacher's way in: sign in, make an account, or use a recovery code.
 * Set at night in Gloam's valley: the painted panorama, drifting fireflies, and the form on a torn-paper card.
 */
export function SignIn({ status, onSignedIn }: { status: AuthStatus; onSignedIn: () => void }) {
  const [mode, setMode] = useState<Mode>(status.firstTeacher ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [invite, setInvite] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [recovery, setRecovery] = useState<string | null>(null);

  // back from Google with an account Protégé doesn't know yet
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("google") !== "noaccount") return;
    void Promise.resolve().then(() => {
      setError("No teacher account uses that Google account yet. To make one, type your school's staff code first.");
      setMode("signup");
    });
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  const needsCode = mode === "signup";
  const googleHref = `/api/auth/google/start?who=teacher${needsCode && invite.trim() ? `&code=${encodeURIComponent(invite.trim())}` : ""}`;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await post<{ recoveryCode?: string }>(mode === "signup" ? { action: "signup", email, password, name, code: invite } : mode === "signin" ? { action: "signin", email, password } : { action: "recover", email, code, password });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    if (r.data.recoveryCode) return setRecovery(r.data.recoveryCode);
    onSignedIn();
  };

  if (recovery) return <RecoveryCode code={recovery} onDone={onSignedIn} />;

  const title = mode === "signup" ? (status.firstTeacher ? "Welcome. Let's set you up." : "Make your teacher account") : mode === "signin" ? "Welcome back" : "Forgot your password?";
  const sub =
    mode === "signup"
      ? status.signUp === "setup"
        ? "You're the first teacher on this Protégé, so you're its owner: you'll add schools and give them their staff codes."
        : "You'll need your school's staff code. Your classes and lessons stay private to you."
      : mode === "signin"
        ? "Sign in to your classes, lessons and dashboards."
        : "Use the recovery code you saved when you made your account.";

  return (
    <NightScene>
      <motion.section
        aria-labelledby="signin-title"
        className="w-full max-w-[440px]"
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <Sheet seed="signin" tone="night" radius={26} className="px-7 py-8 sm:px-9 sm:py-9">
          <p className="text-2xl text-ink">
            <Wordmark tone="dark" />
          </p>
          {/* a key change (sign in / make an account / recover) crossfades its words, so the card feels alive */}
          <AnimatePresence mode="wait">
            <motion.div key={`${mode}-${status.firstTeacher}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.28 }}>
              <h1 id="signin-title" className="voice mt-6 text-xl leading-tight text-ink" style={{ ["--casual" as string]: 0.4 }}>
                {title}
              </h1>
              <p className="mt-2 text-sm text-ink-dim">{sub}</p>
            </motion.div>
          </AnimatePresence>

          {needsCode && (
            <div className="mt-6">
              {status.signUp === "setup" ? (
                <Field
                  id="invite"
                  label="Setup code"
                  hint="It's in Protégé's logs: on Vercel, open Logs and search for setup code."
                  value={invite}
                  onChange={setInvite}
                  autoComplete="off"
                />
              ) : (
                <Field
                  id="invite"
                  label="Staff code"
                  hint="Your school's code, like ABCD-EFGH-JKLM. Ask your principal, or a teacher at your school who uses Protégé. Type it first, then pick how to sign up."
                  value={invite}
                  onChange={setInvite}
                  autoComplete="off"
                />
              )}
            </div>
          )}

          {status.google && mode !== "recover" && (
            <>
              <a
                href={googleHref}
                className="mt-6 flex min-h-12 items-center justify-center gap-3 rounded-md border border-line bg-panel px-4 text-sm font-bold text-ink transition-colors hover:bg-chip focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--t-focus)]"
              >
                <GoogleG /> Continue with Google
              </a>
              <p className="my-4 flex items-center gap-3 text-xs text-ink-dim">
                <span className="h-px flex-1 bg-line" /> or with email <span className="h-px flex-1 bg-line" />
              </p>
            </>
          )}

          <form onSubmit={submit} className={`flex flex-col gap-3 ${status.google && mode !== "recover" ? "" : "mt-6"}`}>
            {mode === "signup" && <Field id="name" label="Your name" hint="What students call you is fine." value={name} onChange={setName} autoComplete="name" />}
            <Field id="email" label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
            {mode === "recover" && <Field id="code" label="Recovery code" hint="It looks like ABCD-EFGH-JKLM." value={code} onChange={setCode} autoComplete="off" />}
            <Field
              id="password"
              label={mode === "recover" ? "New password" : "Password"}
              type="password"
              hint={mode === "signin" ? undefined : "At least 8 characters."}
              value={password}
              onChange={setPassword}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
            />
            {error && (
              <p role="alert" className="text-sm font-bold text-[#ffb4b4]">
                {error}
              </p>
            )}
            <InkButton type="submit" size="lg" disabled={busy} className="mt-2 w-full">
              {busy ? "One moment…" : mode === "signup" ? "Make my account" : mode === "signin" ? "Sign in" : "Set my new password"}
            </InkButton>
          </form>

          <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {mode !== "signin" && !status.firstTeacher && <Swap onClick={() => setMode("signin")}>I already have an account</Swap>}
            {mode !== "signup" && <Swap onClick={() => setMode("signup")}>Make an account</Swap>}
            {mode === "signin" && <Swap onClick={() => setMode("recover")}>Forgot your password?</Swap>}
          </div>
        </Sheet>

        <motion.p
          className="voice mt-5 text-center text-sm text-[#9fb2a8]"
          style={{ ["--casual" as string]: 1, ["--slant" as string]: -5 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
        >
          your students teach. gloam learns. you see what they think.
        </motion.p>
      </motion.section>
    </NightScene>
  );
}

function Swap({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="min-h-11 cursor-pointer font-bold text-ink-dim underline-offset-4 hover:text-ink hover:underline">
      {children}
    </button>
  );
}

export function Field({
  id,
  label,
  hint,
  value,
  onChange,
  type = "text",
  autoComplete,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-bold text-ink">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="min-h-12 rounded-md border border-line bg-panel px-3 text-md text-ink transition-colors focus:border-[var(--t-focus)] focus:outline-none"
      />
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-ink-dim">
          {hint}
        </p>
      )}
    </div>
  );
}

/** Shown once, right after making an account (or using a code): the way back in if a password is forgotten */
function RecoveryCode({ code, onDone }: { code: string; onDone: () => void }) {
  const [saved, setSaved] = useState(false);
  return (
    <NightScene>
      <motion.div className="w-full max-w-[440px]" initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
        <Sheet seed="recovery" tone="night" radius={26} className="px-7 py-8 sm:px-9">
          <h1 className="voice text-xl leading-tight text-ink" style={{ ["--casual" as string]: 0.4 }}>
            Save your recovery code
          </h1>
          <p className="mt-2 text-sm text-ink-dim">If you ever forget your password, this code gets you back in. It&apos;s shown only once, and each code works once. Write it down or save it somewhere safe.</p>
          <p className="mt-5 rounded-md border border-dashed border-line bg-panel px-4 py-4 text-center font-mono text-xl font-bold tracking-[0.12em] text-ink select-all">{code}</p>
          <label className="mt-5 flex min-h-11 cursor-pointer items-center gap-3 text-sm text-ink">
            <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} className="h-5 w-5 accent-[var(--t-accent)]" />
            I&apos;ve saved it somewhere safe
          </label>
          <InkButton size="lg" className="mt-4 w-full" disabled={!saved} onClick={onDone}>
            Continue
          </InkButton>
        </Sheet>
      </motion.div>
    </NightScene>
  );
}

/**
 * Gloam's valley at night, behind the form: the painted panorama (very slowly drifting), a dark vignette so the
 * card reads, and fireflies that drift up through the dark. Fireflies are moss-green, never lantern gold.
 * Respects reduced motion: then nothing moves, it's just the painting.
 */
function NightScene({ children }: { children: ReactNode }) {
  const calm = useCalmMotion();
  // fixed positions (a deterministic hash, so the server and browser draw them in the same place)
  const flies = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => ({
        left: 4 + 92 * rand(i),
        top: 8 + 86 * rand(i + 40),
        size: 2 + 4 * rand(i + 80),
        delay: rand(i + 7) * 5,
        dur: 6 + rand(i + 13) * 7,
        drift: 8 + rand(i + 21) * 26,
      })),
    [],
  );
  return (
    <main data-age-style="senior" className="relative min-h-dvh overflow-hidden bg-[#0b1512]">
      {/* the painted valley, drifting ever so slightly */}
      <motion.div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-[position:55%_center]"
        style={{ backgroundImage: "url(/art/senior/valley-0-dark.webp)" }}
        initial={false}
        animate={calm ? undefined : { scale: [1, 1.07], x: [0, -14] }}
        transition={{ duration: 38, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
      />
      {/* depth: darker at the edges and bottom so the card and words read clearly */}
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(130%_100%_at_50%_0%,transparent_38%,rgb(7_15_12/0.72)_100%)]" />
      <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,rgb(7_15_12/0.55),transparent_30%,transparent_60%,rgb(7_15_12/0.8))]" />
      {/* fireflies */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        {flies.map((f, i) => (
          <motion.span
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${f.left}%`,
              top: `${f.top}%`,
              width: f.size,
              height: f.size,
              background: "#d6ee8a",
              boxShadow: "0 0 8px 2px rgb(214 238 138 / 0.6)",
            }}
            initial={calm ? { opacity: 0.5 } : { opacity: 0 }}
            animate={calm ? undefined : { opacity: [0, 0.9, 0.2, 0.8, 0], y: [0, -f.drift], x: [0, f.drift * 0.4, 0] }}
            transition={{ duration: f.dur, repeat: Infinity, delay: f.delay, ease: "easeInOut" }}
          />
        ))}
      </div>
      {/* the card (centred, but on a short screen it scrolls so a tall form never gets clipped) */}
      <div className="relative z-10 flex min-h-dvh items-center-safe justify-center overflow-y-auto px-5 py-10">{children}</div>
    </main>
  );
}

/** The same "random" number for the same i every time and everywhere (so fireflies don't jump between server and browser) */
function rand(i: number) {
  let h = Math.imul(i + 0x9e37, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function GoogleG() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8Z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9Z" />
    </svg>
  );
}
