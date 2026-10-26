"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { InkButton } from "@/components/ui/InkButton";
import { Wordmark } from "@/components/ui/Logo";

/* ---------------- fetch helper ---------------- */

export async function api<T>(url: string, init?: RequestInit): Promise<{ ok: true; data: T } | { ok: false; error: string; problems?: string[]; status: number }> {
  try {
    const res = await fetch(url, init);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: body.error ?? "Something went wrong. Try again.", problems: body.problems, status: res.status };
    return { ok: true, data: body as T };
  } catch {
    return { ok: false, error: "Can't reach Protégé. Is it still running on this computer?", status: 0 };
  }
}

export const json = (method: string, body: unknown): RequestInit => ({ method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

/* ---------------- buttons ---------------- */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "quiet" | "danger"; children: ReactNode };
/** The same cut-paper buttons as the game (components/ui/InkButton), in the teacher's colours */
export function Button({ variant = "primary", className = "", type = "button", ...props }: ButtonProps) {
  if (variant === "danger") return <InkButton type={type} variant="ghost" {...props} className={`!text-[#9b2c2c] ${className}`} />;
  return <InkButton type={type} variant={variant} {...props} className={className} />;
}

/* ---------------- the page shell ---------------- */

export function Shell({ children, title, back }: { children: ReactNode; title?: string; back?: { href: string; label: string } }) {
  const router = useRouter();
  const signOut = async () => {
    await api("/api/teacher/auth", { method: "DELETE" });
    router.push("/teacher");
    router.refresh();
  };
  return (
    <div className="mx-auto max-w-[1100px] px-5 pb-20 sm:px-8">
      <header className="flex items-center justify-between gap-4 border-b border-line py-4">
        <Link href="/teacher" className="text-lg text-ink" aria-label="Protégé, teacher home">
          <Wordmark tone="light" />
        </Link>
        <nav className="flex items-center gap-1 text-sm" aria-label="Teacher">
          <span className="mr-2 hidden text-ink-dim sm:inline">Teacher</span>
          <Button variant="quiet" onClick={signOut} className="border-0">
            Sign out
          </Button>
        </nav>
      </header>
      {back && (
        <Link href={back.href} className="mt-5 inline-block text-sm font-bold text-ink-dim underline-offset-4 hover:text-ink hover:underline">
          {back.label}
        </Link>
      )}
      {title && <h1 className="mt-6 text-xl font-bold text-ink">{title}</h1>}
      {children}
    </div>
  );
}

/* ---------------- sign-in gate ---------------- */

export function TeacherGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<"loading" | "setup" | "signin" | "in">("loading");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(async () => {
    const res = await api<{ hasPasscode: boolean; signedIn: boolean }>("/api/teacher/auth");
    if (!res.ok) return setError(res.error);
    setState(res.data.signedIn ? "in" : res.data.hasPasscode ? "signin" : "setup");
  }, []);
  useEffect(() => {
    void Promise.resolve().then(check);
  }, [check]);

  if (state === "in") return <>{children}</>;
  if (state === "loading") return <div className="min-h-dvh" />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = await api("/api/teacher/auth", json("POST", { passcode: code }));
    if (!res.ok) return setError(res.error);
    setState("in");
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-[400px] flex-col justify-center px-6">
      <p className="text-2xl text-ink">
        <Wordmark tone="light" />
      </p>
      <h1 className="mt-6 text-lg font-bold text-ink">{state === "setup" ? "Set up the teacher side" : "Teacher sign in"}</h1>
      <p className="mt-2 text-sm text-ink-dim">
        {state === "setup"
          ? "Pick a passcode so students can't open your lessons and dashboard. It stays on this computer."
          : "Type your teacher passcode."}
      </p>
      <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
        <label htmlFor="passcode" className="text-sm font-bold text-ink">
          Passcode
        </label>
        <input
          id="passcode"
          type="password"
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="min-h-12 rounded-md border border-line bg-panel px-3 text-md text-ink focus:border-[var(--t-focus)] focus:outline-none"
          autoComplete={state === "setup" ? "new-password" : "current-password"}
          aria-describedby={state === "setup" ? "passcode-hint" : undefined}
        />
        {state === "setup" && (
          <p id="passcode-hint" className="-mt-1 text-sm text-ink-dim">
            At least 4 characters. Write it down somewhere safe.
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm font-bold text-accent">
            {error}
          </p>
        )}
        <Button type="submit" disabled={code.length < 4}>
          {state === "setup" ? "Save passcode and continue" : "Sign in"}
        </Button>
      </form>
    </main>
  );
}

/* ---------------- candle mark (dashboard) ---------------- */

const LEVEL_WORDS = ["not lit", "a spark", "flickering", "lit"];

/** A small drawn candle: the same four states students see, so teachers read progress the same way */
export function CandleMark({ level, stuck = false, size = 28 }: { level: number; stuck?: boolean; size?: number }) {
  const flame = [0, 0, 0.6, 1][level] ?? 0;
  return (
    <svg viewBox="0 0 24 40" width={size * 0.6} height={size} role="img" aria-label={`${LEVEL_WORDS[level] ?? "not lit"}${stuck ? ", stuck" : ""}`}>
      {level === 3 && <circle cx="12" cy="12" r="11" fill="#f4b740" opacity="0.25" />}
      <rect x="7" y="18" width="10" height="20" rx="2" fill={level > 0 ? "#efe4c8" : "#c9d0c4"} stroke={level > 0 ? "#c9b98f" : "#aab3a5"} />
      <line x1="12" y1="18" x2="12" y2="14.5" stroke="#3a3a3a" strokeWidth="1.4" strokeLinecap="round" />
      {level === 1 && <circle cx="12" cy="14" r="1.8" fill="#c8682a" />}
      {flame > 0 && (
        <path
          transform={`translate(12 15) scale(${flame}) translate(-12 -15)`}
          d="M12 3 C 16 8 16.5 11 15.2 13.6 C 14.3 15.4 9.7 15.4 8.8 13.6 C 7.5 11 8 8 12 3 Z"
          fill="#f4b740"
          stroke="#d08a1c"
          strokeWidth="0.6"
        />
      )}
      {stuck && <circle cx="20" cy="36" r="3.4" fill="#c8682a" stroke="#f1f4ee" strokeWidth="1.2" />}
    </svg>
  );
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    approved: ["Approved", "bg-[#dfe9d2] text-[#2c4a24]"],
    draft: ["Needs your review", "bg-[#f6e3c0] text-[#6b4510]"],
    drafting: ["Gloam is reading…", "bg-chip text-ink-dim"],
    failed: ["Drafting failed", "bg-[#f3d6d6] text-[#7a2330]"],
  };
  const [label, cls] = map[status] ?? [status, "bg-chip text-ink-dim"];
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${cls}`}>{label}</span>;
}

export const gradeLabel = (g: number) => (g === 0 ? "Kindergarten" : `Grade ${g}`);
