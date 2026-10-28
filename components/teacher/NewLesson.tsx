"use client";

import { LayoutGroup, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { MAX_SOURCE_CHARS } from "@/lib/teacher/limits";
import { lessonSource, planBreaks, splitLong, type Part } from "@/lib/teacher/plan";
import { useCalmMotion } from "@/lib/useCalmMotion";
import { Button, Shell, api, gradeLabel, json } from "./kit";

/** Too little to teach: a lesson needs a few sentences at least (the server says the same) */
const TOO_LITTLE = 80;

/**
 * Bring notes of ANY length, in three steps on one page:
 *   1. drop a file (PDF, PowerPoint, Word) or paste text
 *   2. see how Gloam split it into lessons (each one a part Gloam can read at once), and move the breaks
 *   3. pick the grade, then Gloam drafts the lessons one at a time, first one first
 */
export function NewLesson() {
  const router = useRouter();
  const calm = useCalmMotion();
  const fileInput = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"file" | "paste">("file");
  const [pasted, setPasted] = useState("");
  const [reading, setReading] = useState(false);
  const [sourceName, setSourceName] = useState("");
  const [parts, setParts] = useState<Part[] | null>(null);
  /** where each lesson starts (indexes into parts) */
  const [breaks, setBreaks] = useState<number[]>([0]);
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  /** titles the teacher typed, by the id of the lesson's first part */
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [unitTitle, setUnitTitle] = useState("");
  const [grade, setGrade] = useState(9);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [dragging, setDragging] = useState(false);

  // the lessons as the breaks cut them (with the parts the teacher left out, shown unticked)
  const groups = useMemo(() => {
    if (!parts) return [];
    const starts = [...new Set(breaks)].sort((a, b) => a - b);
    return starts.map((start, i) => {
      const all = parts.slice(start, starts[i + 1] ?? parts.length).map((p, k) => ({ ...p, index: start + k }));
      const kept = all.filter((p) => !skipped.has(p.id));
      const chars = kept.reduce((n, p) => n + p.text.length, 0);
      return { start, key: all[0].id, all, kept, chars, title: titles[all[0].id] ?? (kept[0]?.title ?? all[0].title).slice(0, 80) };
    });
  }, [parts, breaks, skipped, titles]);
  const lessons = groups.filter((g) => g.kept.length);
  const tooLong = lessons.some((g) => g.chars > MAX_SOURCE_CHARS);
  const tooLittle = lessons.some((g) => g.chars < TOO_LITTLE);

  const gotParts = (name: string, sections: Part[]) => {
    const list = splitLong(sections);
    setSourceName(name);
    setParts(list);
    setBreaks(planBreaks(list));
    setSkipped(new Set());
    setTitles({});
    setUnitTitle(name === "Pasted text" ? "" : name.replace(/\.[a-z0-9]+$/i, "").replace(/[_-]+/g, " ").trim());
  };

  const readFile = async (file: File) => {
    setError(null);
    setReading(true);
    const form = new FormData();
    form.append("file", file);
    const res = await api<{ name: string; sections: Part[] }>("/api/teacher/read", { method: "POST", body: form });
    setReading(false);
    if (!res.ok) return setError(res.error);
    gotParts(res.data.name, res.data.sections);
  };

  const readPasted = async () => {
    setError(null);
    setReading(true);
    const res = await api<{ name: string; sections: Part[] }>("/api/teacher/read", json("POST", { text: pasted }));
    setReading(false);
    if (!res.ok) return setError(res.error);
    gotParts(res.data.name, res.data.sections);
  };

  const splitAt = (index: number) => setBreaks((b) => [...b, index]);
  const join = (start: number) => setBreaks((b) => b.filter((x) => x !== start));
  const toggle = (id: string, on: boolean) =>
    setSkipped((s) => {
      const next = new Set(s);
      if (on) next.delete(id);
      else next.add(id);
      return next;
    });

  const start = async () => {
    setStarting(true);
    setError(null);
    const body = {
      title: (unitTitle.trim() || lessons[0]?.title || sourceName || "New unit").slice(0, 120),
      sourceName,
      grade,
      // (a title the teacher typed is kept; otherwise Gloam suggests one from the notes)
      lessons: lessons.map((g) => ({ title: g.title.trim(), ownTitle: !!titles[g.key]?.trim(), source: lessonSource({ parts: g.kept }) })),
    };
    const res = await api<{ unitId?: string; lessonId: string }>("/api/teacher/units", json("POST", body));
    if (!res.ok) {
      setStarting(false);
      return setError(res.error);
    }
    router.push(res.data.unitId ? `/teacher/units/${res.data.unitId}` : `/teacher/lessons/${res.data.lessonId}`);
  };

  const many = lessons.length > 1;

  return (
    <Shell back={{ href: "/teacher", label: "All lessons" }} title="New lessons from your notes">
      <p className="mt-2 max-w-[62ch] text-md text-ink-dim">
        Bring a single lesson or a whole unit. Gloam reads your notes, finds the key ideas and the wrong ideas students usually have, and drafts the lessons. You review everything before students see it.
      </p>

      {error && (
        <p role="alert" className="mt-6 rounded-md bg-[#f3d6d6] px-4 py-3 text-sm font-bold text-[#7a2330]">
          {error}
        </p>
      )}

      {/* 1. bring it in */}
      <section aria-labelledby="step1" className="mt-8">
        <h2 id="step1" className="text-lg font-bold text-ink">
          1. Bring your notes
        </h2>
        <div className="mt-3 flex gap-1" role="tablist" aria-label="How to add your notes">
          {(["file", "paste"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={`min-h-11 cursor-pointer rounded-md px-4 text-sm font-bold ${mode === m ? "bg-ink text-bg" : "text-ink hover:bg-chip"}`}
            >
              {m === "file" ? "Upload a file" : "Paste text"}
            </button>
          ))}
        </div>

        {mode === "file" ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const f = e.dataTransfer.files[0];
              if (f) void readFile(f);
            }}
            className={`mt-3 flex min-h-40 flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-8 text-center ${dragging ? "border-accent bg-chip" : "border-line bg-panel"}`}
          >
            <p className="text-md text-ink">{reading ? "Reading your file…" : sourceName && parts ? `Using: ${sourceName}` : "Drop a PDF, PowerPoint or Word file here, as long as you like"}</p>
            <input ref={fileInput} type="file" accept=".pdf,.pptx,.docx,.txt,.md" className="sr-only" id="file" aria-label="Choose a lesson file (PDF, PowerPoint, Word or text)" onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])} />
            <Button variant="quiet" onClick={() => fileInput.current?.click()} disabled={reading}>
              {parts ? "Choose a different file" : "Choose a file"}
            </Button>
            <p className="text-xs text-ink-dim">Your file stays on this computer. It isn&apos;t uploaded anywhere.</p>
          </div>
        ) : (
          <div className="mt-3">
            <label htmlFor="paste" className="sr-only">
              Your lesson notes
            </label>
            <textarea
              id="paste"
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              rows={10}
              placeholder="Paste your notes or slide text here, as much as you like. Headings starting with # become new topics."
              className="w-full rounded-lg border border-line bg-panel p-4 text-sm text-ink focus:border-[var(--t-focus)] focus:outline-none"
            />
            <Button className="mt-2" onClick={readPasted} disabled={reading || pasted.trim().length < 80}>
              {reading ? "Reading…" : "Use this text"}
            </Button>
          </div>
        )}
      </section>

      {/* 2. the lessons Gloam made of it */}
      {parts && (
        <section aria-labelledby="step2" className="mt-12">
          <h2 id="step2" className="text-lg font-bold text-ink">
            2. {many ? `Gloam split it into ${lessons.length} lessons` : lessons.length ? "One lesson" : "Pick what to teach"}
          </h2>
          <p className="mt-1 max-w-[66ch] text-sm text-ink-dim">
            {many
              ? "Each lesson is one part of your notes, small enough for Gloam to read at once, and it breaks at your headings where it can. Split a lesson, join two, rename them, or untick anything you don't want taught."
              : "Untick anything you don't want taught. If it's really two topics, split it into two lessons."}
          </p>
          <LayoutGroup>
            <ol className="mt-5 grid gap-4" aria-label="Your lessons">
              {groups.map((g, gi) => {
                const n = groups.slice(0, gi + 1).filter((x) => x.kept.length).length;
                const over = g.chars > MAX_SOURCE_CHARS;
                const empty = !g.kept.length;
                const next = groups[gi + 1];
                return (
                  <motion.li key={g.key} layout={!calm} transition={{ type: "spring", stiffness: 420, damping: 38 }} className={`rounded-lg border bg-panel ${over ? "border-[#9b2c2c]" : "border-line"} ${empty ? "opacity-60" : ""}`}>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-4 py-3">
                      <span className="text-sm font-bold text-ink-dim">{empty ? "Left out" : `Lesson ${n}`}</span>
                      <label className="min-w-48 flex-1">
                        <span className="sr-only">{`Lesson ${n} title`}</span>
                        <input
                          value={g.title}
                          onChange={(e) => setTitles((t) => ({ ...t, [g.key]: e.target.value }))}
                          disabled={empty}
                          maxLength={120}
                          className="min-h-11 w-full rounded-md border border-transparent bg-transparent px-2 text-md font-bold text-ink hover:border-line focus:border-[var(--t-focus)] focus:bg-bg focus:outline-none"
                        />
                      </label>
                      <Fill chars={g.chars} />
                    </div>
                    {over && (
                      <p role="alert" className="px-4 pt-3 text-sm font-bold text-[#9b2c2c]">
                        Too long for Gloam to read at once. Split it somewhere below, or untick a part.
                      </p>
                    )}
                    {!over && !empty && g.chars < TOO_LITTLE && <p className="px-4 pt-3 text-sm font-bold text-[#9b2c2c]">Hardly anything to teach here. Join it with the lesson next to it.</p>}
                    <ul className="px-2 py-2">
                      {g.all.map((p, pi) => (
                        <motion.li key={p.id} layout={!calm ? "position" : false} className="group flex flex-wrap items-start gap-x-3 rounded-md px-2 py-2 hover:bg-chip/60">
                          <input type="checkbox" checked={!skipped.has(p.id)} onChange={(e) => toggle(p.id, e.target.checked)} aria-label={`Teach "${p.title}"`} className="mt-1 h-5 w-5 shrink-0 accent-[var(--t-accent)]" />
                          <span className={`min-w-0 flex-1 basis-56 ${skipped.has(p.id) ? "text-ink-dim line-through decoration-ink-dim/50" : ""}`}>
                            <span className="block text-sm font-bold text-ink">{p.title}</span>
                            <span className="line-clamp-1 text-sm text-ink-dim">{(p.text.startsWith(p.title) ? p.text.slice(p.title.length) : p.text).trim().slice(0, 240)}</span>
                          </span>
                          {pi > 0 && (
                            <button
                              type="button"
                              onClick={() => splitAt(p.index)}
                              className="ml-8 min-h-11 shrink-0 cursor-pointer rounded-md px-3 text-sm font-bold text-ink-dim sm:ml-0 hover:bg-bg hover:text-ink focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:hover)]:opacity-0"
                            >
                              New lesson from here
                            </button>
                          )}
                        </motion.li>
                      ))}
                    </ul>
                    {next && (
                      <div className="border-t border-dashed border-line px-4 py-2">
                        <button type="button" onClick={() => join(next.start)} className="min-h-11 cursor-pointer rounded-md px-3 text-sm font-bold text-ink-dim hover:bg-bg hover:text-ink">
                          Join with the next lesson
                        </button>
                      </div>
                    )}
                  </motion.li>
                );
              })}
            </ol>
          </LayoutGroup>
        </section>
      )}

      {/* 3. who it's for, and go */}
      {parts && (
        <section aria-labelledby="step3" className="mt-12">
          <h2 id="step3" className="text-lg font-bold text-ink">
            3. Who it&apos;s for
          </h2>
          <div className="mt-3 flex flex-wrap items-end gap-4">
            {many && (
              <label className="flex flex-col gap-1 text-sm font-bold text-ink">
                Unit name
                <input value={unitTitle} onChange={(e) => setUnitTitle(e.target.value)} maxLength={120} placeholder="Like Ecology, or Unit 3" className="min-h-11 w-80 max-w-full rounded-md border border-line bg-panel px-3 font-normal" />
              </label>
            )}
            <label className="flex flex-col gap-1 text-sm font-bold text-ink">
              Grade
              <select value={grade} onChange={(e) => setGrade(Number(e.target.value))} className="min-h-11 rounded-md border border-line bg-panel px-3 font-normal">
                {Array.from({ length: 13 }, (_, g) => (
                  <option key={g} value={g}>
                    {gradeLabel(g)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="mt-3 text-sm text-ink-dim">The grade sets how Gloam talks and looks. A class can still use it at another grade: Gloam follows the class.</p>
          <Button className="mt-5" onClick={start} disabled={starting || tooLong || tooLittle || !lessons.length}>
            {starting ? "Starting…" : many ? `Make ${lessons.length} lessons` : "Draft the lesson"}
          </Button>
          <p className="mt-2 max-w-[62ch] text-xs text-ink-dim">
            {many
              ? "Gloam drafts them one at a time, in order, a few minutes each on a laptop. Lesson 1 is ready first, so you can review it while the rest are drafted. You can leave this page; it keeps going."
              : "This takes a few minutes on a laptop. You can leave this page; it keeps going."}
          </p>
        </section>
      )}
    </Shell>
  );
}

/** How full a lesson is: the part of the notes Gloam can read at once */
function Fill({ chars }: { chars: number }) {
  const share = Math.min(1, chars / MAX_SOURCE_CHARS);
  const over = chars > MAX_SOURCE_CHARS;
  const words = Math.round(chars / 6);
  return (
    <span className="flex items-center gap-2 text-xs text-ink-dim">
      <span aria-hidden="true" className="relative h-1.5 w-24 overflow-hidden rounded-full bg-chip">
        <span className={`absolute inset-y-0 left-0 rounded-full ${over ? "bg-[#9b2c2c]" : "bg-[var(--t-focus)]"}`} style={{ width: `${Math.max(3, share * 100)}%` }} />
      </span>
      <span className={over ? "font-bold text-[#9b2c2c]" : ""}>{`about ${words.toLocaleString()} words${over ? ", too long" : ""}`}</span>
    </span>
  );
}
