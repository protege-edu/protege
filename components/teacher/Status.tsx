"use client";

import { useEffect, useState } from "react";
import type { StatusCheck } from "@/lib/hosting/status";
import { Button, Shell, api } from "./kit";

/**
 * "Is everything ready for class?": the AI, voice typing, where students go, space and backups,
 * each with what to do if it isn't. Plus a "Check for updates" that only runs when pressed.
 */
export function Status() {
  const [data, setData] = useState<{ version: string; checks: StatusCheck[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [update, setUpdate] = useState<{ message: string; url?: string; state: string } | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const load = () =>
      void api<{ version: string; checks: StatusCheck[] }>("/api/teacher/status").then((r) => {
        if (r.ok) setData(r.data);
        else setError(r.error);
      });
    load();
    const t = setInterval(load, 15_000);
    return () => clearInterval(t);
  }, []);

  const problems = data?.checks.filter((c) => c.ok === false).length ?? 0;

  return (
    <Shell back={{ href: "/teacher", label: "Teacher home" }} title="Ready for class?">
      <p className="mt-2 max-w-[60ch] text-md text-ink-dim" aria-live="polite">
        {!data ? "Checking this laptop…" : problems ? `${problems === 1 ? "One thing needs" : `${problems} things need`} a look before class.` : "Everything's ready. Students can join."}
      </p>
      {error && (
        <p role="alert" className="mt-6 rounded-md bg-[#f3d6d6] px-4 py-3 text-sm font-bold text-[#7a2330]">
          {error}
        </p>
      )}
      {data && (
        <ul className="mt-6 max-w-[70ch] divide-y divide-line border-y border-line">
          {data.checks.map((c) => (
            <li key={c.id} className="flex gap-4 py-4">
              <Mark ok={c.ok} />
              <div className="min-w-0">
                <p className="text-md font-bold text-ink">{c.title}</p>
                <p className="mt-0.5 text-sm text-ink-dim">{c.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <section className="mt-10 max-w-[70ch]" aria-labelledby="updates">
        <h2 id="updates" className="text-lg font-bold text-ink">
          Updates
        </h2>
        <p className="mt-1 text-sm text-ink-dim">
          This is Protégé {data?.version ?? ""}. It never checks for updates by itself. Pressing the button asks the public Protégé page for the newest version, and sends nothing about your classes.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button
            variant="quiet"
            disabled={checking}
            onClick={async () => {
              setChecking(true);
              const r = await api<{ message: string; url?: string; state: string }>("/api/teacher/status", { method: "POST" });
              setChecking(false);
              setUpdate(r.ok ? r.data : { message: r.error, state: "unknown" });
            }}
          >
            {checking ? "Checking…" : "Check for updates"}
          </Button>
          {update && (
            <p role="status" className="text-sm text-ink">
              {update.message}{" "}
              {update.url && (
                <a href={update.url} target="_blank" rel="noreferrer" className="font-bold underline underline-offset-4">
                  How to update
                </a>
              )}
            </p>
          )}
        </div>
      </section>
    </Shell>
  );
}

/** Ready (a check), needs a look (!), or optional and off (an empty circle). Gold is never used here: it only means understanding. */
function Mark({ ok }: { ok: StatusCheck["ok"] }) {
  const label = ok === true ? "Ready" : ok === false ? "Needs a look" : "Optional, off";
  return (
    <span className="mt-0.5 shrink-0" role="img" aria-label={label}>
      <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
        {ok === true && (
          <>
            <circle cx="12" cy="12" r="11" fill="var(--t-accent)" />
            <path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="var(--t-accent-ink)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}
        {ok === false && (
          <>
            <circle cx="12" cy="12" r="11" fill="var(--t-warn)" />
            <path d="M12 6.5v7M12 17.2v.3" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
          </>
        )}
        {ok === "optional" && <circle cx="12" cy="12" r="10" fill="none" stroke="var(--t-ink-dim)" strokeWidth="2" />}
      </svg>
    </span>
  );
}
