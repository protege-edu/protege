"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { POSES, type GloamMood } from "@/components/gloam/poses";
import type { Moment } from "@/components/scene/EurekaMoment";
import { pickLine, type AgeStyle } from "@/lib/age-styles";
import type { Emotion } from "@/lib/ai/schemas";
import { levelFor, type GloamLevel } from "@/lib/companion/level";
import { brightness, type Understanding } from "@/lib/companion/progress";
import type { SessionState } from "@/lib/companion/session";
import type { ClientLesson, RecapItem } from "@/lib/lesson/types";
import { chime, pip } from "@/lib/sound";
import { setAccess, useAccess } from "@/lib/access/store";

export type Phase = "loading" | "title" | "intro" | "teach" | "ending";
/** paused: the teacher paused the class (Gloam sleeps until they wake it) */
export type Status = "loading" | "ready" | "thinking" | "offline" | "paused";

export type Entry =
  | { id: string; kind: "gloam"; text: string; emotion: GloamMood; fresh: boolean }
  | { id: string; kind: "student"; text: string }
  | { id: string; kind: "story"; text: string };

// Each lesson remembers its own session, so switching lessons never resumes the wrong one
const sessionKey = (lessonId: string) => `protege.session.${lessonId}`;
// The browser's practice student (a random id, nickname "Test Pilot"), so Gloam keeps growing across lessons
const STUDENT_KEY = "protege.student";
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
const sessionLoads = new Map<string, Promise<SessionState | null>>();
function loadSession(lessonId: string, fresh = false): Promise<SessionState | null> {
  if (fresh) sessionLoads.delete(lessonId);
  const existing = sessionLoads.get(lessonId);
  if (existing) return existing;
  const load = (async () => {
    const saved = fresh ? null : safeStorage(() => localStorage.getItem(sessionKey(lessonId)), null);
    if (saved) {
      const r = await fetch(`/api/session?id=${encodeURIComponent(saved)}`).catch(() => null);
      if (r?.ok) return (await r.json()) as SessionState;
    }
    const studentId = safeStorage(() => localStorage.getItem(STUDENT_KEY), null) ?? undefined;
    const r = await fetch("/api/session", { method: "POST", body: JSON.stringify({ lessonId, studentId, fresh }) }).catch(() => null);
    return r?.ok ? ((await r.json()) as SessionState) : null;
  })();
  sessionLoads.set(lessonId, load);
  return load;
}

/**
 * Everything about one student teaching one lesson: the session, the conversation,
 * Gloam's mood, the candles, the big moments. Layouts (game screen, storybook) only draw it.
 */
interface ReplyEvent {
  reply: string;
  emotion: Emotion;
  understanding: Understanding;
  clicked: string[];
  finished: boolean;
  checkpoints?: string[];
  recap?: RecapItem[];
  gloam?: GloamLevel;
  levelUp?: boolean;
}

export function useTeachSession(lesson: ClientLesson, style: AgeStyle, test = false) {
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
  // sound is one of the student's Ways to play (lib/access)
  const sound = useAccess(style).sound;
  const [finished, setFinished] = useState(false);
  const [recap, setRecap] = useState<RecapItem[] | null>(null);
  const [typingTick, setTypingTick] = useState(0);
  const [listening, setListening] = useState(false);
  const [checkpoints, setCheckpoints] = useState<string[]>([]);
  const [gloam, setGloam] = useState<GloamLevel>(() => levelFor(0));
  const [levelUp, setLevelUp] = useState<GloamLevel | null>(null);
  const [talking, setTalking] = useState(false);
  const talkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<{ reply: string; emotion: Emotion; understanding: Understanding; checkpoints?: string[] } | null>(null);
  const lastMessage = useRef<{ text: string; pasted: boolean } | null>(null);
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
      safeStorage(() => localStorage.setItem(sessionKey(session.lessonId), session.id), undefined);
      safeStorage(() => localStorage.setItem(STUDENT_KEY, session.studentId), undefined);
      setCheckpoints(session.checkpoints ?? []);
      if (session.gloam) setGloam(session.gloam);
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
      // Gloam waited at its checkpoint: it says hi (a hand-written line, not saved)
      if (!finished) {
        const line = pickLine(style.lines.welcomeBack, fill, []);
        setEmotion("sheepish");
        setEntries((xs) => [...xs, { id: nextId(), kind: "gloam", text: line, emotion: "sheepish", fresh: true }]);
      }
      return;
    }
    setPhase("intro");
  }, [resumable, finished, style, fill]);

  const finishIntro = useCallback(() => {
    setPhase("teach");
    setEmotion("proud");
    setEntries((xs) =>
      xs.some((x) => x.kind === "gloam") ? xs.map((x) => (x.kind === "gloam" ? { ...x, fresh: true } : x)) : [...xs, { id: nextId(), kind: "gloam", text: lesson.opener, emotion: "proud", fresh: true }],
    );
  }, [lesson.opener]);

  const showReply = useCallback(
    (reply: string, emo: Emotion, u: Understanding, cps?: string[]) => {
      setShown(u);
      setEmotion(emo);
      if (cps) setCheckpoints(cps);
      // Gloam's mouth moves while its line types out (TypedLine types ~1 character per 24ms)
      setTalking(true);
      if (talkTimer.current) clearTimeout(talkTimer.current);
      talkTimer.current = setTimeout(() => setTalking(false), Math.min(6000, reply.length * 24 + 200));
      setEntries((xs) => [...xs, { id: nextId(), kind: "gloam", text: reply, emotion: emo, fresh: true }, ...beatsFor(u)]);
    },
    [beatsFor],
  );

  // What happens when Gloam answers (a real turn, or a test-mode shortcut)
  const onReply = useCallback(
    (ev: ReplyEvent) => {
      // During a big moment, keep Gloam's "oh no." showing until its line lands at the peak
      setThinking(ev.clicked.length ? pickLine(style.lines.clicking, fill, []) : null);
      setFinished(ev.finished);
      if (ev.recap) setRecap(ev.recap);
      if (ev.gloam) setGloam(ev.gloam);
      if (ev.levelUp && ev.gloam) setLevelUp(ev.gloam);
      if (ev.clicked.length) {
        const concept = lesson.concepts.find((c) => c.id === ev.clicked[0]);
        const firstEver = lesson.concepts.every((c) => (shownRef.current[c.id] ?? 0) < 3);
        pending.current = { reply: ev.reply, emotion: ev.emotion, understanding: ev.understanding, checkpoints: ev.checkpoints };
        setFlash(ev.clicked[0]);
        setMoment({
          key: Date.now(),
          conceptName: concept?.name ?? "something new",
          size: firstEver || ev.finished ? "full" : "short",
          final: ev.finished,
        });
      } else {
        showReply(ev.reply, ev.emotion, ev.understanding, ev.checkpoints);
        if (sound) pip();
        setStatus("ready");
      }
    },
    [lesson.concepts, showReply, sound, style, fill],
  );

  const send = useCallback(
    async (text: string, pasted = false) => {
      if (!sessionId) return;
      lastMessage.current = { text, pasted };
      setStatus("thinking");
      setThinking(pickLine(style.lines.thinking, fill, []));

      let gotReply = false;
      try {
        const res = await fetch("/api/companion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // in test mode, pasted answers are allowed to teach Gloam (only works while developing)
          body: JSON.stringify({ sessionId, message: text, pasted: test ? false : pasted, test }),
        });
        if (res.status === 423) {
          setThinking(null);
          setStatus("paused");
          return;
        }
        if (res.status === 429) {
          // far too many messages, far too fast: Gloam asks for one at a time (nothing is lost)
          setThinking(null);
          setEntries((xs) => [...xs, { id: nextId(), kind: "gloam", text: style.copy.slowDown, emotion: "sheepish", fresh: true }]);
          setStatus("ready");
          return;
        }
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
            if (ev.type === "queued") {
              // a busy class: Gloam says where it is in line, in its own voice
              setThinking(style.copy.queued(ev.ahead));
            } else if (ev.type === "judged") {
              // Gloam reacts before it has the words: you can SEE it start to get it
              if (ev.clicked.length) setThinking(pickLine(style.lines.clicking, fill, []));
              else if (ev.improved.length) setThinking(pickLine(style.lines.almost, fill, []));
            } else if (ev.type === "reply") {
              gotReply = true;
              onReply(ev);
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
    [sessionId, style, fill, onReply, test],
  );

  /** TEST MODE: teach the next idea (or everything) instantly, through the real save path */
  const skipAhead = useCallback(
    async (all: boolean) => {
      if (!sessionId || status !== "ready" || moment) return;
      setStatus("thinking");
      const r = await fetch("/api/dev/teach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId, all }) }).catch(() => null);
      if (!r?.ok) return setStatus("ready");
      setEntries((xs) => [...xs, { id: nextId(), kind: "student", text: all ? "(test mode: taught everything)" : "(test mode: taught the next idea)" }]);
      onReply(await r.json());
    },
    [sessionId, status, moment, onReply],
  );

  const teach = useCallback(
    (text: string, pasted = false) => {
      const clean = text.trim();
      if (!clean || status !== "ready") return false;
      setEntries((xs) => [...xs, { id: nextId(), kind: "student", text: clean }]);
      void send(clean, pasted);
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
    if (last?.kind === "student" && lastMessage.current) void send(lastMessage.current.text, lastMessage.current.pasted);
    else setStatus("ready");
  }, [entries, send]);

  // The peak of a eureka moment: light the candle and let Gloam speak
  const onPeak = useCallback(() => {
    const p = pending.current;
    if (!p) return;
    setEurekaTick((t) => t + 1);
    setThinking(null);
    if (sound) chime(finished);
    showReply(p.reply, p.emotion, p.understanding, p.checkpoints);
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
    safeStorage(() => localStorage.removeItem(sessionKey(lesson.id)), undefined);
    const session = await loadSession(lesson.id, true);
    if (!session) return;
    setMoment(null);
    setRecap(null);
    applySession(session);
    setPhase("intro");
  }, [lesson.id, applySession]);

  const toggleSound = useCallback(() => {
    setAccess({ sound: !sound });
    if (!sound) pip();
  }, [sound]);

  // "still here", for the teacher's live view (only does anything for a student signed in to a class)
  useEffect(() => {
    const ping = () => void fetch("/api/me?ping").catch(() => undefined);
    ping();
    const t = setInterval(ping, 45_000);
    return () => clearInterval(t);
  }, []);

  // ---------- Gloam's mood right now ----------
  const mood: GloamMood = useMemo(() => {
    if ((status === "offline" || status === "paused") && phase !== "title") return "asleep";
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
    checkpoints,
    gloam,
    levelUp,
    clearLevelUp: () => setLevelUp(null),
    skipAhead,
    talking,
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
