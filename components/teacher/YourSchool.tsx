"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button, api, json } from "./kit";

interface School {
  id: string;
  name: string;
  staffCode: string;
  staff: { id: string; name: string; email: string; owner: boolean }[];
}

/**
 * "Your school": the staff code new teachers sign up with, who has signed up with it, and the fix if the
 * code ever reaches a student (remove them, make a new code: lib/teacher/schools.ts).
 */
export function YourSchool({ myId }: { myId: string }) {
  const [data, setData] = useState<{ school: School | null; owner: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  // the change waiting for a second press: "new-code", or the id of a teacher to remove
  const [sure, setSure] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const res = await api<{ school: School | null; owner: boolean }>("/api/teacher/school");
    if (res.ok) setData(res.data);
  }, []);
  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const act = async (body: object) => {
    setError(null);
    const res = await api("/api/teacher/school", json("POST", body));
    setSure(null);
    setCopied(false);
    if (!res.ok) return setError(res.error);
    await load();
  };
  const copy = async (code: string) => {
    await navigator.clipboard.writeText(code).catch(() => undefined);
    setCopied(true);
  };

  if (!data) return null;
  const { school, owner } = data;
  return (
    <section className="mt-12" aria-labelledby="school-title">
      <div className="flex items-end justify-between gap-4">
        <h2 id="school-title" className="text-lg font-bold text-ink">
          {school ? school.name : "Your school"}
        </h2>
        {owner && (
          <Link href="/teacher/owner" className="min-h-11 content-center rounded-md border border-line px-4 text-sm font-bold text-ink hover:bg-chip">
            Owner page
          </Link>
        )}
      </div>

      {!school ? (
        <p className="mt-1 max-w-[60ch] text-sm text-ink-dim">
          {owner ? "You're not part of a school yet. Add your school (and every school that uses Protégé) on your owner page." : "You're not part of a school."}
        </p>
      ) : (
        <>
          <p className="mt-1 max-w-[62ch] text-sm text-ink-dim">
            New teachers at your school make their account with this staff code. Share it with staff only, like by school email, never with students.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="rounded-md border border-dashed border-line bg-panel px-3 py-1.5 font-mono text-md font-bold tracking-wider text-ink select-all" aria-label={`Staff code ${school.staffCode.split("").join(" ")}`}>
              {school.staffCode}
            </span>
            <Button variant="quiet" onClick={() => void copy(school.staffCode)}>
              {copied ? "Copied" : "Copy"}
            </Button>
            {sure === "new-code" ? (
              <>
                <Button onClick={() => void act({ action: "new-code" })}>Make a new code</Button>
                <Button variant="quiet" onClick={() => setSure(null)}>
                  Cancel
                </Button>
              </>
            ) : (
              <Button variant="quiet" onClick={() => setSure("new-code")}>
                Make a new staff code
              </Button>
            )}
          </div>
          {sure === "new-code" && (
            <p className="mt-2 max-w-[62ch] text-sm text-ink" aria-live="polite">
              The old code stops working right away. Teachers who already signed up keep their accounts. Do this if the code reached a student.
            </p>
          )}

          <h3 className="mt-6 text-md font-bold text-ink">Teachers here</h3>
          <ul className="mt-2 border-t border-line">
            {school.staff.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line py-3">
                <div className="min-w-[14rem] flex-1">
                  <p className="text-md font-bold text-ink">
                    {t.name}
                    {t.id === myId && <span className="font-normal text-ink-dim"> (you)</span>}
                  </p>
                  <p className="text-sm text-ink-dim">{t.email}</p>
                </div>
                {t.id !== myId && !t.owner && (sure === t.id ? (
                  <span className="flex flex-wrap items-center gap-2">
                    <Button onClick={() => void act({ action: "remove", teacherId: t.id })}>Remove {t.name}</Button>
                    <Button variant="quiet" onClick={() => setSure(null)}>
                      Cancel
                    </Button>
                  </span>
                ) : (
                  <Button variant="quiet" onClick={() => setSure(t.id)}>
                    Not a teacher here?
                  </Button>
                ))}
                {sure === t.id && (
                  <p className="w-full text-sm text-ink" aria-live="polite">
                    This deletes their account and everything they made: their classes, their students&apos; work and their lessons. It can&apos;t be undone.
                  </p>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm font-bold text-[#9b2c2c]">
          {error}
        </p>
      )}
    </section>
  );
}
