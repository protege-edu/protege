"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { InkButton } from "@/components/ui/InkButton";
import { Wordmark } from "@/components/ui/Logo";
import { SignIn, type AuthStatus } from "./SignIn";

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
  // a full reload, so nothing from this teacher's pages stays in memory (shared computers)
  const signOut = async () => {
    await api("/api/teacher/auth", { method: "DELETE" });
    window.location.replace("/teacher");
  };
  return (
    <div className="mx-auto max-w-[1100px] px-5 pb-20 sm:px-8">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-line py-4">
        <Link href="/teacher" className="inline-flex min-h-11 items-center text-lg text-ink" aria-label="Protégé, teacher home">
          <Wordmark tone="light" />
        </Link>
        <nav className="flex flex-wrap items-center gap-1 text-sm" aria-label="Teacher">
          <Link href="/teacher/status" className="min-h-11 content-center rounded-md px-3 font-bold text-ink-dim hover:text-ink">
            Ready for class?
          </Link>
          <Link href="/teacher/help" className="mr-1 min-h-11 content-center rounded-md px-3 font-bold text-ink-dim hover:text-ink">
            How it works
          </Link>
          <Button variant="quiet" onClick={signOut} className="border-0">
            Sign out
          </Button>
        </nav>
      </header>
      {back && (
        <Link href={back.href} className="mt-3 inline-flex min-h-11 items-center text-sm font-bold text-ink-dim underline-offset-4 hover:text-ink hover:underline">
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
  const [status, setStatus] = useState<AuthStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const check = useCallback(async () => {
    const res = await api<AuthStatus>("/api/teacher/auth");
    if (!res.ok) return setError(res.error);
    setStatus(res.data);
  }, []);
  useEffect(() => {
    void Promise.resolve().then(check);
  }, [check]);

  if (error) return <p className="p-8 text-sm font-bold text-[#9b2c2c]">{error}</p>;
  if (!status) return <div className="min-h-dvh" />;
  if (!status.teacher) return <SignIn status={status} onSignedIn={() => void check()} />;
  return <TeacherContext.Provider value={status.teacher}>{children}</TeacherContext.Provider>;
}

/** The signed-in teacher (inside TeacherGate) */
export const TeacherContext = createContext<NonNullable<AuthStatus["teacher"]> | null>(null);
export const useTeacher = () => useContext(TeacherContext);

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
    queued: ["Waiting its turn", "bg-chip text-ink-dim"],
    failed: ["Drafting failed", "bg-[#f3d6d6] text-[#7a2330]"],
  };
  const [label, cls] = map[status] ?? [status, "bg-chip text-ink-dim"];
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${cls}`}>{label}</span>;
}

export const gradeLabel = (g: number) => (g === 0 ? "Kindergarten" : `Grade ${g}`);
