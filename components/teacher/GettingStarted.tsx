"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Button, api, json } from "./kit";

interface ClassItem {
  id: string;
  students: number;
  lessons: string[];
}

/**
 * A new teacher's first run: four steps, each ticked off by actually doing it (not by pressing "next").
 * It stays on teacher home until every step is done (or the teacher hides it).
 */
export function GettingStarted({ classes, onAddClass, onDone }: { classes: ClassItem[]; onAddClass: () => void; onDone: () => void }) {
  const first = classes[0];
  const withLesson = classes.find((c) => c.lessons.length);
  const steps = [
    { done: true, title: "Make your account", body: "Done. Nice." },
    {
      done: classes.length > 0,
      title: "Make a class",
      body: "Its grade picks how Gloam talks and looks, from silly and gentle for little kids to dry and deadpan for high school.",
      action: <Button onClick={onAddClass}>Add a class</Button>,
    },
    {
      done: !!withLesson,
      title: "Give it a lesson",
      body: "Upload your notes (PDF, PowerPoint, Word or pasted text) and Gloam turns them into ideas to learn. Or start with the built-in seasons lesson.",
      action: first ? (
        <Link href={`/teacher/classes/${first.id}`} className="min-h-11 content-center rounded-md bg-accent px-4 text-sm font-bold text-accent-ink hover:bg-accent-hover">
          Open your class
        </Link>
      ) : null,
    },
    {
      done: classes.some((c) => c.students > 0),
      title: "Show the code to your class",
      body: "On your class page, press Show the code. Students go to the address, type the code, pick a nickname and secret pictures. You'll see them arrive.",
      action: withLesson ? (
        <Link href={`/teacher/classes/${withLesson.id}`} className="min-h-11 content-center rounded-md bg-accent px-4 text-sm font-bold text-accent-ink hover:bg-accent-hover">
          Go to the code
        </Link>
      ) : null,
    },
  ];
  const next = steps.findIndex((s) => !s.done);
  const allDone = next === -1;

  const hide = async () => {
    await api("/api/teacher/auth", json("POST", { action: "onboarded" }));
    onDone();
  };

  // everything done: remember it, so the checklist doesn't come back
  useEffect(() => {
    if (allDone) void api("/api/teacher/auth", json("POST", { action: "onboarded" }));
  }, [allDone]);

  return (
    <Sheet seed="getting-started" tone="day" className="mt-8 p-6">
      <section aria-labelledby="start-title">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="start-title" className="text-lg font-bold text-ink">
            {allDone ? "You're all set" : "Getting started"}
          </h2>
          <Button variant="quiet" className="border-0" onClick={() => void hide()}>
            {allDone ? "Close" : "Hide this"}
          </Button>
        </div>
        {allDone ? (
          <p className="mt-2 max-w-[60ch] text-md text-ink">Your students are in. Open your class during the lesson to see what each one has taught Gloam, and where they&apos;re stuck.</p>
        ) : (
          <ol className="mt-4 space-y-4">
            {steps.map((s, i) => (
              <li key={s.title} className="flex gap-4">
                <Tick done={s.done} current={i === next} />
                <div className="flex-1">
                  <p className={`text-md font-bold ${s.done ? "text-ink-dim line-through decoration-1" : "text-ink"}`}>{s.title}</p>
                  {i === next && (
                    <>
                      <p className="mt-1 max-w-[60ch] text-sm text-ink-dim">{s.body}</p>
                      {s.action && <div className="mt-3">{s.action}</div>}
                    </>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
        <p className="mt-5 text-sm text-ink-dim">
          New here?{" "}
          <Link href="/teacher/help" className="font-bold text-ink underline underline-offset-4">
            How Protégé works
          </Link>
        </p>
      </section>
    </Sheet>
  );
}

/** A small candle: lit when the step is done, a spark on the step you're on */
function Tick({ done, current }: { done: boolean; current: boolean }) {
  return (
    <svg viewBox="0 0 24 32" width="20" height="27" aria-label={done ? "done" : current ? "next" : "not yet"} role="img" className="mt-0.5 shrink-0">
      <rect x="7" y="13" width="10" height="17" rx="2" fill={done ? "#efe4c8" : "#c9d0c4"} stroke={done ? "#c9b98f" : "#aab3a5"} />
      <line x1="12" y1="13" x2="12" y2="9.5" stroke="#3a3a3a" strokeWidth="1.4" strokeLinecap="round" />
      {done && <path d="M12 1 C 16 6 16.5 9 15.2 11.6 C 14.3 13.4 9.7 13.4 8.8 11.6 C 7.5 9 8 6 12 1 Z" fill="#f4b740" stroke="#d08a1c" strokeWidth="0.6" />}
      {current && !done && <circle cx="12" cy="9" r="2" fill="#c8682a" />}
    </svg>
  );
}
