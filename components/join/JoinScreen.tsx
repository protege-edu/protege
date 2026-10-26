"use client";

import { ReadAloudButton } from "@/components/access/ReadAloud";
import { WaysToPlayButton } from "@/components/access/WaysToPlay";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { TravelQuip } from "@/components/game/JourneyMoments";
import { Stage, type GloamBox } from "@/components/game/Stage";
import type { GloamMood } from "@/components/gloam/poses";
import { InkButton } from "@/components/ui/InkButton";
import { Cut, useSize } from "@/components/ui/Cut";
import { Wordmark } from "@/components/ui/Logo";
import { getAgeStyle, type AgeStyle, type AgeStyleId, type Language } from "@/lib/age-styles";
import type { JoinError } from "@/lib/age-styles/types";
import type { Picture } from "@/lib/student/pictures";
import { useCalmMotion } from "@/lib/useCalmMotion";
import { KeyPad, KeyShow } from "./KeyPad";

export interface ClassPreview {
  classId: string;
  name: string;
  ageStyle: AgeStyleId;
  /** the class's language: every word on this screen, and Gloam */
  language: Language;
  keySize: number;
  google: boolean;
  nicknames: { id: string; nickname: string; google: boolean; needsNewKey: boolean }[];
}

type Step =
  | { k: "code" }
  | { k: "who" }
  | { k: "nick" }
  | { k: "key" }
  | { k: "remember" }
  | { k: "enter"; id: string; nickname: string; reset: boolean }
  | { k: "welcome"; nickname: string; back: boolean };

async function post<T>(body: unknown): Promise<{ ok: true; data: T } | { ok: false; error: string; code?: JoinError }> {
  try {
    const res = await fetch("/api/join", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    return res.ok ? { ok: true, data } : { ok: false, error: data.error ?? "Something went wrong. Try again.", code: data.code };
  } catch {
    return { ok: false, error: "Can't reach Protégé. Check the internet, then try again." };
  }
}

/** "glow42" → "GLOW-42", as they type */
const formatCode = (raw: string) => {
  const s = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  const m = s.match(/^([A-Z]*)(\d*)$/);
  return m && m[1] && m[2] ? `${m[1]}-${m[2]}` : s;
};

/**
 * Joining a class (and coming back), as a scene in Gloam's world, never a plain form:
 *   class code → who are you (tap your nickname) → your secret pictures → Gloam says hi → your Gloam (/me)
 *   new here:   class code → nickname ("surprise me") → pick secret pictures → remember them → Gloam says hi
 * Gloam watches, leans in while you type, and has something to say at every step.
 */
export function JoinScreen({ initialCode, googleFor, guess = "en" }: { initialCode?: string; googleFor?: ClassPreview; guess?: Language }) {
  const calm = useCalmMotion();
  const router = useRouter();
  const [preview, setPreview] = useState<ClassPreview | null>(googleFor ?? null);
  // before the class is found, the browser's language is the best guess
  const style = getAgeStyle(preview?.ageStyle ?? "senior", preview?.language ?? guess);
  const t = style.copy.join;
  const big = style.input.targetScale > 1.1;
  const [step, setStep] = useState<Step>(googleFor ? { k: "nick" } : { k: "code" });
  const [code, setCode] = useState(formatCode(initialCode ?? ""));
  const [nickname, setNickname] = useState("");
  const [ideas, setIdeas] = useState<string[]>([]);
  const [key, setKey] = useState<Picture[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(0);
  const [typingTick, setTypingTick] = useState(0);
  const [gloamBox, setGloamBox] = useState<GloamBox | null>(null);
  const [wide, setWide] = useState(true);
  const [hurt, setHurt] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setWide(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // the server's problem, in this screen's language when the profile has words for it
  const oops = (message: string, code?: JoinError) => {
    setError((code && t.errors?.[code]) || message);
    setHurt(true);
    setTimeout(() => setHurt(false), 2600);
  };

  const findClass = useCallback(async (raw: string) => {
    setBusy(true);
    setError(null);
    const r = await post<ClassPreview>({ action: "code", code: raw });
    setBusy(false);
    if (!r.ok) return oops(r.error, r.code);
    setHurt(false);
    setPreview(r.data);
    setStep(r.data.nicknames.length ? { k: "who" } : { k: "nick" });
  }, []);

  // came from the QR code (the code is in the address): go straight in
  const tried = useRef(false);
  useEffect(() => {
    if (tried.current || !initialCode || googleFor) return;
    tried.current = true;
    void Promise.resolve().then(() => findClass(initialCode));
  }, [initialCode, googleFor, findClass]);

  const signedIn = (nick: string, back: boolean) => {
    setStep({ k: "welcome", nickname: nick, back });
    setTimeout(() => router.replace("/me"), calm ? 1200 : 3000);
  };

  const surprise = async () => {
    if (!preview) return;
    const r = await post<{ nicknames: string[] }>({ action: "suggest", classId: preview.classId });
    if (r.ok) {
      setIdeas(r.data.nicknames);
      setNickname(r.data.nicknames[0] ?? "");
    }
  };

  const submitNick = async (e: FormEvent) => {
    e.preventDefault();
    if (!preview) return;
    setError(null);
    if (googleFor) {
      // Google students don't pick pictures
      setBusy(true);
      const r = await post<{ student: { nickname: string } }>({ action: "new", classId: preview.classId, nickname, key: null, google: true });
      setBusy(false);
      if (!r.ok) return oops(r.error, r.code);
      return signedIn(r.data.student.nickname, false);
    }
    // check the nickname now, so nobody picks pictures for a name they can't have
    const taken = preview.nicknames.some((n) => n.nickname.toLowerCase() === nickname.trim().toLowerCase());
    if (nickname.trim().length < 2) return oops(big ? "Pick a name with at least 2 letters." : "Pick a nickname with at least 2 letters.", "nick_short");
    if (taken) return oops("Someone in your class already has that one. Try another.", "nick_taken");
    setKey([]);
    setStep({ k: "key" });
  };

  const pickNew = (p: Picture) => {
    if (!preview) return;
    const next = [...key, p];
    setKey(next);
    if (next.length === preview.keySize) setTimeout(() => setStep({ k: "remember" }), calm ? 0 : 450);
  };

  const makeStudent = async () => {
    if (!preview) return;
    setBusy(true);
    setError(null);
    const r = await post<{ student: { nickname: string } }>({ action: "new", classId: preview.classId, nickname, key });
    setBusy(false);
    if (!r.ok) {
      // most likely the nickname (someone took it a moment ago, or it isn't allowed): go back to it
      setStep({ k: "nick" });
      return oops(r.error, r.code);
    }
    signedIn(r.data.student.nickname, false);
  };

  const pickBack = async (p: Picture) => {
    if (!preview || step.k !== "enter") return;
    const next = [...key, p];
    setKey(next);
    if (next.length < preview.keySize) return;
    setBusy(true);
    setError(null);
    const r = await post<{ student: { nickname: string } }>({ action: "back", classId: preview.classId, studentId: step.id, key: next });
    setBusy(false);
    if (!r.ok) {
      setShake((s) => s + 1);
      setTimeout(() => setKey([]), calm ? 0 : 450);
      return oops(r.error, r.code);
    }
    signedIn(r.data.student.nickname, !step.reset);
  };

  // what Gloam says and feels at each step
  const g = t.gloam;
  const line = hurt
    ? g.wrong
    : step.k === "code"
      ? code.length > 0 ? g.typing : g.code
      : step.k === "who"
        ? g.found(preview?.name ?? "")
        : step.k === "nick"
          ? g.nick
          : step.k === "key" || step.k === "enter"
            ? g.key
            : step.k === "remember"
              ? g.remember
              : step.back
                ? g.welcomeBack(step.nickname)
                : g.welcome(step.nickname);
  const mood: GloamMood = hurt ? "confused" : step.k === "welcome" ? "excited" : step.k === "who" ? "proud" : step.k === "key" || step.k === "enter" ? "sheepish" : step.k === "code" && code ? "curious" : "curious";

  const back = () => {
    setError(null);
    setKey([]);
    if (step.k === "who" || (step.k === "nick" && !preview?.nicknames.length && !googleFor)) return setStep({ k: "code" });
    if (step.k === "nick") return setStep(preview?.nicknames.length ? { k: "who" } : { k: "code" });
    if (step.k === "key") return setStep({ k: "nick" });
    if (step.k === "remember") return setStep({ k: "key" });
    if (step.k === "enter") return setStep({ k: "who" });
  };

  return (
    <div data-age-style={style.id} lang={style.language ?? "en"} className="relative h-dvh overflow-hidden bg-bg text-ink">
      <div className="absolute inset-0">
        <Stage
          style={style}
          mood={mood}
          brightness={0}
          concepts={[]}
          understanding={{}}
          flash={null}
          typingTick={typingTick}
          eurekaTick={0}
          focus={wide ? 0.72 : 0.5}
          groundAt={wide ? 0.8 : 0.4}
          gloamScale={wide ? 0.85 : 0.55}
          showCandles={false}
          onGloamBox={setGloamBox}
          journey={{ talking: true, waiting: false, level: 1, levels: [], stop: 0 }}
        >
          <TravelQuip text={line} gloam={gloamBox} />
        </Stage>
      </div>

      {/* darken where the words are, keep Gloam clear */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgb(var(--t-scrim)/calc(0.9_+_var(--scrim-boost)))_0%,rgb(var(--t-scrim)/calc(0.7_+_var(--scrim-boost)))_40%,transparent_68%)] max-md:bg-[linear-gradient(0deg,rgb(var(--t-scrim)/calc(0.95_+_var(--scrim-boost)))_0%,rgb(var(--t-scrim)/calc(0.8_+_var(--scrim-boost)))_55%,transparent_75%)]" />

      <main className="relative flex h-full flex-col justify-end overflow-y-auto px-6 pb-8 md:w-[min(560px,48vw)] md:justify-center md:px-[6vw] md:pb-0">
        <p className="text-2xl text-ink">
          <Wordmark tone={style.look.tone} mark={false} />
        </p>

        <AnimatePresence mode="wait">
          <motion.section
            key={step.k}
            initial={calm ? false : { opacity: 0, x: -14 }}
            animate={{ opacity: 1, x: 0 }}
            exit={calm ? undefined : { opacity: 0, x: 10, transition: { duration: 0.15 } }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6"
            aria-live="polite"
          >
            {step.k === "code" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void findClass(code);
                }}
              >
                <Title style={style} read={`${t.codeTitle} ${t.codeHint}`}>
                  {t.codeTitle}
                </Title>
                <label htmlFor="code" className="mt-5 block text-sm font-bold text-ink-dim">
                  {t.codeLabel}
                </label>
                <CodeInput
                  value={code}
                  onChange={(v) => {
                    setCode(formatCode(v));
                    setTypingTick((n) => n + 1);
                    setError(null);
                  }}
                />
                <p id="code-hint" className="mt-2 text-sm text-ink-dim">
                  {t.codeHint}
                </p>
                <Problem text={error} />
                <InkButton type="submit" size="lg" className="mt-6" disabled={busy || code.length < 4}>
                  {t.codeButton}
                </InkButton>
              </form>
            )}

            {step.k === "who" && preview && (
              <div>
                <Title style={style} read={`${t.whoTitle} ${t.whoHint(preview.name)}`}>
                  {t.whoTitle}
                </Title>
                <p className="mt-2 text-sm text-ink-dim">{t.whoHint(preview.name)}</p>
                <ul className="mt-5 flex max-h-[38vh] flex-wrap gap-2 overflow-y-auto p-1">
                  {preview.nicknames.map((n) => (
                    <li key={n.id}>
                      {n.google ? (
                        <a href={`/api/auth/google/start?who=student&class=${preview.classId}`} className="nick-chip">
                          <NickChip label={n.nickname} />
                        </a>
                      ) : (
                        <button
                          type="button"
                          className="nick-chip"
                          onClick={() => {
                            setKey([]);
                            setError(null);
                            setStep({ k: "enter", id: n.id, nickname: n.nickname, reset: n.needsNewKey });
                          }}
                        >
                          <NickChip label={n.nickname} />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <InkButton
                    size="lg"
                    onClick={() => {
                      setNickname("");
                      setIdeas([]);
                      setStep({ k: "nick" });
                    }}
                  >
                    {t.whoNew}
                  </InkButton>
                  {preview.google && <GoogleButton classId={preview.classId} label={t.google} />}
                  <BackLink onClick={back} label={t.back} />
                </div>
              </div>
            )}

            {step.k === "nick" && preview && (
              <form onSubmit={submitNick}>
                <Title style={style} read={`${t.nickTitle} ${googleFor ? t.googleNick : t.nickHint}`}>
                  {t.nickTitle}
                </Title>
                <p className="mt-2 text-sm text-ink-dim">{googleFor ? t.googleNick : t.nickHint}</p>
                <label htmlFor="nick" className="mt-5 block text-sm font-bold text-ink-dim">
                  {t.nickLabel}
                </label>
                <div className="mt-1.5 flex flex-wrap items-center gap-3">
                  <TextBox id="nick" value={nickname} onChange={(v) => (setNickname(v), setTypingTick((n) => n + 1), setError(null))} />
                  <InkButton variant="quiet" onClick={() => void surprise()}>
                    {t.nickSurprise}
                  </InkButton>
                </div>
                {ideas.length > 1 && (
                  <ul className="mt-3 flex flex-wrap gap-2" aria-label={t.nickSurprise}>
                    {ideas.map((n) => (
                      <li key={n}>
                        <button type="button" className="nick-chip" aria-pressed={nickname === n} onClick={() => setNickname(n)}>
                          <NickChip label={n} on={nickname === n} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <Problem text={error} />
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <InkButton type="submit" size="lg" disabled={busy || !nickname.trim()}>
                    {t.nickButton}
                  </InkButton>
                  {!googleFor && preview.google && <GoogleButton classId={preview.classId} label={t.google} />}
                  {!googleFor && <BackLink onClick={back} label={t.back} />}
                </div>
              </form>
            )}

            {(step.k === "key" || step.k === "enter") && preview && (
              <div>
                <Title
                  style={style}
                  read={step.k === "key" ? `${t.keyTitle(preview.keySize)} ${t.keyHint}` : `${t.keyEnterTitle(step.nickname)} ${step.reset ? t.keyResetHint : t.keyEnterHint}`}
                >
                  {step.k === "key" ? t.keyTitle(preview.keySize) : t.keyEnterTitle(step.nickname)}
                </Title>
                <p className="mt-2 text-sm text-ink-dim">{step.k === "key" ? t.keyHint : step.reset ? t.keyResetHint : t.keyEnterHint}</p>
                <div className="mt-5">
                  <KeyPad
                    size={preview.keySize}
                    picked={key}
                    onPick={(p) => (step.k === "key" ? pickNew(p) : void pickBack(p))}
                    reveal={step.k === "key" || step.reset}
                    big={big}
                    disabled={busy}
                    shake={shake}
                    countLabel={t.keyCount(key.length, preview.keySize)}
                    t={t}
                  />
                </div>
                <Problem text={error} />
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  {key.length > 0 && (
                    <InkButton variant="quiet" onClick={() => setKey([])}>
                      {t.keyClear}
                    </InkButton>
                  )}
                  <BackLink onClick={back} label={t.back} />
                </div>
              </div>
            )}

            {step.k === "remember" && preview && (
              <div>
                <Title style={style} read={`${t.keyRememberTitle} ${t.keyRememberHint}`}>
                  {t.keyRememberTitle}
                </Title>
                <p className="mt-2 text-sm text-ink-dim">{t.keyRememberHint}</p>
                <div className="mt-6 mb-10">
                  <KeyShow picture={key} big={big} t={t} />
                </div>
                <Problem text={error} />
                <div className="flex flex-wrap items-center gap-3">
                  <InkButton size="lg" disabled={busy} onClick={() => void makeStudent()}>
                    {t.keyRememberButton}
                  </InkButton>
                  <InkButton
                    variant="quiet"
                    onClick={() => {
                      setKey([]);
                      setStep({ k: "key" });
                    }}
                  >
                    {t.keyRedo}
                  </InkButton>
                </div>
              </div>
            )}

            {step.k === "welcome" && (
              <div>
                <Title>{step.nickname}</Title>
              </div>
            )}
          </motion.section>
        </AnimatePresence>
      </main>

      <WaysToPlayButton style={style} className="!absolute top-3 right-4 z-10" />

      {step.k === "code" && (
        <Link href="/" className="absolute right-4 bottom-4 min-h-11 content-center rounded-md px-3 text-xs font-bold text-ink-dim underline-offset-4 hover:text-ink hover:underline">
          {style.copy.titlePractice}
        </Link>
      )}
    </div>
  );
}

/** A step's heading. With read-aloud on (Ways to play), a "read it to me" for the heading and its hint: little kids can't read yet. */
function Title({ children, style, read }: { children: ReactNode; style?: AgeStyle; read?: string }) {
  return (
    <>
      <h1 className="text-xl font-bold text-ink md:text-2xl">{children}</h1>
      {style && read && <ReadAloudButton style={style} text={read} className="-ml-2" />}
    </>
  );
}

function Problem({ text }: { text: string | null }) {
  return text ? (
    <p role="alert" className="mt-3 max-w-[44ch] text-sm font-bold text-[var(--t-warn)]">
      {text}
    </p>
  ) : null;
}

function BackLink({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <InkButton variant="ghost" onClick={onClick}>
      {label}
    </InkButton>
  );
}

/** The class code, big, in its own hand-cut slot */
function CodeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [box, { w, h }] = useSize<HTMLDivElement>();
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus({ preventScroll: true }), []);
  return (
    <div ref={box} className="relative mt-1.5 w-[min(320px,100%)]">
      <Cut w={w} h={h} seed="code" radius={14} wobble={1.4} fill="var(--t-panel-2, var(--t-panel))" stroke="var(--t-line)" depth={4} depthFill="rgb(0 0 0 / 0.35)" />
      <input
        ref={ref}
        id="code"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        inputMode="text"
        placeholder="GLOW-42"
        aria-describedby="code-hint"
        className="code-input relative z-[1] h-16 w-full bg-transparent px-5 text-[2rem] font-bold tracking-[0.12em] text-ink placeholder:text-ink-dim/40 focus:outline-none"
      />
    </div>
  );
}

function TextBox({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  const [box, { w, h }] = useSize<HTMLDivElement>();
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus({ preventScroll: true }), []);
  return (
    <div ref={box} className="relative w-[min(300px,100%)]">
      <Cut w={w} h={h} seed={id} radius={12} wobble={1.3} fill="var(--t-panel-2, var(--t-panel))" stroke="var(--t-line)" />
      <input
        ref={ref}
        id={id}
        value={value}
        maxLength={24}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        spellCheck={false}
        className="relative z-[1] h-13 w-full bg-transparent px-4 text-lg text-ink focus:outline-none"
      />
    </div>
  );
}

/** A nickname to tap: a small cut-paper tag */
function NickChip({ label, on = false }: { label: string; on?: boolean }) {
  const [box, { w, h }] = useSize<HTMLSpanElement>();
  return (
    <span ref={box} className="relative inline-flex min-h-12 items-center px-4 text-md font-bold text-ink">
      <Cut w={w} h={h} seed={`nick-${label}`} radius={10} wobble={1.2} fill={on ? "var(--t-accent)" : "var(--t-panel)"} stroke="var(--t-line)" depth={3} depthFill="rgb(0 0 0 / 0.35)" />
      <span className={`relative z-[1] ${on ? "text-accent-ink" : ""}`}>{label}</span>
    </span>
  );
}

function GoogleButton({ classId, label }: { classId: string; label: string }) {
  return (
    <a
      href={`/api/auth/google/start?who=student&class=${classId}`}
      className="flex min-h-12 items-center gap-3 rounded-md border border-line bg-panel px-4 text-sm font-bold text-ink hover:bg-chip"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8Z" />
        <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z" />
        <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z" />
        <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9Z" />
      </svg>
      {label}
    </a>
  );
}
