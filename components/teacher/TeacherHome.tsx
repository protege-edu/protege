"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button, Shell, StatusPill, api, gradeLabel, json } from "./kit";

interface ClassItem {
  id: string;
  name: string;
  grade: number;
  students: number;
  lessons: string[];
}
interface LessonItem {
  id: string;
  title: string;
  grade: number;
  status: string;
  sourceName: string | null;
  builtIn?: boolean;
}

/** The teacher's home: classes first (that's what they open during class), then lessons. */
export function TeacherHome() {
  const [classes, setClasses] = useState<ClassItem[] | null>(null);
  const [lessons, setLessons] = useState<LessonItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [grade, setGrade] = useState(9);

  const load = useCallback(async () => {
    const [c, l] = await Promise.all([api<ClassItem[]>("/api/teacher/classes"), api<LessonItem[]>("/api/teacher/lessons")]);
    if (!c.ok) return setError(c.error);
    if (!l.ok) return setError(l.error);
    setClasses(c.data);
    setLessons(l.data);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
    // keep "Gloam is reading…" lessons up to date
    const t = setInterval(load, 6000);
    return () => clearInterval(t);
  }, [load]);

  const addClass = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api("/api/teacher/classes", json("POST", { name, grade }));
    if (!res.ok) return setError(res.error);
    setAdding(false);
    setName("");
    void load();
  };

  const approved = lessons?.filter((l) => l.status === "approved") ?? [];

  return (
    <Shell>
      {error && (
        <p role="alert" className="mt-6 rounded-md bg-[#f3d6d6] px-4 py-3 text-sm font-bold text-[#7a2330]">
          {error}
        </p>
      )}

      <section className="mt-8" aria-labelledby="classes-title">
        <div className="flex items-end justify-between gap-4">
          <h2 id="classes-title" className="text-lg font-bold text-ink">
            Your classes
          </h2>
          {!adding && (
            <Button variant="quiet" onClick={() => setAdding(true)}>
              Add a class
            </Button>
          )}
        </div>

        {adding && (
          <form onSubmit={addClass} className="mt-4 flex flex-wrap items-end gap-3 rounded-md border border-line bg-panel p-4">
            <label className="flex flex-col gap-1 text-sm font-bold text-ink">
              Class name
              <input value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="Science 9, period 2" className="min-h-11 w-64 rounded-md border border-line bg-bg px-3 font-normal" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-bold text-ink">
              Grade
              <select value={grade} onChange={(e) => setGrade(Number(e.target.value))} className="min-h-11 rounded-md border border-line bg-bg px-3 font-normal">
                {Array.from({ length: 13 }, (_, g) => (
                  <option key={g} value={g}>
                    {gradeLabel(g)}
                  </option>
                ))}
              </select>
            </label>
            <Button type="submit" disabled={!name.trim()}>
              Create class
            </Button>
            <Button variant="quiet" className="border-0" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </form>
        )}

        <ul className="mt-4 divide-y divide-line border-y border-line">
          {classes?.length === 0 && <li className="py-6 text-sm text-ink-dim">No classes yet. Add one to see your students&apos; progress here.</li>}
          {classes?.map((c) => {
            const firstLesson = c.lessons[0];
            return (
              <li key={c.id} className="flex flex-wrap items-center gap-x-6 gap-y-2 py-4">
                <div className="min-w-56 flex-1">
                  <p className="text-md font-bold text-ink">{c.name}</p>
                  <p className="text-sm text-ink-dim">
                    {gradeLabel(c.grade)}, {c.students} {c.students === 1 ? "student" : "students"}
                  </p>
                </div>
                {firstLesson ? (
                  <Link href={`/teacher/classes/${c.id}?lesson=${firstLesson}`} className="min-h-11 content-center rounded-md bg-accent px-4 text-sm font-bold text-accent-ink hover:bg-accent-hover">
                    Open dashboard
                  </Link>
                ) : (
                  <AssignLesson classId={c.id} lessons={approved} onDone={load} />
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-12" aria-labelledby="lessons-title">
        <div className="flex items-end justify-between gap-4">
          <h2 id="lessons-title" className="text-lg font-bold text-ink">
            Lessons
          </h2>
          <Link href="/teacher/lessons/new" className="min-h-11 content-center rounded-md bg-accent px-4 text-sm font-bold text-accent-ink hover:bg-accent-hover">
            New lesson from your notes
          </Link>
        </div>
        <ul className="mt-4 divide-y divide-line border-y border-line">
          {lessons?.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center gap-x-6 gap-y-2 py-4">
              <div className="min-w-56 flex-1">
                <p className="text-md font-bold text-ink">{l.title}</p>
                <p className="text-sm text-ink-dim">
                  {gradeLabel(l.grade)}
                  {l.builtIn ? ", comes with Protégé" : l.sourceName ? `, from ${l.sourceName}` : ""}
                </p>
              </div>
              <StatusPill status={l.status} />
              <Link href={`/teacher/lessons/${l.id}`} className="min-h-11 content-center rounded-md border border-line px-4 text-sm font-bold text-ink hover:bg-chip">
                {l.status === "draft" ? "Review" : "Open"}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <InviteTeacher />
    </Shell>
  );
}

/** Another teacher at the school wants in: a one-use code they type when they make their account */
function InviteTeacher() {
  const [invite, setInvite] = useState<{ code: string; expires: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const make = async () => {
    const res = await api<{ code: string; expires: string }>("/api/teacher/invite", json("POST", {}));
    if (!res.ok) return setError(res.error);
    setInvite(res.data);
  };
  return (
    <section className="mt-12" aria-labelledby="invite-title">
      <h2 id="invite-title" className="text-lg font-bold text-ink">
        Invite a teacher
      </h2>
      <p className="mt-1 max-w-[60ch] text-sm text-ink-dim">
        Other teachers need an invite code to make an account here. Each code works once and lasts a week. Their classes and lessons stay separate from yours.
      </p>
      {invite ? (
        <p className="mt-4 text-sm text-ink" aria-live="polite">
          Their code: <span className="ml-1 rounded-md border border-dashed border-line bg-panel px-3 py-1.5 font-mono text-md font-bold tracking-wider select-all">{invite.code}</span>
          <span className="ml-3 text-ink-dim">works until {new Date(invite.expires).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</span>
        </p>
      ) : (
        <Button variant="quiet" className="mt-4" onClick={make}>
          Make an invite code
        </Button>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm font-bold text-[#9b2c2c]">
          {error}
        </p>
      )}
    </section>
  );
}

function AssignLesson({ classId, lessons, onDone }: { classId: string; lessons: LessonItem[]; onDone: () => void }) {
  const [pick, setPick] = useState(lessons[0]?.id ?? "");
  if (!lessons.length) return <span className="text-sm text-ink-dim">Approve a lesson to give it to this class</span>;
  const assign = async () => {
    const res = await api(`/api/teacher/classes/${classId}`, json("POST", { lessonId: pick }));
    if (res.ok) onDone();
  };
  return (
    <div className="flex items-center gap-2">
      <label className="sr-only" htmlFor={`assign-${classId}`}>
        Lesson for this class
      </label>
      <select id={`assign-${classId}`} value={pick} onChange={(e) => setPick(e.target.value)} className="min-h-11 rounded-md border border-line bg-panel px-3 text-sm">
        {lessons.map((l) => (
          <option key={l.id} value={l.id}>
            {l.title}
          </option>
        ))}
      </select>
      <Button onClick={assign}>Give to class</Button>
    </div>
  );
}
