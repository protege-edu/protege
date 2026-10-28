"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useCalmMotion } from "@/lib/useCalmMotion";
import { Button, Shell, StatusPill, api, gradeLabel, json } from "./kit";

interface Unit {
  id: string;
  title: string;
  sourceName: string | null;
  grade: number;
  lessons: { id: string; title: string; status: string; problem: string | null; progress?: string; inLine?: number }[];
}
interface ClassItem {
  id: string;
  name: string;
  lessons: { id: string }[];
}

const ordinal = (n: number) => `${n}${n % 10 === 1 && n % 100 !== 11 ? "st" : n % 10 === 2 && n % 100 !== 12 ? "nd" : n % 10 === 3 && n % 100 !== 13 ? "rd" : "th"}`;

/**
 * One upload, as lessons. They're drafted one at a time, in order, so lesson 1 is ready to review first;
 * the teacher can move a waiting lesson to the front, and give every approved lesson to a class at once.
 */
export function UnitPage({ id }: { id: string }) {
  const router = useRouter();
  const calm = useCalmMotion();
  const [unit, setUnit] = useState<Unit | null>(null);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [title, setTitle] = useState("");
  const [pick, setPick] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [u, c] = await Promise.all([api<Unit>(`/api/teacher/units/${id}`), api<ClassItem[]>("/api/teacher/classes")]);
    if (!u.ok) return setError(u.error);
    setUnit(u.data);
    setTitle((t) => t || u.data.title);
    if (c.ok) {
      setClasses(c.data);
      setPick((p) => p || c.data[0]?.id || "");
    }
  }, [id]);
  const busy = unit?.lessons.some((l) => l.status === "queued" || l.status === "drafting");
  useEffect(() => {
    void Promise.resolve().then(load);
    // while Gloam is drafting, check in often; otherwise now and then
    const t = setInterval(load, busy ? 2500 : 15000);
    return () => clearInterval(t);
  }, [load, busy]);

  const rename = async () => {
    if (!unit || !title.trim() || title.trim() === unit.title) return;
    const res = await api(`/api/teacher/units/${id}`, json("PUT", { title: title.trim() }));
    if (!res.ok) setError(res.error);
  };
  const sooner = async (lid: string) => {
    const res = await api(`/api/teacher/lessons/${lid}/sooner`, { method: "POST" });
    if (!res.ok) return setError(res.error);
    void load();
  };
  const retry = async (lid: string) => {
    const res = await api(`/api/teacher/lessons/${lid}/retry`, { method: "POST" });
    if (!res.ok) return setError(res.error);
    void load();
  };
  const give = async () => {
    const res = await api<{ given: number }>(`/api/teacher/classes/${pick}`, json("POST", { unitId: id }));
    if (!res.ok) return setError(res.error);
    const name = classes.find((c) => c.id === pick)?.name ?? "The class";
    setNotice(`${name} has ${res.data.given === 1 ? "the approved lesson" : `all ${res.data.given} approved lessons`}, in order. When you approve more, give them from here or from the class page.`);
    void load();
  };
  const remove = async () => {
    if (!unit || !window.confirm(`Delete "${unit.title}" and its ${unit.lessons.length} lessons? Anything students did in them is deleted too.`)) return;
    const res = await api(`/api/teacher/units/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/teacher");
  };

  if (!unit) {
    return (
      <Shell back={{ href: "/teacher", label: "All lessons" }}>
        {error && <p className="mt-6 text-sm font-bold text-[#9b2c2c]">{error}</p>}
      </Shell>
    );
  }

  const count = (s: string) => unit.lessons.filter((l) => l.status === s).length;
  const approved = count("approved");
  const toReview = count("draft");
  const drafting = unit.lessons.findIndex((l) => l.status === "drafting");
  const inClass = classes.find((c) => c.id === pick);
  const alreadyIn = inClass ? unit.lessons.filter((l) => l.status === "approved" && inClass.lessons.some((x) => x.id === l.id)).length : 0;
  const where =
    drafting >= 0
      ? `Gloam is drafting lesson ${drafting + 1} of ${unit.lessons.length}. ${toReview ? `${toReview === 1 ? "One is" : `${toReview} are`} ready for your review while you wait.` : "Each one takes a few minutes."}`
      : busy
        ? toReview || approved
          ? "The rest are waiting their turn: Gloam is finishing a lesson from another upload first."
          : "Gloam is finishing a lesson from another upload first. This unit's lessons are next."
        : toReview
          ? `Every lesson is drafted. ${toReview === 1 ? "One needs" : `${toReview} need`} your review before students can see ${toReview === 1 ? "it" : "them"}.`
          : approved === unit.lessons.length
            ? "Every lesson is approved and ready for a class."
            : "";

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
      <header className="mt-6">
        <label className="sr-only" htmlFor="unit-title">
          Unit name
        </label>
        <input
          id="unit-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={rename}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          maxLength={120}
          className="block min-h-11 w-full rounded-md bg-transparent text-xl font-bold text-ink focus:bg-panel focus:outline-none"
        />
        <p className="mt-1 text-sm text-ink-dim">
          A unit of {unit.lessons.length} lessons, {gradeLabel(unit.grade)}
          {unit.sourceName ? `, from ${unit.sourceName}` : ""}.
        </p>
        {where && (
          <p className="mt-3 max-w-[66ch] text-md text-ink" aria-live="polite">
            {where}
          </p>
        )}
      </header>

      <ol className="mt-6 divide-y divide-line border-y border-line" aria-label="Lessons in this unit">
        {unit.lessons.map((l, i) => (
          <motion.li key={l.id} layout={!calm ? "position" : false} className="flex flex-wrap items-center gap-x-5 gap-y-2 py-4">
            <span aria-hidden="true" className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border text-sm font-bold ${l.status === "approved" ? "border-transparent bg-accent text-accent-ink" : "border-line text-ink-dim"}`}>
              {i + 1}
            </span>
            <div className="min-w-56 flex-1">
              <p className="text-md font-bold text-ink">
                <span className="sr-only">{`Lesson ${i + 1}: `}</span>
                {l.title}
              </p>
              <p className="text-sm text-ink-dim">
                {l.status === "drafting"
                  ? `${l.progress ?? "Working on it"}…`
                  : l.status === "queued"
                    ? l.inLine === 1
                      ? "Next in line."
                      : l.inLine
                        ? `${ordinal(l.inLine)} in line.`
                        : "Waiting its turn."
                    : l.status === "failed"
                      ? l.problem
                      : l.status === "draft"
                        ? "Drafted. Read it over and approve it."
                        : "Approved. Students can play it."}
              </p>
            </div>
            <StatusPill status={l.status} />
            {l.status === "draft" && (
              <Link href={`/teacher/lessons/${l.id}`} className="min-h-11 content-center rounded-md bg-accent px-4 text-sm font-bold text-accent-ink hover:bg-accent-hover">
                Review
              </Link>
            )}
            {l.status === "approved" && (
              <Link href={`/teacher/lessons/${l.id}`} className="min-h-11 content-center rounded-md border border-line px-4 text-sm font-bold text-ink hover:bg-chip">
                Open
              </Link>
            )}
            {l.status === "queued" && l.inLine !== 1 && (
              <Button variant="quiet" onClick={() => void sooner(l.id)}>
                Draft this one next
              </Button>
            )}
            {l.status === "failed" && <Button onClick={() => void retry(l.id)}>Try again</Button>}
          </motion.li>
        ))}
      </ol>

      <section aria-labelledby="give" className="mt-10 max-w-[66ch]">
        <h2 id="give" className="text-lg font-bold text-ink">
          Give it to a class
        </h2>
        {!classes.length ? (
          <p className="mt-2 text-sm text-ink-dim">
            Make a class on your{" "}
            <Link href="/teacher" className="font-bold text-ink underline">
              home page
            </Link>{" "}
            first.
          </p>
        ) : !approved ? (
          <p className="mt-2 text-sm text-ink-dim">Approve a lesson first. Students only ever see lessons you approved.</p>
        ) : (
          <>
            <p className="mt-2 text-sm text-ink-dim">The class gets every approved lesson, in this order. Students see them on their page and can play any of them.</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="sr-only" htmlFor="give-class">
                Class
              </label>
              <select id="give-class" value={pick} onChange={(e) => setPick(e.target.value)} className="min-h-11 rounded-md border border-line bg-panel px-3 text-sm">
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <Button onClick={() => void give()} disabled={alreadyIn === approved}>
                {alreadyIn === approved ? "Already in that class" : approved - alreadyIn === 1 ? "Give the approved lesson" : `Give ${approved - alreadyIn} approved lessons`}
              </Button>
            </div>
          </>
        )}
      </section>

      <div className="mt-12 border-t border-line pt-6">
        <Button variant="danger" onClick={() => void remove()}>
          Delete this unit
        </Button>
      </div>
    </Shell>
  );
}
