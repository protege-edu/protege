"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { LessonBlueprint } from "@/lib/lesson/types";
import { Button, Shell, StatusPill, api, gradeLabel, json } from "./kit";

interface Row {
  id: string;
  title: string;
  grade: number;
  status: string;
  sourceName: string | null;
  problem: string | null;
  progress?: string;
  blueprint: LessonBlueprint | null;
  builtIn: boolean;
  hasSource: boolean;
  problems: { conceptId?: string; field: string; message: string }[];
  createdAt: string;
}

/** Titles and idea names are one line, even though they wrap on screen */
const noNewLines = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
  if (e.key === "Enter") e.preventDefault();
};

const BELIEF_STAGES =["Starts out believing (wrong)", "Starting to doubt", "Almost there", "Finally gets it"];

/**
 * Review a drafted lesson like a marked-up document, edit anything, and approve it.
 * Students only ever see approved lessons. Approval is blocked until every check passes.
 */
export function LessonReview({ id }: { id: string }) {
  const router = useRouter();
  const [row, setRow] = useState<Row | null>(null);
  const [bp, setBp] = useState<LessonBlueprint | null>(null);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await api<Row>(`/api/teacher/lessons/${id}`);
    if (!res.ok) return setError(res.error);
    setRow(res.data);
    setBp((cur) => (cur && dirty ? cur : res.data.blueprint));
  }, [id, dirty]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  // While Gloam is drafting, check in every couple of seconds
  useEffect(() => {
    if (row?.status !== "drafting") return;
    const t = setInterval(load, 2500);
    return () => clearInterval(t);
  }, [row?.status, load]);

  const edit = (fn: (b: LessonBlueprint) => void) => {
    setBp((cur) => {
      if (!cur) return cur;
      const next = structuredClone(cur);
      fn(next);
      return next;
    });
    setDirty(true);
    setNotice(null);
  };

  const save = async () => {
    if (!bp) return false;
    setSaving(true);
    const res = await api<{ problems: Row["problems"] }>(`/api/teacher/lessons/${id}`, json("PUT", bp));
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return false;
    }
    setDirty(false);
    setError(null);
    await load();
    return true;
  };

  const approve = async () => {
    if (dirty && !(await save())) return;
    const res = await api(`/api/teacher/lessons/${id}/approve`, { method: "POST" });
    if (!res.ok) {
      setError(res.problems?.length ? `${res.error} ${res.problems.join(" ")}` : res.error);
      return;
    }
    setNotice("Approved. Give it to a class from your home page.");
    await load();
  };

  const remove = async () => {
    if (!window.confirm("Delete this lesson? Students who already started it will lose access.")) return;
    const res = await api(`/api/teacher/lessons/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/teacher");
  };

  const retry = async () => {
    const res = await api(`/api/teacher/lessons/${id}/retry`, { method: "POST" });
    if (!res.ok) return setError(res.error);
    setBp(null);
    void load();
  };

  const readOnly = row?.builtIn ?? false;
  const problemsFor = (cid?: string) => row?.problems.filter((p) => p.conceptId === cid) ?? [];
  const notesFor = (cid?: string) => bp?.reviewNotes?.filter((n) => n.conceptId === cid) ?? [];

  return (
    <Shell back={{ href: "/teacher", label: "All lessons" }}>
      {error && (
        <p role="alert" className="mt-6 rounded-md bg-[#f3d6d6] px-4 py-3 text-sm font-bold text-[#7a2330]">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="mt-6 rounded-md bg-[#dfe9d2] px-4 py-3 text-sm font-bold text-[#2c4a24]">
          {notice}
        </p>
      )}

      {row?.status === "drafting" && (
        <section className="mt-10 max-w-[56ch]" aria-live="polite">
          <h1 className="text-xl font-bold text-ink">Gloam is reading your notes</h1>
          <p className="mt-3 text-md text-ink">{row.progress ?? "Working on it"}…</p>
          <p className="mt-2 text-sm text-ink-dim">This usually takes a few minutes on a laptop. You can leave this page; it keeps going, and the lesson shows up under &ldquo;Needs your review&rdquo;.</p>
        </section>
      )}

      {row?.status === "failed" && (
        <section className="mt-10 max-w-[56ch]">
          <h1 className="text-xl font-bold text-ink">Drafting didn&apos;t work</h1>
          <p className="mt-3 text-md text-ink">{row.problem}</p>
          <div className="mt-5 flex gap-3">
            {row.hasSource && <Button onClick={retry}>Try again</Button>}
            <Button variant="danger" onClick={remove}>
              Delete it
            </Button>
          </div>
        </section>
      )}

      {row && bp && row.status !== "drafting" && (
        <article className="mt-6">
          <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-5">
            <div className="min-w-0 flex-1">
              <label className="sr-only" htmlFor="title">
                Lesson title
              </label>
              {/* a textarea, not an input, so long titles wrap on small screens */}
              <textarea
                id="title"
                rows={1}
                value={bp.title}
                readOnly={readOnly}
                onKeyDown={noNewLines}
                onChange={(e) => edit((b) => void (b.title = e.target.value))}
                className="block w-full resize-none rounded-md bg-transparent text-xl font-bold text-ink [field-sizing:content] focus:bg-panel focus:outline-none"
              />
              <p className="mt-1 text-sm text-ink-dim">
                {gradeLabel(bp.grade)}. Gloam talks like it&apos;s in {bp.ageStyle === "senior" ? "high school" : bp.ageStyle === "middle" ? "middle school" : "elementary school"}.
                {row.sourceName ? ` From ${row.sourceName}.` : ""}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <StatusPill status={row.status} />
              {row.status === "approved" && (
                <a href={`/play/${row.id}`} target="_blank" rel="noreferrer" className="min-h-11 content-center rounded-md border border-line px-4 text-sm font-bold text-ink hover:bg-chip">
                  Try it as a student
                </a>
              )}
              {!readOnly && dirty && (
                <Button variant="quiet" onClick={save} disabled={saving}>
                  {saving ? "Saving…" : "Save changes"}
                </Button>
              )}
              {!readOnly && row.status !== "approved" && (
                <Button onClick={approve} disabled={row.problems.length > 0 && !dirty}>
                  Approve for students
                </Button>
              )}
            </div>
          </header>

          {readOnly && <p className="mt-4 text-sm text-ink-dim">This lesson comes with Protégé, so it can&apos;t be edited.</p>}

          {/* everything to check, in one place */}
          {(row.problems.length > 0 || (bp.reviewNotes?.length ?? 0) > 0) && (
            <section aria-labelledby="checks" className="mt-6 rounded-lg border border-[#e0b871] bg-[#fbf0d9] p-5">
              <h2 id="checks" className="text-md font-bold text-[#6b4510]">
                Check before approving
              </h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[#5a3a0c]">
                {row.problems.map((p, i) => (
                  <li key={`p${i}`}>{p.message}</li>
                ))}
                {bp.reviewNotes?.map((n, i) => (
                  <li key={`n${i}`}>{n.note}</li>
                ))}
              </ul>
            </section>
          )}

          <Field label="Gloam's first line (its wrong theory)" value={bp.opener} onChange={(v) => edit((b) => void (b.opener = v))} readOnly={readOnly} rows={3} voice problems={problemsFor(undefined).filter((p) => p.field === "opener")} />

          {bp.concepts.map((c, ci) => (
            <section key={c.id} aria-labelledby={`idea-${c.id}`} className="mt-10 border-t border-line pt-6">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 id={`idea-${c.id}`} className="text-lg font-bold text-ink">
                  Idea {ci + 1}:{" "}
                  <textarea
                    aria-label={`Name of idea ${ci + 1}`}
                    rows={1}
                    value={c.name}
                    readOnly={readOnly}
                    onKeyDown={noNewLines}
                    onChange={(e) => edit((b) => void (b.concepts[ci].name = e.target.value))}
                    className="max-w-full resize-none rounded-md bg-transparent align-top [field-sizing:content] focus:bg-panel focus:outline-none"
                  />
                </h2>
                {!readOnly && bp.concepts.length > 2 && (
                  <Button variant="danger" onClick={() => edit((b) => void b.concepts.splice(ci, 1))}>
                    Remove this idea
                  </Button>
                )}
              </div>
              {[...problemsFor(c.id), ...notesFor(c.id).map((n) => ({ message: n.note }))].map((p, i) => (
                <p key={i} className="mt-2 rounded-md bg-[#fbf0d9] px-3 py-2 text-sm text-[#5a3a0c]">
                  {p.message}
                </p>
              ))}

              <div className="mt-4 grid gap-x-8 gap-y-2 md:grid-cols-2">
                <Field label="The correct idea" value={c.truth} onChange={(v) => edit((b) => void (b.concepts[ci].truth = v))} readOnly={readOnly} rows={3} />
                <Field label="The wrong idea students usually have" value={c.misconception} onChange={(v) => edit((b) => void (b.concepts[ci].misconception = v))} readOnly={readOnly} rows={3} />
              </div>

              <h3 className="mt-6 text-sm font-bold text-ink">What Gloam believes as it learns</h3>
              <ol className="mt-2 grid gap-x-8 gap-y-1 md:grid-cols-2">
                {c.beliefs.map((belief, bi) => (
                  <li key={bi}>
                    <Field
                      label={BELIEF_STAGES[bi]}
                      value={belief}
                      onChange={(v) => edit((b) => void (b.concepts[ci].beliefs[bi] = v))}
                      readOnly={readOnly}
                      rows={2}
                      voice
                    />
                  </li>
                ))}
              </ol>

              <h3 className="mt-6 text-sm font-bold text-ink">Questions Gloam asks (from vague to specific)</h3>
              <ol className="mt-2 space-y-2">
                {c.questions.map((q, qi) => (
                  <li key={qi} className="flex items-start gap-2">
                    <Field label={`Question ${qi + 1}`} hideLabel value={q} onChange={(v) => edit((b) => void (b.concepts[ci].questions[qi] = v))} readOnly={readOnly} rows={1} voice />
                    {!readOnly && (
                      <Button variant="danger" className="mt-1" onClick={() => edit((b) => void b.concepts[ci].questions.splice(qi, 1))} aria-label={`Remove question ${qi + 1}`}>
                        Remove
                      </Button>
                    )}
                  </li>
                ))}
              </ol>
              {!readOnly && c.questions.length < 5 && (
                <Button variant="quiet" className="mt-2" onClick={() => edit((b) => void b.concepts[ci].questions.push(""))}>
                  Add a question
                </Button>
              )}

              <details className="mt-6">
                <summary className="min-h-11 cursor-pointer content-center text-sm font-bold text-ink-dim">Advanced: how Gloam recognises this idea</summary>
                <div className="mt-2 grid gap-x-8 md:grid-cols-2">
                  <Field
                    label="Words Gloam must not say first (they'd give it away)"
                    value={c.giveaways.join(", ")}
                    onChange={(v) => edit((b) => void (b.concepts[ci].giveaways = splitList(v)))}
                    readOnly={readOnly}
                    rows={2}
                  />
                  <Field
                    label="Words students use when explaining it"
                    value={c.evidence.join(", ")}
                    onChange={(v) => edit((b) => void (b.concepts[ci].evidence = splitList(v)))}
                    readOnly={readOnly}
                    rows={2}
                  />
                </div>
              </details>

              <Field label="Recap shown to students at the end (plain, correct)" value={c.recap} onChange={(v) => edit((b) => void (b.concepts[ci].recap = v))} readOnly={readOnly} rows={2} />
            </section>
          ))}

          <section className="mt-10 border-t border-line pt-6">
            <h2 className="text-lg font-bold text-ink">The ending</h2>
            <Field label="Gloam's last line when it gets everything" value={bp.finale} onChange={(v) => edit((b) => void (b.finale = v))} readOnly={readOnly} rows={3} voice />
          </section>

          {!readOnly && (
            <footer className="mt-12 flex flex-wrap gap-3 border-t border-line pt-6">
              {dirty && (
                <Button variant="quiet" onClick={save} disabled={saving}>
                  {saving ? "Saving…" : "Save changes"}
                </Button>
              )}
              {row.status !== "approved" && <Button onClick={approve}>Approve for students</Button>}
              <Button variant="danger" onClick={remove}>
                Delete lesson
              </Button>
            </footer>
          )}
        </article>
      )}
    </Shell>
  );
}

const splitList = (v: string) =>
  v
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);

function Field({
  label,
  value,
  onChange,
  readOnly,
  rows = 2,
  voice = false,
  hideLabel = false,
  problems = [],
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  readOnly: boolean;
  rows?: number;
  voice?: boolean;
  hideLabel?: boolean;
  problems?: { message: string }[];
}) {
  return (
    <label className="mt-3 block w-full">
      <span className={hideLabel ? "sr-only" : "mb-1 block text-xs font-bold text-ink-dim"}>{label}</span>
      <textarea
        value={value}
        readOnly={readOnly}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full resize-y rounded-md border border-line bg-panel px-3 py-2 text-sm text-ink focus:border-[var(--t-focus)] focus:outline-none read-only:border-transparent read-only:bg-transparent ${voice ? "voice" : ""}`}
      />
      {problems.map((p, i) => (
        <span key={i} className="mt-1 block text-sm text-[#7a2330]">
          {p.message}
        </span>
      ))}
    </label>
  );
}
