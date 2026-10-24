"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Conversation, type Item } from "@/components/chat/Conversation";
import { TeachInput } from "@/components/chat/TeachInput";
import { Gloam } from "@/components/gloam/Gloam";
import { POSES, type GloamMood } from "@/components/gloam/poses";
import { Candles } from "@/components/scene/Candles";
import { Diorama } from "@/components/scene/Diorama";
import { EurekaMoment, type Moment } from "@/components/scene/EurekaMoment";
import type { Emotion } from "@/lib/ai/schemas";
import { brightness, type Understanding } from "@/lib/companion/progress";
import type { SessionState } from "@/lib/companion/session";
import type { ClientLesson, RecapItem } from "@/lib/lesson/types";
import { Intro, introSteps } from "@/components/Intro";
import { chime, pip } from "@/lib/sound";

type Status = "loading" | "ready" | "thinking" | "offline";

const SESSION_KEY = "protege.session";
const SOUND_KEY = "protege.sound";

// What Gloam "says" while the model is working. Rotates so waiting is part of the show.
const THINKING = [
  "hmm…",
  "thinking so hard my stalk hurts",
  "processing… processing… ow.",
  "my lantern is buffering",
  "okay okay okay hold on",
];

// Story beats appear when the valley reaches these brightness levels
const BEAT_AT = [0, 0.2, 0.45, 0.7, 1];

let uid = 0;
const nextId = () => `i${++uid}`;

const checkHealth = () =>
  fetch("/api/health")
    .then((r) => r.json() as Promise<{ online: boolean }>)
    .catch(() => ({ online: false }));

// One load per page view, even when React runs effects twice in development
let sessionLoad: Promise<SessionState | null> | null = null;
function loadSession(lessonId: string): Promise<SessionState | null> {
  sessionLoad ??= (async () => {
    const saved = safeStorage(() => localStorage.getItem(SESSION_KEY), null);
    if (saved) {
      const r = await fetch(`/api/session?id=${encodeURIComponent(saved)}`).catch(() => null);
      if (r?.ok) return (await r.json()) as SessionState;
    }
    const r = await fetch("/api/session", { method: "POST", body: JSON.stringify({ lessonId }) }).catch(() => null);
    return r?.ok ? ((await r.json()) as SessionState) : null;
  })();
  return sessionLoad;
}

function safeStorage<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

export function TeachScreen({ lesson }: { lesson: ClientLesson }) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [shown, setShown] = useState<Understanding>(() => Object.fromEntries(lesson.concepts.map((c) => [c.id, 0])));
  const [status, setStatus] = useState<Status>("loading");
  const [emotion, setEmotion] = useState<GloamMood>("asleep");
  const [draft, setDraft] = useState("");
  const [typingTick, setTypingTick] = useState(0);
  const [lastTyped, setLastTyped] = useState(0);
  const [now, setNow] = useState(0);
  const [thinking, setThinking] = useState<string | null>(null);
  const [moment, setMoment] = useState<Moment | null>(null);
  const [eurekaTick, setEurekaTick] = useState(0);
  const [flash, setFlash] = useState<string | null>(null);
  const [sound, setSound] = useState(false);
  const [finished, setFinished] = useState(false);
  const [recap, setRecap] = useState<RecapItem[] | null>(null);
  const [intro, setIntro] = useState(false);
  const opening = useRef<Item[]>([]);
  const pending = useRef<{ reply: string; emotion: Emotion; understanding: Understanding } | null>(null);
  const lastMessage = useRef<string | null>(null);
  const beatShown = useRef(0);

  const light = brightness(shown);
  const shownRef = useRef(shown);
  useEffect(() => {
    shownRef.current = shown;
  }, [shown]);

  // ---------- story beats ----------
  const addBeatsFor = useCallback(
    (u: Understanding) => {
      const b = brightness(u);
      const out: Item[] = [];
      while (beatShown.current + 1 < BEAT_AT.length && b >= BEAT_AT[beatShown.current + 1] - 1e-9) {
        beatShown.current++;
        out.push({ id: nextId(), kind: "story", text: lesson.storyBeats[beatShown.current] });
      }
      return out;
    },
    [lesson.storyBeats],
  );

  // ---------- start: wake Gloam's brain + load or create a session ----------
  useEffect(() => {
    let cancelled = false;

    (async () => {
      await Promise.resolve();
      setSound(safeStorage(() => localStorage.getItem(SOUND_KEY) === "on", false));
      const healthP = checkHealth();
      const session = await loadSession(lesson.id);
      if (cancelled) return;
      if (!session) {
        setStatus("offline");
        setItems([{ id: nextId(), kind: "offline" }]);
        return;
      }
      safeStorage(() => localStorage.setItem(SESSION_KEY, session.id), undefined);
      setSessionId(session.id);
      setFinished(session.finished);
      setRecap(session.recap ?? null);

      const resumed = session.messages.length > 1;
      beatShown.current = 0;
      const restored: Item[] = [{ id: nextId(), kind: "story", text: lesson.storyBeats[0] }];
      for (const m of session.messages) {
        restored.push(
          m.from === "gloam"
            ? { id: nextId(), kind: "gloam", text: m.text, bounce: POSES[(m.emotion as Emotion) ?? "curious"]?.bounce ?? 20, fresh: !resumed }
            : { id: nextId(), kind: "student", text: m.text },
        );
      }
      // Skip story beats already passed
      beatShown.current = BEAT_AT.filter((t) => brightness(session.understanding) >= t - 1e-9).length - 1;
      const last = [...session.messages].reverse().find((m) => m.from === "gloam");

      if (resumed) {
        setShown(session.understanding);
        setItems(restored);
        setEmotion((last?.emotion as Emotion) ?? "curious");
      } else {
        // New session: the valley is dark, Gloam is asleep... it wakes up and explains your job.
        setItems(restored.slice(0, 1));
        opening.current = restored;
        setTimeout(() => !cancelled && setIntro(true), 900);
      }

      const health = await healthP;
      if (cancelled) return;
      if (!health.online) {
        setStatus("offline");
        setEmotion("asleep");
        setItems((xs) => [...xs, { id: nextId(), kind: "offline" }]);
      } else {
        setStatus("ready");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lesson]);

  // A slow clock so "listening" wears off when the student stops typing
  useEffect(() => {
    if (!draft) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [draft]);

  // Rotate the thinking lines
  useEffect(() => {
    if (status !== "thinking") return;
    let i = 0;
    // Only rotate while a line is showing. Once the reply lands (null) or Gloam reacted ("W A I T."), leave it alone.
    const t = setInterval(() => setThinking((cur) => (cur === null || cur === "W A I T." || cur.startsWith("ooh") ? cur : THINKING[++i % THINKING.length])), 2600);
    return () => clearInterval(t);
  }, [status]);

  // ---------- teaching ----------
  const showReply = useCallback(
    (reply: string, emo: Emotion, u: Understanding) => {
      setShown(u);
      setEmotion(emo);
      setItems((xs) => [...xs, { id: nextId(), kind: "gloam", text: reply, bounce: POSES[emo].bounce, fresh: true }, ...addBeatsFor(u)]);
    },
    [addBeatsFor],
  );

  const send = useCallback(
    async (text: string) => {
      if (!sessionId) return;
      lastMessage.current = text;
      setStatus("thinking");
      setThinking(THINKING[Math.floor(Math.random() * THINKING.length)]);

      let gotReply = false;
      try {
        const res = await fetch("/api/companion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, message: text }),
        });
        if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let nl: number;
          while ((nl = buffer.indexOf("\n")) >= 0) {
            const line = buffer.slice(0, nl).trim();
            buffer = buffer.slice(nl + 1);
            if (!line) continue;
            const ev = JSON.parse(line);

            if (ev.type === "judged") {
              // Gloam reacts before it has the words: you can SEE it start to get it
              if (ev.clicked.length) setThinking("W A I T.");
              else if (ev.improved.length) setThinking("ooh. ooh ooh. hold on");
            } else if (ev.type === "reply") {
              gotReply = true;
              setThinking(null);
              setFinished(ev.finished);
              if (ev.recap) setRecap(ev.recap);
              if (ev.clicked.length) {
                const concept = lesson.concepts.find((c) => c.id === ev.clicked[0]);
                // The full cinematic is for the first idea and the finale. The rest are short.
                const firstEver = lesson.concepts.every((c) => (shownRef.current[c.id] ?? 0) < 3);
                pending.current = { reply: ev.reply, emotion: ev.emotion, understanding: ev.understanding };
                setFlash(ev.clicked[0]);
                setMoment({
                  key: Date.now(),
                  conceptName: concept?.name ?? "something new",
                  size: firstEver || ev.finished ? "full" : "short",
                  final: ev.finished,
                });
              } else {
                showReply(ev.reply, ev.emotion, ev.understanding);
                if (sound) pip();
                setStatus("ready");
              }
            } else if (ev.type === "offline") {
              throw new Error("offline");
            }
          }
        }
        if (!gotReply) throw new Error("no reply");
      } catch {
        setThinking(null);
        setStatus("offline");
        setEmotion("asleep");
        setItems((xs) => [...xs, { id: nextId(), kind: "offline" }]);
      }
    },
    [sessionId, lesson.concepts, showReply, sound],
  );

  const submit = () => {
    const text = draft.trim();
    if (!text || status !== "ready") return;
    setDraft("");
    setItems((xs) => [...xs, { id: nextId(), kind: "student", text }]);
    void send(text);
  };

  const retry = async () => {
    const health = await checkHealth();
    if (!health.online) {
      setItems((xs) => xs.map((x) => (x.kind === "offline" ? { ...x, id: nextId(), tries: (x.tries ?? 0) + 1 } : x)));
      return;
    }
    setItems((xs) => xs.filter((x) => x.kind !== "offline"));
    setEmotion("curious");
    // The student's last message was saved on screen but Gloam never answered. Ask again.
    const last = [...items].reverse().find((x) => x.kind !== "offline");
    if (last?.kind === "student" && lastMessage.current) void send(lastMessage.current);
    else setStatus("ready");
  };

  // The peak of the eureka moment: light up the candle and let Gloam speak
  const onPeak = useCallback(() => {
    const p = pending.current;
    if (!p) return;
    setEurekaTick((t) => t + 1);
    if (sound) chime(finished);
    showReply(p.reply, p.emotion, p.understanding);
  }, [showReply, sound, finished]);

  const onMomentDone = useCallback(() => {
    pending.current = null;
    setMoment(null);
    setFlash(null);
    setEmotion("proud"); // settle down after the big moment
    setStatus("ready");
  }, []);

  const steps = useMemo(() => introSteps(lesson.title, lesson.concepts.length), [lesson.title, lesson.concepts.length]);
  const finishIntro = useCallback(() => {
    setIntro(false);
    setEmotion("proud");
    setItems(opening.current);
    // Put the cursor where the student teaches
    setTimeout(() => document.getElementById("teach")?.focus(), 50);
  }, []);

  const startOver = async () => {
    safeStorage(() => localStorage.removeItem(SESSION_KEY), undefined);
    window.location.reload();
  };

  const toggleSound = () => {
    setSound((s) => {
      safeStorage(() => localStorage.setItem(SOUND_KEY, s ? "off" : "on"), undefined);
      if (!s) pip();
      return !s;
    });
  };

  // ---------- what Gloam looks like right now ----------
  const listening = draft.length > 0 && now - lastTyped < 2500 && status === "ready";
  const mood: GloamMood = useMemo(() => {
    if (status === "offline") return "asleep";
    if (status === "thinking" && !moment) return thinking === "W A I T." || thinking?.startsWith("ooh") ? "curious" : "thinking";
    if (listening) return "listening";
    return emotion;
  }, [status, moment, thinking, listening, emotion]);

  return (
    // Phone: header, stage, conversation, input stacked. Laptop: stage on the left, the page on the right.
    <div data-screen={moment ? "moment" : status} className="grid h-dvh grid-rows-[auto_auto_minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1.15fr)_minmax(400px,1fr)] md:grid-rows-[auto_minmax(0,1fr)_auto]">
      <div className="md:col-start-2 md:row-start-1">
        <Header lesson={lesson} sound={sound} onToggleSound={toggleSound} onStartOver={startOver} />
      </div>

      {/* ---------- the stage ---------- */}
      <section
        aria-label="Gloam's valley"
        className="relative h-[40dvh] overflow-hidden bg-soot md:col-start-1 md:row-span-3 md:row-start-1 md:m-3 md:h-auto md:rounded-lg"
      >
        <Diorama brightness={light} />
        <div className="absolute inset-x-0 top-[4%] bottom-[27%] flex items-end justify-center md:top-[8%] md:bottom-[22%]">
          <Gloam mood={mood} brightness={light} typingTick={typingTick} eurekaTick={eurekaTick} className="h-full max-h-[460px] w-auto" />
        </div>
        <div className="absolute inset-x-0 bottom-2 md:bottom-5">
          <Candles concepts={lesson.concepts} understanding={shown} flash={flash} />
        </div>
        <EurekaMoment moment={moment} onPeak={onPeak} onDone={onMomentDone} />
      </section>

      {/* ---------- the page ---------- */}
      <main className="contents">
        <div className="min-h-0 overflow-y-auto md:col-start-2 md:row-start-2">
          {intro ? (
            <Intro steps={steps} onStep={setEmotion} onDone={finishIntro} />
          ) : (
            <>
              <Conversation items={items} thinking={status === "thinking" ? thinking : null} onRetry={retry} />
              {finished && recap && !moment && <Recap recap={recap} onStartOver={startOver} />}
            </>
          )}
        </div>
        <div className={`md:col-start-2 md:row-start-3 ${intro ? "hidden" : ""}`}>
          <TeachInput
          value={draft}
          onChange={(v) => {
            setDraft(v);
            setTypingTick((t) => t + 1);
            setLastTyped(Date.now());
            setNow(Date.now());
          }}
          onSend={submit}
          canSend={status === "ready"}
          hint={items.some((i) => i.kind === "student") ? undefined : "Not sure how to start? Tell Gloam if its theory is right, and why."}
          disabled={status === "loading"}
          />
        </div>
      </main>
    </div>
  );
}

function Header({ lesson, sound, onToggleSound, onStartOver }: { lesson: ClientLesson; sound: boolean; onToggleSound: () => void; onStartOver: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [help, setHelp] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(() => setConfirming(false), 4000);
    return () => clearTimeout(t);
  }, [confirming]);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (help && !d.open) d.showModal();
    if (!help && d.open) d.close();
  }, [help]);

  const btn = "min-h-11 cursor-pointer rounded-md px-2.5 text-xs font-bold text-moss hover:bg-mist-dim sm:px-3";

  return (
    <header className="flex items-center gap-x-3 border-b-2 border-moss/15 px-4 py-1.5 sm:px-8 md:py-3">
      <div className="mr-auto min-w-0">
        <p className="voice hidden text-md leading-none font-bold text-moss md:block" style={{ ["--bounce" as string]: 40 }}>
          Protégé
        </p>
        <h1 className="truncate text-xs font-bold text-moss md:mt-1 md:text-sm">{lesson.title}</h1>
      </div>
      <nav className="flex shrink-0 items-center" aria-label="Lesson options">
        <button type="button" className={btn} onClick={() => setHelp(true)}>
          <span className="sm:hidden">Help</span>
          <span className="hidden sm:inline">How this works</span>
        </button>
        <button type="button" className={btn} aria-pressed={sound} onClick={onToggleSound}>
          Sound: {sound ? "on" : "off"}
        </button>
        <button
          type="button"
          className={`${btn} ${confirming ? "bg-rosehip-deep text-mist hover:bg-rosehip-ink" : ""}`}
          onClick={() => (confirming ? onStartOver() : setConfirming(true))}
        >
          {confirming ? "Yes, make Gloam forget" : "Start over"}
        </button>
      </nav>

      <dialog
        ref={dialog}
        onClose={() => setHelp(false)}
        className="m-auto max-w-md rounded-lg bg-mist p-6 text-moss backdrop:bg-soot/70"
        aria-labelledby="help-title"
      >
        <h2 id="help-title" className="voice text-lg font-bold">
          You&apos;re the teacher here.
        </h2>
        <div className="mt-3 space-y-2 text-sm">
          <p>Gloam is confused about &quot;{lesson.title}&quot; and has some very wrong ideas. Your job is to explain things in your own words.</p>
          <p>When Gloam understands an idea, one of the candles lights up. Light all {lesson.concepts.length} and the whole valley wakes up.</p>
          <p>There are no wrong turns and nothing is graded. If you&apos;re stuck, tell Gloam. It&apos;s stuck too.</p>
        </div>
        <button type="button" onClick={() => setHelp(false)} className="mt-5 cursor-pointer rounded-md bg-moss px-4 py-2 text-sm font-bold text-mist hover:bg-moss-deep">
          Got it
        </button>
      </dialog>
    </header>
  );
}

/**
 * The end-of-lesson recap. The text comes from the lesson blueprint (written by a person),
 * never from the AI, so every student leaves with the correct ideas.
 */
function Recap({ recap, onStartOver }: { recap: RecapItem[]; onStartOver: () => void }) {
  return (
    <section aria-labelledby="recap-title" className="mx-5 mb-6 border-t-2 border-moss/20 pt-5 sm:mx-8">
      <h2 id="recap-title" className="voice text-lg font-bold text-moss" style={{ ["--bounce" as string]: 60 }}>
        What you taught Gloam
      </h2>
      <p className="mt-1 text-sm text-moss">The valley is lit. Here are the big ideas, in plain words:</p>
      <ul className="mt-4 space-y-3">
        {recap.map((r) => (
          <li key={r.id} className="border-l-4 border-lantern pl-3 text-sm text-moss">
            <span className="block font-bold">{r.name}</span>
            {r.text}
          </li>
        ))}
      </ul>
      <button type="button" onClick={onStartOver} className="mt-5 min-h-11 cursor-pointer rounded-md bg-moss px-4 text-sm font-bold text-mist hover:bg-moss-deep">
        Teach Gloam again from the start
      </button>
    </section>
  );
}
