"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { POSES, type GloamMood } from "@/components/gloam/poses";
import type { Moment } from "@/components/scene/EurekaMoment";
import { pickLine, type AgeStyle } from "@/lib/age-styles";
import type { Emotion } from "@/lib/ai/schemas";
import { brightness, type Understanding } from "@/lib/companion/progress";
import type { SessionState } from "@/lib/companion/session";
import type { ClientLesson, RecapItem } from "@/lib/lesson/types";
import { chime, pip } from "@/lib/sound";

export type Phase = "loading" | "title" | "intro" | "teach" | "ending";
export type Status = "loading" | "ready" | "thinking" | "offline";

export type Entry =
  | { id: string; kind: "gloam"; text: string; emotion: GloamMood; fresh: boolean }
  | { id: string; kind: "student"; text: string }
  | { id: string; kind: "story"; text: string };

const SESSION_KEY = "protege.session";
const SOUND_KEY = "protege.sound";
// Story beats appear when the valley reaches these brightness levels
const BEAT_AT = [0, 0.2, 0.45, 0.7, 1];

let uid = 0;
const nextId = () => `e${++uid}`;

function safeStorage<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

const checkHealth = () =>
  fetch("/api/health")
    .then((r) => r.json() as Promise<{ online: boolean }>)
    .catch(() => ({ online: false }));

// One load per page view, even when React runs effects twice in development
let sessionLoad: Promise<SessionState | null> | null = null;
function loadSession(lessonId: string, fresh = false): Promise<SessionState | null> {
  if (fresh) sessionLoad = null;
  sessionLoad ??= (async () => {
    const saved = fresh ? null : safeStorage(() => localStorage.getItem(SESSION_KEY), null);
    if (saved) {
      const r = await fetch(`/api/session?id=${encodeURIComponent(saved)}`).catch(() => null);
      if (r?.ok) return (await r.json()) as SessionState;
    }
    const r = await fetch("/api/session", { method: "POST", body: JSON.stringify({ lessonId }) }).catch(() => null);
    return r?.ok ? ((await r.json()) as SessionState) : null;
  })();
  return sessionLoad;
}

/**
 * Everything about one student teaching one lesson: the session, the conversation,
 * Gloam's mood, the candles, the big moments. Layouts (game screen, storybook) only draw it.
 */
export function useTeachSession(lesson: ClientLesson, style: AgeStyle) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [resumable, setResumable] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [shown, setShown] = useState<Understanding>(() => Object.fromEntries(lesson.concepts.map((c) => [c.id, 0])));
  const [status, setStatus] = useState<Status>("loading");
  const [offlineTries, setOfflineTries] = useState(0);
  const [emotion, setEmotion] = useState<GloamMood>("asleep");
  const [thinking, setThinking] = useState<string | null>(null);
  const [moment, setMoment] = useState<Moment | null>(null);
  const [eurekaTick, setEurekaTick] = useState(0);
  const [flash, setFlash] = useState<string | null>(null);
  const [sound, setSound] = useState(false);
  const [finished, setFinished] = useState(false);
  const [recap, setRecap] = useState<RecapItem[] | null>(null);
  const [typingTick, setTypingTick] = useState(0);
  const [listening, setListening] = useState(false);
  const pending = useRef<{ reply: string; emotion: Emotion; understanding: Understanding } | null>(null);
  const lastMessage = useRef<string | null>(null);
  const beatShown = useRef(0);
  const shownRef = useRef(shown);
  const listenTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    shownRef.current = shown;
  }, [shown]);

  const light = brightness(shown);
  const gloamSaid = useMemo(() => entries.filter((e) => e.kind === "gloam").map((e) => e.text), [entries]);
  const fill = useMemo(() => ({ topic: lesson.topic, question: "" }), [lesson.topic]);

  const beatsFor = useCallback(
    (u: Understanding) => {
      const b = brightness(u);
      const out: Entry[] = [];
      while (beatShown.current + 1 < BEAT_AT.length && b >= BEAT_AT[beatShown.current + 1] - 1e-9) {
        beatShown.current++;
        out.push({ id: nextId(), kind: "story", text: lesson.storyBeats[beatShown.current] });
      }
      return out;
    },
    [lesson.storyBeats],
  );

  // ---------- load ----------
  const applySession = useCallback(
    (session: SessionState) => {
      safeStorage(() => localStorage.setItem(SESSION_KEY, session.id), undefined);
      setSessionId(session.id);
      setFinished(session.finished);
      setRecap(session.recap ?? null);
      setShown(session.understanding);
      beatShown.current = BEAT_AT.filter((t) => brightness(session.understanding) >= t - 1e-9).length - 1;
      const restored: Entry[] = [{ id: nextId(), kind: "story", text: lesson.storyBeats[0] }];
      for (const m of session.messages) {
        restored.push(
          m.from === "gloam"
            ? { id: nextId(), kind: "gloam", text: m.text, emotion: (m.emotion as Emotion) ?? "curious", fresh: false }
            : { id: nextId(), kind: "student", text: m.text },
        );
      }
      setEntries(restored);
      const resumed = session.messages.length > 1;
      setResumable(resumed);
      const last = [...session.messages].reverse().find((m) => m.from === "gloam");
      setEmotion(resumed ? ((last?.emotion as Emotion) ?? "curious") : "asleep");
    },
    [lesson.storyBeats],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      setSound(safeStorage(() => localStorage.getItem(SOUND_KEY) === "on", false));
      const healthP = checkHealth();
      const session = await loadSession(lesson.id);
      if (cancelled) return;
      if (session) applySession(session);
      setPhase("title");
      const health = await healthP;
      if (cancelled) return;
      setStatus(health.online && session ? "ready" : "offline");
    })();
    return () => {
      cancelled = true;
    };
  }, [lesson.id, applySession]);

  // Rotate the thinking lines while the AI works (only while one is showing)
  useEffect(() => {
    if (status !== "thinking") return;
    const t = setInterval(() => {
      setThinking((cur) => (cur === null || style.lines.clicking.includes(cur) || style.lines.almost.includes(cur) ? cur : pickLine(style.lines.thinking, fill, [cur])));
    }, 2600);
    return () => clearInterval(t);
  }, [status, style, fill]);

  // ---------- flow ----------
  const start = useCallback(() => {
    if (resumable) {
      setPhase(finished ? "ending" : "teach");
      return;
    }
    setPhase("intro");
  }, [resumable, finished]);

  const finishIntro = useCallback(() => {
    setPhase("teach");
    setEmotion("proud");
    setEntries((xs) =>
      xs.some((x) => x.kind === "gloam") ? xs.map((x) => (x.kind === "gloam" ? { ...x, fresh: true } : x)) : [...xs, { id: nextId(), kind: "gloam", text: lesson.opener, emotion: "proud", fresh: true }],
    );
  }, [lesson.opener]);

  const showReply = useCallback(
    (reply: string, emo: Emotion, u: Understanding) => {
      setShown(u);
      setEmotion(emo);
      setEntries((xs) => [...xs, { id: nextId(), kind: "gloam", text: reply, emotion: emo, fresh: true }, ...beatsFor(u)]);
    },
    [beatsFor],
  );

  const send = useCallback(
    async (text: string) => {
      if (!sessionId) return;
      lastMessage.current = text;
      setStatus("thinking");
      setThinking(pickLine(style.lines.thinking, fill, []));

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
              if (ev.clicked.length) setThinking(pickLine(style.lines.clicking, fill, []));
              else if (ev.improved.length) setThinking(pickLine(style.lines.almost, fill, []));
            } else if (ev.type === "reply") {
              gotReply = true;
              // During a big moment, keep Gloam's "oh no." showing until its line lands at the peak
              setThinking(ev.clicked.length ? pickLine(style.lines.clicking, fill, []) : null);
              setFinished(ev.finished);
              if (ev.recap) setRecap(ev.recap);
              if (ev.clicked.length) {
                const concept = lesson.concepts.find((c) => c.id === ev.clicked[0]);
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
      }
    },
    [sessionId, lesson.concepts, showReply, sound, style, fill],
  );

  const teach = useCallback(
    (text: string) => {
      const clean = text.trim();
      if (!clean || status !== "ready") return false;
      setEntries((xs) => [...xs, { id: nextId(), kind: "student", text: clean }]);
      void send(clean);
      return true;
    },
    [status, send],
  );

  const retry = useCallback(async () => {
    const health = await checkHealth();
    if (!health.online) {
      setOfflineTries((n) => n + 1);
      return;
    }
    setOfflineTries(0);
    setEmotion("curious");
    const last = entries[entries.length - 1];
    if (last?.kind === "student" && lastMessage.current) void send(lastMessage.current);
    else setStatus("ready");
  }, [entries, send]);

  // The peak of a eureka moment: light the candle and let Gloam speak
  const onPeak = useCallback(() => {
    const p = pending.current;
    if (!p) return;
    setEurekaTick((t) => t + 1);
    setThinking(null);
    if (sound) chime(finished);
    showReply(p.reply, p.emotion, p.understanding);
  }, [showReply, sound, finished]);

  const onMomentDone = useCallback(() => {
    const wasFinal = moment?.final;
    pending.current = null;
    setMoment(null);
    setFlash(null);
    setEmotion("proud");
    setStatus("ready");
    if (wasFinal) setPhase("ending");
  }, [moment]);

  const typed = useCallback(() => {
    setTypingTick((t) => t + 1);
    setListening(true);
    if (listenTimer.current) clearTimeout(listenTimer.current);
    listenTimer.current = setTimeout(() => setListening(false), 2200);
  }, []);

  const startOver = useCallback(async () => {
    safeStorage(() => localStorage.removeItem(SESSION_KEY), undefined);
    const session = await loadSession(lesson.id, true);
    if (!session) return;
    setMoment(null);
    setRecap(null);
    applySession(session);
    setPhase("intro");
  }, [lesson.id, applySession]);

  const toggleSound = useCallback(() => {
    setSound((s) => {
      safeStorage(() => localStorage.setItem(SOUND_KEY, s ? "off" : "on"), undefined);
      if (!s) pip();
      return !s;
    });
  }, []);

  // ---------- Gloam's mood right now ----------
  const mood: GloamMood = useMemo(() => {
    if (status === "offline" && phase !== "title") return "asleep";
    if (phase === "title") return resumable ? "proud" : "asleep";
    if (status === "thinking" && !moment) {
      if (thinking && (style.lines.clicking.includes(thinking) || style.lines.almost.includes(thinking))) return "curious";
      return "thinking";
    }
    if (listening && status === "ready" && phase === "teach") return "listening";
    return emotion;
  }, [status, phase, resumable, moment, thinking, listening, emotion, style]);

  return {
    phase,
    setPhase,
    status,
    offlineTries,
    entries,
    shown,
    light,
    mood,
    setEmotion,
    thinking,
    moment,
    eurekaTick,
    flash,
    sound,
    finished,
    recap,
    resumable,
    typingTick,
    gloamSaid,
    bounce: POSES[mood].bounce,
    start,
    finishIntro,
    teach,
    typed,
    retry,
    onPeak,
    onMomentDone,
    startOver,
    toggleSound,
  };
}

export type TeachSession = ReturnType<typeof useTeachSession>;
