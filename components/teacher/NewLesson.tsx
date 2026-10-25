"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { MAX_SOURCE_CHARS } from "@/lib/teacher/limits";
import { Button, Shell, api, gradeLabel, json } from "./kit";

interface Section {
  id: string;
  title: string;
  text: string;
}

/**
 * Bring a lesson in three steps on one page:
 *   1. drop a file (PDF, PowerPoint, Word) or paste text
 *   2. tick the parts to teach (if it's long)
 *   3. pick the grade, then Gloam reads it and drafts the lesson
 */
export function NewLesson() {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"file" | "paste">("file");
  const [pasted, setPasted] = useState("");
  const [reading, setReading] = useState(false);
  const [sourceName, setSourceName] = useState("");
  const [sections, setSections] = useState<Section[] | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [grade, setGrade] = useState(9);
  const [titleHint, setTitleHint] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [dragging, setDragging] = useState(false);

  const chars = sections?.filter((s) => picked.has(s.id)).reduce((n, s) => n + s.text.length, 0) ?? 0;
  const tooLong = chars > MAX_SOURCE_CHARS;

  const gotSections = (name: string, list: Section[]) => {
    setSourceName(name);
    setSections(list);
    // pick from the top until we'd go over the limit
    const pick = new Set<string>();
    let n = 0;
    for (const s of list) {
      if (n + s.text.length > MAX_SOURCE_CHARS) break;
      pick.add(s.id);
      n += s.text.length;
    }
    setPicked(pick);
  };

  const readFile = async (file: File) => {
    setError(null);
    setReading(true);
    const form = new FormData();
    form.append("file", file);
    const res = await api<{ name: string; sections: Section[] }>("/api/teacher/read", { method: "POST", body: form });
    setReading(false);
    if (!res.ok) return setError(res.error);
    gotSections(res.data.name, res.data.sections);
  };

  const readPasted = async () => {
    setError(null);
    setReading(true);
    const res = await api<{ name: string; sections: Section[] }>("/api/teacher/read", json("POST", { text: pasted }));
    setReading(false);
    if (!res.ok) return setError(res.error);
    gotSections(res.data.name, res.data.sections);
  };

  const start = async () => {
    if (!sections) return;
    setStarting(true);
    setError(null);
    const source = sections
      .filter((s) => picked.has(s.id))
      .map((s) => s.text)
      .join("\n\n");
    const res = await api<{ id: string }>("/api/teacher/lessons", json("POST", { source, sourceName, grade, titleHint: titleHint.trim() || undefined }));
    if (!res.ok) {
      setStarting(false);
      return setError(res.error);
    }
    router.push(`/teacher/lessons/${res.data.id}`);
  };

  return (
    <Shell back={{ href: "/teacher", label: "All lessons" }} title="New lesson from your notes">
      <p className="mt-2 max-w-[60ch] text-md text-ink-dim">
        Gloam reads your notes, finds the key ideas and the wrong ideas students usually have, and drafts the lesson. You review everything before students see it.
      </p>

      {error && (
        <p role="alert" className="mt-6 rounded-md bg-[#f3d6d6] px-4 py-3 text-sm font-bold text-[#7a2330]">
          {error}
        </p>
      )}

      {/* 1. bring it in */}
      <section aria-labelledby="step1" className="mt-8">
        <h2 id="step1" className="text-lg font-bold text-ink">
          1. Bring your lesson
        </h2>
        <div className="mt-3 flex gap-1" role="tablist" aria-label="How to add your lesson">
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
            <p className="text-md text-ink">{reading ? "Reading your file…" : sourceName && sections ? `Using: ${sourceName}` : "Drop a PDF, PowerPoint or Word file here"}</p>
            <input ref={fileInput} type="file" accept=".pdf,.pptx,.docx,.txt,.md" className="sr-only" id="file" onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])} />
            <Button variant="quiet" onClick={() => fileInput.current?.click()} disabled={reading}>
              {sections ? "Choose a different file" : "Choose a file"}
            </Button>
            <p className="text-xs text-ink-dim">Your file stays on this computer. It isn&apos;t uploaded anywhere.</p>
          </div>
        ) : (
          <div className="mt-3">
            <label htmlFor="paste" className="sr-only">
              Your lesson text
            </label>
            <textarea
              id="paste"
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              rows={10}
              placeholder="Paste your notes or slide text here…"
              className="w-full rounded-lg border border-line bg-panel p-4 text-sm text-ink focus:border-[var(--t-focus)] focus:outline-none"
            />
            <Button className="mt-2" onClick={readPasted} disabled={reading || pasted.trim().length < 80}>
              {reading ? "Reading…" : "Use this text"}
            </Button>
          </div>
        )}
      </section>

      {/* 2. pick sections */}
      {sections && (
        <section aria-labelledby="step2" className="mt-10">
          <h2 id="step2" className="text-lg font-bold text-ink">
            2. Pick what to teach
          </h2>
          <p className="mt-1 text-sm text-ink-dim">
            One lesson works best with one big topic. {sections.length > 1 ? "Untick anything that isn't part of it." : ""}
          </p>
          <ul className="mt-3 divide-y divide-line border-y border-line">
            {sections.map((s) => (
              <li key={s.id}>
                <label className="flex cursor-pointer items-start gap-3 py-3">
                  <input
                    type="checkbox"
                    checked={picked.has(s.id)}
                    onChange={(e) =>
                      setPicked((p) => {
                        const next = new Set(p);
                        if (e.target.checked) next.add(s.id);
                        else next.delete(s.id);
                        return next;
                      })
                    }
                    className="mt-1 h-5 w-5 accent-[var(--t-accent)]"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-ink">{s.title}</span>
                    <span className="line-clamp-2 block text-sm text-ink-dim">{s.text.slice(0, 220)}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <p className={`mt-2 text-sm ${tooLong ? "font-bold text-accent" : "text-ink-dim"}`} aria-live="polite">
            {chars.toLocaleString()} of {MAX_SOURCE_CHARS.toLocaleString()} characters{tooLong ? ". That's too much for Gloam to read at once. Untick a section or two." : ""}
          </p>
        </section>
      )}

      {/* 3. grade + go */}
      {sections && (
        <section aria-labelledby="step3" className="mt-10">
          <h2 id="step3" className="text-lg font-bold text-ink">
            3. Who it&apos;s for
          </h2>
          <div className="mt-3 flex flex-wrap items-end gap-4">
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
            <label className="flex flex-col gap-1 text-sm font-bold text-ink">
              Lesson title (optional)
              <input value={titleHint} onChange={(e) => setTitleHint(e.target.value)} placeholder="Gloam will suggest one" className="min-h-11 w-72 rounded-md border border-line bg-panel px-3 font-normal" />
            </label>
          </div>
          <p className="mt-3 text-sm text-ink-dim">The grade sets how Gloam talks and looks for this class.</p>
          <Button className="mt-5" onClick={start} disabled={starting || tooLong || picked.size === 0}>
            {starting ? "Starting…" : "Draft the lesson"}
          </Button>
          <p className="mt-2 text-xs text-ink-dim">This takes a few minutes on a laptop. You can leave this page; it keeps going.</p>
        </section>
      )}
    </Shell>
  );
}
