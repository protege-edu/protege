"use client";

import { useEffect, useState, type ReactNode } from "react";
import { InkButton } from "@/components/ui/InkButton";
import { LogoMark, Wordmark } from "@/components/ui/Logo";
import { Sheet } from "@/components/ui/Sheet";

type Mode = "signin" | "signup" | "recover";

export interface AuthStatus {
  teacher: { id: string; email: string; name: string; onboardedAt: string | null } | null;
  firstTeacher: boolean;
  /** setup: no accounts yet, the first needs the setup code Protégé printed. invite: needs a teacher's invite code. */
  signUp: "setup" | "invite";
  google: boolean;
}

async function post<T>(body: unknown): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await fetch("/api/teacher/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    return res.ok ? { ok: true, data } : { ok: false, error: data.error ?? "Something went wrong. Try again." };
  } catch {
    return { ok: false, error: "Can't reach Protégé. Is it still running?" };
  }
}

/**
 * The teacher's way in: sign in, make an account, or use a recovery code.
 * A calm two-panel page: a painted postcard of Gloam's valley, and the form.
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
      setError("No teacher account uses that Google account yet. To make one, you need an invite code from a teacher who uses Protégé.");
      setMode("signup");
    });
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  const needsCode = mode === "signup";
  const googleHref = `/api/auth/google/start?who=teacher${needsCode && invite.trim() ? `&invite=${encodeURIComponent(invite.trim())}` : ""}`;

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
        ? "You're the first teacher on this Protégé, so everything already here becomes yours."
        : "You'll need an invite code from a teacher who already uses this Protégé. Your classes and lessons stay private to you."
      : mode === "signin"
        ? "Sign in to your classes, lessons and dashboards."
        : "Use the recovery code you saved when you made your account.";

  return (
    <main className="mx-auto grid min-h-dvh max-w-[1100px] items-center gap-10 px-6 py-10 md:grid-cols-[1.1fr_1fr]">
      <Postcard />
      <section aria-labelledby="signin-title" className="w-full max-w-[420px] justify-self-center">
        <p className="text-xl text-ink">
          <Wordmark tone="light" />
        </p>
        <h1 id="signin-title" className="mt-6 text-lg font-bold text-ink">
          {title}
        </h1>
        <p className="mt-1.5 text-sm text-ink-dim">{sub}</p>

        {needsCode && (
          <div className="mt-6">
            {status.signUp === "setup" ? (
              <Field
                id="invite"
                label="Setup code"
                hint="Protégé shows it in the window where it's running. It's also saved in SETUP-CODE.txt, next to Protégé's data."
                value={invite}
                onChange={setInvite}
                autoComplete="off"
              />
            ) : (
              <Field id="invite" label="Invite code" hint="It looks like ABCD-EFGH. Type it first, then pick how to sign up." value={invite} onChange={setInvite} autoComplete="off" />
            )}
          </div>
        )}

        {status.google && mode !== "recover" && (
          <>
            <a
              href={googleHref}
              className="mt-6 flex min-h-12 items-center justify-center gap-3 rounded-md border border-line bg-panel px-4 text-sm font-bold text-ink hover:bg-chip"
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
            <p role="alert" className="text-sm font-bold text-[#9b2c2c]">
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
      </section>
    </main>
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
        className="min-h-12 rounded-md border border-line bg-panel px-3 text-md text-ink focus:border-[var(--t-focus)] focus:outline-none"
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
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col justify-center px-6">
      <Sheet seed="recovery" tone="day" className="p-7">
        <h1 className="text-lg font-bold text-ink">Save your recovery code</h1>
        <p className="mt-2 text-sm text-ink-dim">If you ever forget your password, this code gets you back in. It&apos;s shown only once, and each code works once. Write it down or save it somewhere safe.</p>
        <p className="mt-5 rounded-md border border-dashed border-line bg-[var(--t-panel-2)] px-4 py-4 text-center font-mono text-xl font-bold tracking-wider text-ink select-all">{code}</p>
        <label className="mt-5 flex min-h-11 cursor-pointer items-center gap-3 text-sm text-ink">
          <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} className="h-5 w-5 accent-[var(--t-accent)]" />
          I&apos;ve saved it somewhere safe
        </label>
        <InkButton size="lg" className="mt-4 w-full" disabled={!saved} onClick={onDone}>
          Continue
        </InkButton>
      </Sheet>
    </main>
  );
}

/** The left panel: a painted postcard of the lit valley, with Gloam's face */
function Postcard() {
  return (
    <div aria-hidden="true" className="relative hidden aspect-[4/5] overflow-hidden rounded-[22px] shadow-[0_18px_50px_rgb(22_48_42/0.25)] md:block">
      <div className="absolute inset-0 bg-cover bg-[position:62%_center]" style={{ backgroundImage: "url(/art/senior/journey-map-lit.webp)" }} />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,rgb(10_20_16/0.85))]" />
      <div className="absolute inset-x-0 bottom-0 flex items-end gap-4 p-7">
        <LogoMark tone="dark" className="h-16 w-16 shrink-0" />
        <p className="voice text-lg text-[#e9efe9]" style={{ ["--casual" as string]: 1, ["--slant" as string]: -6 }}>
          your students teach. gloam learns. you see what they think.
        </p>
      </div>
    </div>
  );
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
