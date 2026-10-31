"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Button, Shell, api, json } from "./kit";

interface SchoolItem {
  id: string;
  name: string;
  staffCode: string;
  teachers: number;
  classes: number;
}
interface OwnerData {
  schools: SchoolItem[];
  usage: { all: number; limit: number; classes: { name: string; messages: number; limit: number }[] };
  limits: { student: number; class: number; drafts: number; all: number };
  mySchool: string | null;
}

/** Roughly what a message costs on Claude Haiku 5.5 (measured with npm run eval), for the "today" estimate */
const DOLLARS_PER_MESSAGE = 0.0001;

/**
 * The owner page: whoever runs this Protégé adds each school that uses it and gives the school its staff
 * code; sees how much of today's AI allowance is used; and gets a teacher locked out of their account back in.
 */
export function OwnerPage() {
  const [data, setData] = useState<OwnerData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [join, setJoin] = useState(false);
  const [added, setAdded] = useState<SchoolItem | null>(null);
  const [sure, setSure] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [recovery, setRecovery] = useState<{ email: string; code: string } | null>(null);

  const load = useCallback(async () => {
    const res = await api<OwnerData>("/api/teacher/owner");
    if (res.ok) setData(res.data);
    else setError(res.error);
  }, []);
  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const send = async <T,>(body: object) => {
    setError(null);
    const res = await api<T>("/api/teacher/owner", json("POST", body));
    if (!res.ok) {
      setError(res.error);
      return null;
    }
    await load();
    return res.data;
  };
  const addSchool = async (e: FormEvent) => {
    e.preventDefault();
    const res = await send<{ school: SchoolItem }>({ action: "add-school", name, join });
    if (res) {
      setAdded(res.school);
      setName("");
      setJoin(false);
    }
  };
  const reset = async (e: FormEvent) => {
    e.preventDefault();
    const res = await send<{ recoveryCode: string }>({ action: "reset-teacher", email });
    if (res) setRecovery({ email, code: res.recoveryCode });
  };

  return (
    <Shell back={{ href: "/teacher", label: "Teacher home" }} title="Owner page">
      <p className="mt-2 max-w-[66ch] text-md text-ink-dim">
        You run this Protégé. Add each school that uses it, then give the school its staff code (by email to the principal, for example). Teachers sign up with their school&apos;s code.
      </p>

      <section className="mt-10" aria-labelledby="add-title">
        <h2 id="add-title" className="text-lg font-bold text-ink">
          Add a school
        </h2>
        <form onSubmit={addSchool} className="mt-3 flex max-w-[640px] flex-wrap items-end gap-3">
          <label className="flex min-w-[16rem] flex-1 flex-col gap-1 text-sm font-bold text-ink">
            School name
            <input value={name} onChange={(e) => setName(e.target.value)} className="min-h-11 rounded-md border border-line bg-panel px-3 text-md font-normal text-ink" autoComplete="off" />
          </label>
          <Button type="submit" disabled={name.trim().length < 2}>
            Add school
          </Button>
          <label className="flex min-h-11 w-full cursor-pointer items-center gap-3 text-sm text-ink">
            <input type="checkbox" checked={join} onChange={(e) => setJoin(e.target.checked)} className="h-5 w-5 accent-[var(--t-accent)]" />
            I teach here too
          </label>
        </form>
        {added && (
          <p className="mt-3 text-md text-ink" aria-live="polite">
            {added.name}&apos;s staff code: <Code value={added.staffCode} />
          </p>
        )}
      </section>

      <section className="mt-10" aria-labelledby="schools-title">
        <h2 id="schools-title" className="text-lg font-bold text-ink">
          Schools
        </h2>
        {data && data.schools.length === 0 && <p className="mt-2 text-sm text-ink-dim">No schools yet. Add the first one above.</p>}
        <ul className="mt-3 border-t border-line">
          {data?.schools.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line py-3">
              <div className="min-w-[14rem] flex-1">
                <p className="text-md font-bold text-ink">
                  {s.name}
                  {data.mySchool === s.id && <span className="font-normal text-ink-dim"> (your school)</span>}
                </p>
                <p className="text-sm text-ink-dim">
                  {s.teachers} {s.teachers === 1 ? "teacher" : "teachers"}, {s.classes} {s.classes === 1 ? "class" : "classes"}
                </p>
              </div>
              <Code value={s.staffCode} />
              {sure === s.id ? (
                <span className="flex flex-wrap items-center gap-2">
                  <Button onClick={() => void send({ action: "new-code", schoolId: s.id }).then(() => setSure(null))}>Make a new code</Button>
                  <Button variant="quiet" onClick={() => setSure(null)}>
                    Cancel
                  </Button>
                </span>
              ) : (
                <Button variant="quiet" onClick={() => setSure(s.id)}>
                  New code
                </Button>
              )}
              {!data.mySchool && (
                <Button variant="quiet" onClick={() => void send({ action: "join", schoolId: s.id })}>
                  I teach here
                </Button>
              )}
              {sure === s.id && <p className="w-full text-sm text-ink">The old code stops working right away. Teachers who already signed up keep their accounts.</p>}
            </li>
          ))}
        </ul>
      </section>

      {data && (
        <section className="mt-10" aria-labelledby="today-title">
          <h2 id="today-title" className="text-lg font-bold text-ink">
            Gloam&apos;s brain today
          </h2>
          <p className="mt-2 text-md text-ink">
            {data.usage.all.toLocaleString()} of {data.usage.limit.toLocaleString()} used (a student&apos;s message counts 1, drafting a lesson counts 50), about $
            {(data.usage.all * DOLLARS_PER_MESSAGE).toFixed(2)}.
          </p>
          {data.usage.classes.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm text-ink-dim">
              {data.usage.classes.map((c) => (
                <li key={c.name}>
                  {c.name}: {c.messages.toLocaleString()} of {c.limit.toLocaleString()} messages
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 max-w-[66ch] text-sm text-ink-dim">
            Each day, a student can send {data.limits.student} messages, a class {data.limits.class.toLocaleString()}, and a teacher can draft {data.limits.drafts} lessons. When a limit is reached,
            Gloam falls asleep until tomorrow. Change them on Vercel (see the README, &ldquo;Daily limits&rdquo;), and set a monthly spending limit on the Claude account too.
          </p>
        </section>
      )}

      <section className="mt-10" aria-labelledby="reset-title">
        <h2 id="reset-title" className="text-lg font-bold text-ink">
          A teacher can&apos;t get in
        </h2>
        <p className="mt-1 max-w-[66ch] text-sm text-ink-dim">
          They forgot their password and lost their recovery code. Make them a new recovery code, and give it to them in person or by their school email. They use it under &ldquo;Forgot your
          password?&rdquo;.
        </p>
        <form onSubmit={reset} className="mt-3 flex max-w-[640px] flex-wrap items-end gap-3">
          <label className="flex min-w-[16rem] flex-1 flex-col gap-1 text-sm font-bold text-ink">
            Their email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="min-h-11 rounded-md border border-line bg-panel px-3 text-md font-normal text-ink" autoComplete="off" />
          </label>
          <Button type="submit" variant="quiet" disabled={!email.includes("@")}>
            Make a recovery code
          </Button>
        </form>
        {recovery && (
          <p className="mt-3 text-md text-ink" aria-live="polite">
            New recovery code for {recovery.email}: <Code value={recovery.code} />
          </p>
        )}
      </section>

      {error && (
        <p role="alert" className="mt-6 text-sm font-bold text-[#9b2c2c]">
          {error}
        </p>
      )}
    </Shell>
  );
}

function Code({ value }: { value: string }) {
  return (
    <span className="rounded-md border border-dashed border-line bg-panel px-3 py-1.5 font-mono text-md font-bold tracking-wider text-ink select-all" aria-label={value.split("").join(" ")}>
      {value}
    </span>
  );
}
