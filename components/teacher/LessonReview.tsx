"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { TEST_MODE_POSSIBLE } from "@/lib/testMode";
import { useCallback, useEffect, useState } from "react";
import { styleForGrade } from "@/lib/age-styles";
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
  /** worth a look, but they don't stop approving (e.g. two ideas that overlap) */
  warnings?: { conceptId?: string; field: string; message: string }[];
  createdAt: string;
  /** the unit it's part of (for "lesson 2 of 5" and the way to the others) */
  unit: { id: string; title: string; lessons: { id: string; title: string; status: string }[] } | null;
  /** this teacher's classes, and whether each one has this lesson */
  classes: { id: string; name: string; has: boolean }[];
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
  // the grade was changed on this visit: Gloam's lines below still sound like the old grade
  const [regraded, setRegraded] = useState(false);

  const load = useCallback(async () => {
    const res = await api<Row>(`/api/teacher/lessons/${id}`);
    if (!res.ok) return setError(res.error);
    setRow(res.data);
    setBp((cur) => (cur && dirty ? cur : res.data.blueprint));
  }, [id, dirty]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  // While Gloam is drafting (or it's waiting its turn), check in every couple of seconds
  useEffect(() => {
    if (row?.status !== "drafting" && row?.status !== "queued") return;
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
    setNotice("Approved. Give it to a class below, and its students can play it right away.");
    await load();
  };

  const remove = async () => {
    if (!window.confirm("Delete this lesson? Students who already started it will lose access.")) return;
    const res = await api(`/api/teacher/lessons/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/teacher");
  };

  const sooner = async () => {
    const res = await api(`/api/teacher/lessons/${id}/sooner`, { method: "POST" });
    if (!res.ok) return setError(res.error);
    void load();
  };

  const give = async (classId: string, has: boolean) => {
    const res = await api(`/api/teacher/classes/${classId}`, json("POST", has ? { removeLessonId: id } : { lessonId: id }));
    if (!res.ok) return setError(res.error);
    setNotice(null);
    void load();
  };

  const retry = async () => {
    const res = await api(`/api/teacher/lessons/${id}/retry`, { method: "POST" });
    if (!res.ok) return setError(res.error);
    setBp(null);
    void load();
  };

  // save the new grade, then draft again from the same notes so every line fits it
  const rewrite = async () => {
    if (dirty && !(await save())) return;
    setRegraded(false);
    await retry();
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

      {row?.unit && <UnitNav unit={row.unit} id={id} />}

      {row?.status === "queued" && (
        <section className="mt-10 max-w-[56ch]" aria-live="polite">
          <h1 className="text-xl font-bold text-ink">{row.title}</h1>
          <p className="mt-3 text-md text-ink">This lesson is waiting its turn. Gloam drafts a unit&apos;s lessons one at a time, in order, so the laptop stays quick for students.</p>
          <div className="mt-5 flex gap-3">
            <Button onClick={() => void sooner()}>Draft this one next</Button>
          </div>
        </section>
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
                className="block min-h-11 w-full resize-none rounded-md bg-transparent text-xl font-bold text-ink [field-sizing:content] supports-[field-sizing:content]:overflow-hidden focus:bg-panel focus:outline-none"
              />
              <p className="mt-1 text-sm text-ink-dim">
                Gloam talks like it&apos;s in {bp.ageStyle === "senior" ? "high school" : bp.ageStyle === "middle" ? "middle school" : "elementary school"}.
                {row.sourceName ? ` From ${row.sourceName}.` : ""} In a class, Gloam matches the class&apos;s grade.
              </p>
              <label className="mt-2 flex items-center gap-2 text-sm font-bold text-ink">
                Grade
                <select
                  value={bp.grade}
                  disabled={readOnly}
                  onChange={(e) => {
                    const g = Number(e.target.value);
                    edit((b) => {
                      b.grade = g;
                      b.ageStyle = styleForGrade(g).id;
                    });
                    setRegraded(true);
                  }}
                  className="min-h-11 rounded-md border border-line bg-panel px-3 font-normal"
                >
                  {Array.from({ length: 13 }, (_, g) => (
                    <option key={g} value={g}>
                      {gradeLabel(g)}
                    </option>
                  ))}
                </select>
              </label>
              {regraded && !readOnly && (
                <p role="status" className="mt-2 max-w-[68ch] rounded-md border border-dashed border-line bg-panel px-4 py-3 text-sm text-ink">
                  Gloam&apos;s lines below were written for the old grade.{" "}
                  {row.hasSource ? "Rewrite them so they fit, or save and edit them yourself." : "Edit them so they fit, then save."}
                  {row.hasSource && (
                    <span className="mt-2 flex flex-wrap gap-2">
                      <Button onClick={rewrite}>Rewrite for {gradeLabel(bp.grade)}</Button>
                    </span>
                  )}
                  {row.hasSource && <span className="mt-1 block text-xs text-ink-dim">Rewriting takes a few minutes and replaces your edits to this lesson.</span>}
                </p>
              )}
              <label className="mt-2 flex items-center gap-2 text-sm font-bold text-ink">
                Students explain in
                <select
                  value={bp.language ?? "en"}
                  disabled={readOnly}
                  onChange={(e) => edit((b) => void (b.language = e.target.value as "en" | "fr"))}
                  className="min-h-11 rounded-md border border-line bg-panel px-3 font-normal"
                >
                  <option value="en">English</option>
                  <option value="fr">French</option>
                </select>
                <span className="font-normal text-ink-dim">Gloam speaks it too.</span>
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <StatusPill status={row.status} />
              {row.status === "approved" && (
                <a href={`/play/${row.id}`} target="_blank" rel="noreferrer" className="min-h-11 content-center rounded-md border border-line px-4 text-sm font-bold text-ink hover:bg-chip">
                  Try it as a student
                </a>
              )}
              {row.status === "approved" && TEST_MODE_POSSIBLE && (
                // only while developing: pasting works and there are shortcuts to every moment
                <a href={`/play/${row.id}?test`} target="_blank" rel="noreferrer" className="min-h-11 content-center rounded-md border border-dashed border-line px-4 text-sm font-bold text-ink-dim hover:bg-chip">
                  Try it in test mode
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

          {row.status === "approved" && <GiveToClass classes={row.classes} onGive={(cid, has) => void give(cid, has)} />}

          {readOnly && <p className="mt-4 text-sm text-ink-dim">This lesson comes with Protégé, so it can&apos;t be edited.</p>}

          {/* everything to check, in one place */}
          {(row.problems.length > 0 || (bp.reviewNotes?.length ?? 0) > 0 || (row.warnings?.length ?? 0) > 0) && (
            <section aria-labelledby="checks" className="mt-6 rounded-lg border border-[#d9b36a] bg-[#f8eed8] p-5">
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
                {row.warnings?.map((w, i) => (
                  <li key={`w${i}`}>{w.message}</li>
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
                    className="min-h-11 max-w-full resize-none rounded-md bg-transparent py-1.5 align-top [field-sizing:content] supports-[field-sizing:content]:overflow-hidden focus:bg-panel focus:outline-none"
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
        className={`min-h-11 w-full resize-y rounded-md border border-line bg-panel px-3 py-2 text-sm text-ink focus:border-[var(--t-focus)] focus:outline-none read-only:border-transparent read-only:bg-transparent ${voice ? "voice" : ""}`}
      />
      {problems.map((p, i) => (
        <span key={i} className="mt-1 block text-sm text-[#7a2330]">
          {p.message}
        </span>
      ))}
    </label>
  );
}

/** Where this lesson is in its unit, with the way to the one before and after */
function UnitNav({ unit, id }: { unit: NonNullable<Row["unit"]>; id: string }) {
  const at = unit.lessons.findIndex((l) => l.id === id);
  const prev = unit.lessons[at - 1];
  const next = unit.lessons[at + 1];
  return (
    <nav aria-label="Lessons in this unit" className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line pb-3 text-sm">
      <span className="text-ink-dim">
        Lesson {at + 1} of {unit.lessons.length} in{" "}
        <Link href={`/teacher/units/${unit.id}`} className="font-bold text-ink underline underline-offset-4">
          {unit.title}
        </Link>
      </span>
      <span className="ml-auto flex gap-1">
        {prev && (
          <Link href={`/teacher/lessons/${prev.id}`} className="min-h-11 content-center rounded-md px-3 font-bold text-ink-dim hover:bg-chip hover:text-ink">
            Previous: {prev.title.length > 32 ? `${prev.title.slice(0, 30)}…` : prev.title}
          </Link>
        )}
        {next && (
          <Link href={`/teacher/lessons/${next.id}`} className="min-h-11 content-center rounded-md px-3 font-bold text-ink-dim hover:bg-chip hover:text-ink">
            Next: {next.title.length > 32 ? `${next.title.slice(0, 30)}…` : next.title}
          </Link>
        )}
      </span>
    </nav>
  );
}

/**
 * An approved lesson: give it to classes (or take it away) right here. A few classes are one button each;
 * many classes become a picker, with the classes that already have it listed above.
 */
function GiveToClass({ classes, onGive }: { classes: Row["classes"]; onGive: (classId: string, has: boolean) => void }) {
  const others = classes.filter((c) => !c.has);
  const [pick, setPick] = useState("");
  const chosen = others.some((c) => c.id === pick) ? pick : (others[0]?.id ?? "");
  const many = classes.length > 6;
  return (
    <section aria-labelledby="give-title" className="mt-6 rounded-md border border-line bg-panel px-5 py-4">
      <h2 id="give-title" className="text-md font-bold text-ink">
        Give it to a class
      </h2>
      {classes.length === 0 ? (
        <p className="mt-1 text-sm text-ink-dim">
          Make a class on your{" "}
          <Link href="/teacher" className="font-bold text-ink underline">
            home page
          </Link>{" "}
          first.
        </p>
      ) : (
        <>
          <p className="mt-1 text-sm text-ink-dim">Students in the class see it on their page right away. Taking it away keeps what they taught Gloam.</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {(many ? classes.filter((c) => c.has) : classes).map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  aria-pressed={c.has}
                  onClick={() => onGive(c.id, c.has)}
                  title={c.has ? `Take it away from ${c.name}` : undefined}
                  className={`min-h-11 cursor-pointer rounded-md border px-4 text-sm font-bold ${c.has ? "border-transparent bg-accent text-accent-ink hover:bg-accent-hover" : "border-line text-ink hover:bg-chip"}`}
                >
                  {c.has ? `In ${c.name}` : `Give to ${c.name}`}
                </button>
              </li>
            ))}
          </ul>
          {many && others.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label htmlFor="give-pick" className="sr-only">
                Class
              </label>
              <select id="give-pick" value={chosen} onChange={(e) => setPick(e.target.value)} className="min-h-11 max-w-full rounded-md border border-line bg-bg px-3 text-sm">
                {others.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <Button onClick={() => onGive(chosen, false)} disabled={!chosen}>
                Give to this class
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
