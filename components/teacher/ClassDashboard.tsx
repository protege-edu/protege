"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { ClassTrail } from "./ClassTrail";
import { CandleMark, Shell, api, gradeLabel } from "./kit";

interface Data {
  class: { id: string; name: string; grade: number };
  lesson: { id: string; title: string; concepts: { id: string; name: string; misconception: string }[] };
  students: { id: string; nickname: string; understanding: Record<string, number>; stuck: string[]; messages: number; finished: boolean; lastActive: string | null }[];
  insights: { conceptId: string; count: number; total: number; text: string }[];
  litCount: Record<string, number>;
}

/**
 * The live dashboard: candles per student per idea, who's stuck, and what the class thinks.
 * No grades, no percentages. Refreshes every few seconds during class.
 */
export function ClassDashboard() {
  const { id } = useParams<{ id: string }>();
  const lessonId = useSearchParams().get("lesson") ?? "";
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updated, setUpdated] = useState<Date | null>(null);
  const [open, setOpen] = useState<Data["students"][number] | null>(null);

  const load = useCallback(async () => {
    const res = await api<Data>(`/api/teacher/classes/${id}?lesson=${encodeURIComponent(lessonId)}`);
    if (!res.ok) return setError(res.error);
    setError(null);
    setData(res.data);
    setUpdated(new Date());
  }, [id, lessonId]);

  useEffect(() => {
    void Promise.resolve().then(load);
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  const name = (cid: string) => data?.lesson.concepts.find((c) => c.id === cid)?.name ?? cid;
  const started = data?.students.filter((s) => s.messages > 0).length ?? 0;

  return (
    <Shell back={{ href: "/teacher", label: "All classes" }}>
      {error && (
        <p role="alert" className="mt-6 rounded-md bg-[#f3d6d6] px-4 py-3 text-sm font-bold text-[#7a2330]">
          {error}
        </p>
      )}
      {data && (
        <>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-ink">{data.class.name}</h1>
              <p className="mt-1 text-md text-ink-dim">
                {data.lesson.title} <span className="text-sm">({gradeLabel(data.class.grade)})</span>
              </p>
            </div>
            <p className="text-sm text-ink-dim" aria-live="polite">
              {started} of {data.students.length} students have started. Updated {updated ? updated.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" }) : ""}
            </p>
          </div>

          {/* What the class thinks: the most useful thing a teacher can act on right now */}
          {data.insights.length > 0 && (
            <Sheet seed="thinks" tone="day" className="mt-8 p-5">
            <section aria-labelledby="thinks">
              <h2 id="thinks" className="text-md font-bold text-ink">
                What the class thinks
              </h2>
              <ul className="mt-3 space-y-3">
                {data.insights.map((i) => (
                  <li key={i.conceptId} className="text-md text-ink">
                    <span className="mb-1 block text-xs font-bold text-ink-dim">{name(i.conceptId)}</span>
                    <span className="font-bold">
                      {i.count} of {i.total} students
                    </span>{" "}
                    said: &ldquo;{i.text}&rdquo;
                    {i.count / Math.max(1, i.total) >= 0.4 && <span className="mt-1 block text-sm text-ink-dim">That&apos;s a lot of the class. Worth a quick whole-class discussion.</span>}
                  </li>
                ))}
              </ul>
            </section>
            </Sheet>
          )}

          <ClassTrail concepts={data.lesson.concepts} students={data.students} />

          <div className="mt-8 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <caption className="sr-only">Each student&apos;s progress, one candle per idea</caption>
              <thead>
                <tr className="border-b border-line">
                  <th scope="col" className="py-3 pr-4 text-sm font-bold text-ink-dim">
                    Student
                  </th>
                  {data.lesson.concepts.map((c) => (
                    <th key={c.id} scope="col" className="px-2 py-3 text-center text-sm font-bold text-ink">
                      <span className="block">{c.name}</span>
                      <span className="block text-xs font-normal text-ink-dim">
                        {data.litCount[c.id]} lit
                      </span>
                    </th>
                  ))}
                  <th scope="col" className="py-3 pl-4 text-sm font-bold text-ink-dim">
                    Right now
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.students.map((s) => (
                  <tr key={s.id} className="border-b border-line hover:bg-chip/60">
                    <th scope="row" className="py-2 pr-4">
                      <button type="button" onClick={() => setOpen(s)} className="min-h-11 cursor-pointer rounded-sm text-left text-md font-bold text-ink underline-offset-4 hover:underline">
                        {s.nickname}
                      </button>
                    </th>
                    {data.lesson.concepts.map((c) => (
                      <td key={c.id} className="px-2 py-2 text-center">
                        <span className="inline-flex justify-center">
                          <CandleMark level={s.understanding[c.id] ?? 0} stuck={s.stuck.includes(c.id)} size={40} />
                        </span>
                      </td>
                    ))}
                    <td className="py-2 pl-4 text-sm">
                      {s.finished ? (
                        <span className="font-bold text-[#2c4a24]">Taught Gloam everything</span>
                      ) : s.stuck.length ? (
                        <span className="font-bold text-[#8a4313]">Stuck on: {s.stuck.map(name).join(", ")}</span>
                      ) : s.messages === 0 ? (
                        <span className="text-ink-dim">Hasn&apos;t started</span>
                      ) : (
                        <span className="text-ink-dim">Teaching</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-dim">
            <span className="inline-flex items-center gap-1.5"><CandleMark level={0} size={20} /> not yet</span>
            <span className="inline-flex items-center gap-1.5"><CandleMark level={2} size={20} /> almost</span>
            <span className="inline-flex items-center gap-1.5"><CandleMark level={3} size={20} /> taught it</span>
            <span className="inline-flex items-center gap-1.5"><CandleMark level={0} stuck size={20} /> stuck (tried twice, no progress)</span>
          </p>
        </>
      )}

      {open && data && <Transcript classId={id} lessonId={lessonId} student={open} onClose={() => setOpen(null)} />}
    </Shell>
  );
}

function Transcript({ classId, lessonId, student, onClose }: { classId: string; lessonId: string; student: { id: string; nickname: string }; onClose: () => void }) {
  const [msgs, setMsgs] = useState<{ from: string; text: string }[] | null>(null);
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    close.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    void api<{ messages: { from: string; text: string }[] }>(`/api/teacher/classes/${classId}/students/${student.id}?lesson=${encodeURIComponent(lessonId)}`).then((r) => setMsgs(r.ok ? r.data.messages : []));
    return () => window.removeEventListener("keydown", onKey);
  }, [classId, lessonId, student.id, onClose]);

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-[rgb(29_52_39/0.35)]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section role="dialog" aria-modal="true" aria-labelledby="t-title" className="flex h-full w-full max-w-[480px] flex-col border-l border-line bg-panel">
        <header className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 id="t-title" className="text-md font-bold text-ink">
            {student.nickname} and Gloam
          </h2>
          <button ref={close} type="button" onClick={onClose} className="min-h-11 cursor-pointer rounded-md px-3 text-sm font-bold text-ink-dim hover:text-ink">
            Close
          </button>
        </header>
        <ol className="flex-1 space-y-3 overflow-y-auto px-5 py-5">
          {msgs === null && <li className="text-sm text-ink-dim">Loading…</li>}
          {msgs?.length === 0 && <li className="text-sm text-ink-dim">No conversation yet.</li>}
          {msgs?.map((m, i) => (
            <li key={i} className={m.from === "student" ? "ml-8 rounded-md bg-chip px-3 py-2" : ""}>
              <span className="block text-xs font-bold text-ink-dim">{m.from === "student" ? student.nickname : "Gloam"}</span>
              <p className={`text-sm text-ink ${m.from === "gloam" ? "voice" : ""}`}>{m.text}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
