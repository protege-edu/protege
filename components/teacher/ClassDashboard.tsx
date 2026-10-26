"use client";

import { AnimatePresence } from "motion/react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Access } from "@/lib/access/settings";
import { styleForGrade } from "@/lib/age-styles";
import { keySize } from "@/lib/student/pictures";
import { Sheet } from "@/components/ui/Sheet";
import { ClassTrail } from "./ClassTrail";
import { Button, CandleMark, Shell, api, gradeLabel, json } from "./kit";
import { ClassData } from "./ClassData";
import { ShowCode } from "./ShowCode";

/** The class itself (no lesson): settings, its lessons, who's in it, and where students go */
interface Info {
  class: { id: string; name: string; grade: number; code: string; googleSignIn: boolean; pausedAt: string | null; language: "en" | "fr" };
  lessons: { id: string; title: string }[];
  roster: { id: string; nickname: string; google: boolean; hasKey: boolean }[];
  google: boolean;
  address: { url: string; local: boolean };
}

interface Data {
  class: { id: string; name: string; grade: number };
  lesson: { id: string; title: string; concepts: { id: string; name: string; misconception: string }[] };
  students: { id: string; nickname: string; understanding: Record<string, number>; stuck: string[]; messages: number; finished: boolean; lastActive: string | null; online: boolean }[];
  /** Gloam's line right now: answering, and waiting */
  line: { active: number; waiting: number; live: number };
  insights: { conceptId: string; count: number; total: number; text: string }[];
  litCount: Record<string, number>;
}

/**
 * The live dashboard: candles per student per idea, who's stuck, and what the class thinks.
 * No grades, no percentages. Refreshes every few seconds during class.
 */
export function ClassDashboard() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const lessonId = useSearchParams().get("lesson") ?? "";
  const [info, setInfo] = useState<Info | null>(null);
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updated, setUpdated] = useState<Date | null>(null);
  const [open, setOpen] = useState<Data["students"][number] | null>(null);
  const [showCode, setShowCode] = useState(false);

  const loadInfo = useCallback(async () => {
    const res = await api<Info>(`/api/teacher/classes/${id}`);
    if (!res.ok) return setError(res.error);
    setInfo(res.data);
    // no lesson picked yet: open the newest one this class was given
    if (!lessonId && res.data.lessons[0]) router.replace(`/teacher/classes/${id}?lesson=${encodeURIComponent(res.data.lessons[0].id)}`);
  }, [id, lessonId, router]);

  const load = useCallback(async () => {
    if (!lessonId) return;
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

  // the class's settings and roster: quickly while the code is up (students arriving), slowly otherwise
  useEffect(() => {
    void Promise.resolve().then(loadInfo);
    const t = setInterval(loadInfo, showCode ? 2500 : 15000);
    return () => clearInterval(t);
  }, [loadInfo, showCode]);

  const change = async (body: object) => {
    const res = await api(`/api/teacher/classes/${id}`, json("POST", body));
    if (!res.ok) return setError(res.error);
    void loadInfo();
    void load();
  };
  const paused = !!info?.class.pausedAt;

  const name = (cid: string) => data?.lesson.concepts.find((c) => c.id === cid)?.name ?? cid;
  const started = data?.students.filter((s) => s.messages > 0).length ?? 0;

  return (
    <Shell back={{ href: "/teacher", label: "All classes" }}>
      {error && (
        <p role="alert" className="mt-6 rounded-md bg-[#f3d6d6] px-4 py-3 text-sm font-bold text-[#7a2330]">
          {error}
        </p>
      )}
      {info && (
        <ClassHeader
          info={info}
          lessonId={lessonId}
          paused={paused}
          onShowCode={() => setShowCode(true)}
          onPause={() => void change({ paused: !paused })}
          onGoogle={(on) => void change({ googleSignIn: on })}
          onLanguage={(language) => void change({ language })}
          onGrade={(grade) => void change({ grade })}
          onLesson={(lid) => router.replace(`/teacher/classes/${id}?lesson=${encodeURIComponent(lid)}`)}
          onAssigned={() => void loadInfo()}
        />
      )}
      {data && (
        <>
          <p className="mt-6 text-sm text-ink-dim" aria-live="polite">
            <span className="font-bold text-ink">{data.students.filter((s) => s.online).length} here now</span>, {started} of {data.students.length} have started.{" "}
            {data.line.live > 0
              ? `Gloam is answering ${data.line.active} and ${data.line.live} ${data.line.live === 1 ? "is" : "are"} waiting a moment.`
              : data.line.active > 0
                ? `Gloam is answering ${data.line.active}.`
                : ""}{" "}
            Updated {updated ? updated.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" }) : ""}
          </p>

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
                      <button type="button" onClick={() => setOpen(s)} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-sm text-left text-md font-bold text-ink underline-offset-4 hover:underline">
                        {s.nickname}
                        {s.online && (
                          <span className="inline-block h-2 w-2 rounded-full bg-[#3f8f5a]" role="img" aria-label="here now" title="Here now" />
                        )}
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

      {open && data && (
        <Transcript
          classId={id}
          lessonId={lessonId}
          student={open}
          account={info?.roster.find((r) => r.id === open.id)}
          onClose={() => setOpen(null)}
          onRemoved={() => {
            setOpen(null);
            void load();
            void loadInfo();
          }}
        />
      )}
      {info && <ClassData classId={id} className={info.class.name} lessonId={lessonId} />}
      <AnimatePresence>
        {showCode && info && (
          <ShowCode key="code" code={info.class.code} address={info.address.url} local={info.address.local} roster={info.roster} onClose={() => setShowCode(false)} />
        )}
      </AnimatePresence>
    </Shell>
  );
}

function Transcript({
  classId,
  lessonId,
  student,
  account,
  onClose,
  onRemoved,
}: {
  classId: string;
  lessonId: string;
  student: { id: string; nickname: string };
  account?: { google: boolean; hasKey: boolean };
  onClose: () => void;
  onRemoved: () => void;
}) {
  const [msgs, setMsgs] = useState<{ from: string; text: string }[] | null>(null);
  const [access, setAccessState] = useState<Access | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const base = `/api/teacher/classes/${classId}/students/${student.id}`;
  const resetKey = async () => {
    const res = await api(base, json("POST", { resetKey: true }));
    setNote(res.ok ? `Done. Next time ${student.nickname} signs in, they pick new pictures. Best done while they're with you.` : res.error);
  };
  const changeAccess = async (patch: Partial<Access>) => {
    setAccessState((a) => (a ? { ...a, ...patch } : a));
    const res = await api(base, json("POST", { access: patch }));
    setNote(res.ok ? `Saved. ${student.nickname} sees it the next time a page loads.` : res.error);
  };
  const remove = async () => {
    const res = await api(base, { method: "DELETE" });
    if (res.ok) onRemoved();
    else setNote(res.error);
  };
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    close.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    void api<{ messages: { from: string; text: string }[]; access: Access }>(`/api/teacher/classes/${classId}/students/${student.id}?lesson=${encodeURIComponent(lessonId)}`).then((r) => {
      setMsgs(r.ok ? r.data.messages : []);
      if (r.ok) setAccessState(r.data.access);
    });
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
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-3">
          {account && !account.google && (
            <Button variant="quiet" onClick={() => void resetKey()}>
              {account.hasKey ? "Reset their pictures" : "Waiting for new pictures"}
            </Button>
          )}
          {confirmRemove ? (
            <>
              <Button variant="danger" onClick={() => void remove()}>
                Yes, remove {student.nickname}
              </Button>
              <Button variant="quiet" className="border-0" onClick={() => setConfirmRemove(false)}>
                Keep them
              </Button>
            </>
          ) : (
            <Button variant="danger" onClick={() => setConfirmRemove(true)}>
              Remove from class
            </Button>
          )}
          {confirmRemove && <p className="w-full text-sm text-ink-dim">This deletes everything {student.nickname} taught Gloam in this class. It can&apos;t be undone.</p>}
          {note && (
            <p role="status" className="w-full text-sm text-ink">
              {note}
            </p>
          )}
        </div>
        {access && <AccessSettings nickname={student.nickname} access={access} onChange={(p) => void changeAccess(p)} />}
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

/** The class at a glance: its name, its code, the buttons a teacher needs during class */
function ClassHeader({
  info,
  lessonId,
  paused,
  onShowCode,
  onPause,
  onGoogle,
  onLanguage,
  onGrade,
  onLesson,
  onAssigned,
}: {
  info: Info;
  lessonId: string;
  paused: boolean;
  onShowCode: () => void;
  onPause: () => void;
  onGoogle: (on: boolean) => void;
  onLanguage: (language: "en" | "fr") => void;
  onGrade: (grade: number) => void;
  onLesson: (lessonId: string) => void;
  onAssigned: () => void;
}) {
  // a grade that changes the size of the secret key waits for the teacher to say yes
  const [grade, setGrade] = useState<number | null>(null);
  const withKeys = info.roster.filter((r) => r.hasKey).length;
  const pickGrade = (g: number) => {
    if (keySize(g) !== keySize(info.class.grade) && withKeys > 0) return setGrade(g);
    setGrade(null);
    onGrade(g);
  };
  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-ink">{info.class.name}</h1>
          <p className="mt-1 text-md text-ink-dim">
            {gradeLabel(info.class.grade)}, class code <span className="font-bold tracking-wider text-ink">{info.class.code}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={onShowCode}>Show the code</Button>
          <Button variant="quiet" onClick={onPause}>
            {paused ? "Wake the class up" : "Pause the class"}
          </Button>
        </div>
      </div>

      {paused && (
        <p role="status" className="mt-4 rounded-md border border-dashed border-line bg-panel px-4 py-3 text-sm text-ink">
          <span className="font-bold">The class is paused.</span> Gloam is asleep for everyone, and students can&apos;t teach until you wake the class up.
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 border-y border-line py-3 text-sm">
        {info.lessons.length > 1 && (
          <label className="flex items-center gap-2 font-bold text-ink">
            Lesson
            <select value={lessonId} onChange={(e) => onLesson(e.target.value)} className="min-h-11 rounded-md border border-line bg-panel px-3 font-normal">
              {info.lessons.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title}
                </option>
              ))}
            </select>
          </label>
        )}
        {info.lessons.length === 1 && <span className="font-bold text-ink">{info.lessons[0].title}</span>}
        {info.lessons.length === 0 && <GiveLesson classId={info.class.id} onDone={onAssigned} />}
        {info.google && (
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-ink">
            <input type="checkbox" checked={info.class.googleSignIn} onChange={(e) => onGoogle(e.target.checked)} className="h-5 w-5 accent-[var(--t-accent)]" />
            <span>
              <span className="font-bold">Let students use Google</span>
              <span className="block text-xs text-ink-dim">Only if your school allows it. Protégé only learns it&apos;s the same account, never a name or email.</span>
            </span>
          </label>
        )}
        <label className="flex items-center gap-2 font-bold text-ink">
          Grade
          <select value={grade ?? info.class.grade} onChange={(e) => pickGrade(Number(e.target.value))} className="min-h-11 rounded-md border border-line bg-panel px-3 font-normal">
            {Array.from({ length: 13 }, (_, g) => (
              <option key={g} value={g}>
                {gradeLabel(g)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 font-bold text-ink">
          Language
          <select value={info.class.language} onChange={(e) => onLanguage(e.target.value as "en" | "fr")} className="min-h-11 rounded-md border border-line bg-panel px-3 font-normal">
            <option value="en">English</option>
            <option value="fr">Français</option>
          </select>
        </label>
        <span className="text-ink-dim">
          {info.roster.length} {info.roster.length === 1 ? "student" : "students"}
        </span>
      </div>

      {grade !== null && (
        <div role="alertdialog" aria-labelledby="grade-change" className="mt-4 rounded-md border border-dashed border-line bg-panel px-4 py-3 text-sm text-ink">
          <p id="grade-change">
            <span className="font-bold">
              {gradeLabel(grade)} uses a {keySize(grade)}-picture secret key, not {keySize(info.class.grade)}.
            </span>{" "}
            {withKeys === 1 ? "Your student" : `Your ${withKeys} students`} will pick a new key the next time they join. What they taught Gloam stays.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              onClick={() => {
                onGrade(grade);
                setGrade(null);
              }}
            >
              Change to {gradeLabel(grade)}
            </Button>
            <Button variant="quiet" onClick={() => setGrade(null)}>
              Keep {gradeLabel(info.class.grade)}
            </Button>
          </div>
        </div>
      )}
      <p className="mt-2 text-xs text-ink-dim">
        <span className="font-bold text-ink">{styleForGrade(info.class.grade).label}:</span> {styleForGrade(info.class.grade).teacherBlurb}
      </p>
    </div>
  );
}

/** A class with no lesson yet: give it one */
function GiveLesson({ classId, onDone }: { classId: string; onDone: () => void }) {
  const [lessons, setLessons] = useState<{ id: string; title: string; status: string }[] | null>(null);
  const [pick, setPick] = useState("");
  useEffect(() => {
    void api<{ id: string; title: string; status: string }[]>("/api/teacher/lessons").then((r) => {
      if (!r.ok) return;
      const ok = r.data.filter((l) => l.status === "approved");
      setLessons(ok);
      setPick(ok[0]?.id ?? "");
    });
  }, []);
  if (!lessons) return null;
  if (!lessons.length) return <span className="text-ink-dim">Approve a lesson first, then give it to this class.</span>;
  const give = async () => {
    const res = await api(`/api/teacher/classes/${classId}`, json("POST", { lessonId: pick }));
    if (res.ok) onDone();
  };
  return (
    <span className="flex flex-wrap items-center gap-2">
      <label htmlFor="give-lesson" className="font-bold text-ink">
        No lesson yet
      </label>
      <select id="give-lesson" value={pick} onChange={(e) => setPick(e.target.value)} className="min-h-11 rounded-md border border-line bg-panel px-3">
        {lessons.map((l) => (
          <option key={l.id} value={l.id}>
            {l.title}
          </option>
        ))}
      </select>
      <Button onClick={() => void give()}>Give to class</Button>
    </span>
  );
}

/**
 * A student's Ways to play, for an accommodation (from their plan, or because they asked). They can still
 * change these themselves. Only this teacher sees them here: never in summaries, the spreadsheet or exports.
 */
function AccessSettings({ nickname, access, onChange }: { nickname: string; access: Access; onChange: (patch: Partial<Access>) => void }) {
  const box = "h-5 w-5 accent-[var(--t-accent)]";
  const select = "min-h-11 rounded-md border border-line bg-bg px-2 font-normal";
  return (
    <details className="border-b border-line px-5 py-3 text-sm">
      <summary className="min-h-11 cursor-pointer content-center font-bold text-ink">Ways to play for {nickname}</summary>
      <p className="mt-1 text-xs text-ink-dim">Switch on what helps (for example from a student&apos;s learning plan). {nickname} can change these too. Nobody else sees them.</p>
      <div className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
        <label className="flex min-h-11 items-center gap-2 text-ink">
          <input type="checkbox" className={box} checked={access.voice} onChange={(e) => onChange({ voice: e.target.checked })} />
          Talk instead of typing
        </label>
        <label className="flex min-h-11 items-center gap-2 text-ink">
          <input type="checkbox" className={box} checked={access.contrast} onChange={(e) => onChange({ contrast: e.target.checked })} />
          Stronger contrast
        </label>
        <label className="flex min-h-11 items-center gap-2 text-ink">
          <input type="checkbox" className={box} checked={access.calm} onChange={(e) => onChange({ calm: e.target.checked })} />
          Less motion
        </label>
        <label className="flex min-h-11 items-center gap-2 text-ink">
          <input type="checkbox" className={box} checked={access.sound} onChange={(e) => onChange({ sound: e.target.checked })} />
          Sound effects
        </label>
        <label className="flex items-center justify-between gap-2 font-bold text-ink">
          Read aloud
          <select className={select} value={access.readAloud} onChange={(e) => onChange({ readAloud: e.target.value as Access["readAloud"] })}>
            <option value="off">Off</option>
            <option value="button">With a button</option>
            <option value="auto">Every line</option>
          </select>
        </label>
        <label className="flex items-center justify-between gap-2 font-bold text-ink">
          Text size
          <select className={select} value={access.text} onChange={(e) => onChange({ text: Number(e.target.value) as Access["text"] })}>
            <option value={0}>Normal</option>
            <option value={1}>Bigger</option>
            <option value={2}>Biggest</option>
          </select>
        </label>
        <label className="flex items-center justify-between gap-2 font-bold text-ink sm:col-span-2">
          Easier reading
          <select className={select} value={access.reading} onChange={(e) => onChange({ reading: e.target.value as Access["reading"] })}>
            <option value="normal">Normal</option>
            <option value="spaced">More space</option>
            <option value="dyslexic">Dyslexia-friendly font</option>
          </select>
        </label>
      </div>
    </details>
  );
}
