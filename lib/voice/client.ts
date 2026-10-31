"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Voice typing in the browser: the browser's own speech recognition, ONLY when it promises to run on this
 * device (processLocally). A student's voice is never sent anywhere: not to Protégé, not to a cloud service.
 * (Chrome's usual speech recognition sends audio to Google: never used.)
 * This device can't do it? The mic button doesn't show.
 */
type Lang = "en" | "fr";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Recognition = any;
const LOCALES: Record<Lang, string[]> = { en: ["en-CA", "en-US"], fr: ["fr-CA", "fr-FR"] };

function recognitionClass(): Recognition | null {
  const w = window as unknown as { SpeechRecognition?: Recognition; webkitSpeechRecognition?: Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** The locale this browser can recognise ON THE DEVICE (installed, or installable), or null */
async function onDeviceLocale(lang: Lang): Promise<{ locale: string; install: boolean } | null> {
  const SR = recognitionClass();
  if (!SR || typeof SR.available !== "function" || !("processLocally" in SR.prototype)) return null;
  for (const locale of LOCALES[lang]) {
    try {
      const status = await SR.available({ langs: [locale], processLocally: true });
      if (status === "available") return { locale, install: false };
      if (status === "downloadable" || status === "downloading") return { locale, install: true };
    } catch {
      // try the next one
    }
  }
  return null;
}

const ways = new Map<Lang, Promise<boolean>>();
/** Can this device recognise speech on its own (asked once per language)? */
function canListen(lang: Lang): Promise<boolean> {
  let p = ways.get(lang);
  if (!p) {
    // (asking a browser that has no on-device speech can crash its tab: skipped in automated test browsers)
    p = navigator.webdriver ? Promise.resolve(false) : onDeviceLocale(lang).then((found) => !!found);
    ways.set(lang, p);
  }
  return p;
}

/** Can this student talk instead of typing? null while we find out */
export function useVoiceReady(lang: string): boolean | null {
  const l: Lang = lang === "fr" ? "fr" : "en";
  const [ready, setReady] = useState<boolean | null>(null);
  useEffect(() => {
    let live = true;
    void canListen(l).then((ok) => live && setReady(ok));
    return () => {
      live = false;
    };
  }, [l]);
  return ready;
}

export type MicState = "idle" | "listening" | "working";
export type MicProblem = "denied" | "failed" | "empty";

/**
 * Talk, then get the words. `start()` opens the mic, `stop()` finishes; `onText` gets what was said,
 * `onProblem` a reason if nothing came of it. `level` (0..1) is how loud the student is right now.
 */
export function useVoiceTyping({ lang, onText, onProblem }: { lang: string; onText: (text: string) => void; onProblem: (p: MicProblem) => void }) {
  const l: Lang = lang === "fr" ? "fr" : "en";
  const [state, setState] = useState<MicState>("idle");
  const [level, setLevel] = useState(0);
  const stopRef = useRef<() => void>(() => {});
  const cbs = useRef({ onText, onProblem });
  useEffect(() => {
    cbs.current = { onText, onProblem };
  }, [onText, onProblem]);

  const finish = useCallback((text: string) => {
    setState("idle");
    setLevel(0);
    if (text.trim()) cbs.current.onText(text.trim());
    else cbs.current.onProblem("empty");
  }, []);

  const start = useCallback(async () => {
    if (state !== "idle") return;
    if (!(await canListen(l))) return cbs.current.onProblem("failed");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
    } catch {
      return cbs.current.onProblem("denied");
    }
    const meter = loudness(stream, setLevel);
    setState("listening");
    const found = await onDeviceLocale(l);
    const SR = recognitionClass();
    if (!found || !SR) {
      meter.stop();
      stream.getTracks().forEach((t) => t.stop());
      setState("idle");
      return cbs.current.onProblem("failed");
    }
    if (found.install) {
      try {
        await SR.install({ langs: [found.locale], processLocally: true });
      } catch {
        // couldn't add the language: fall through, start() will refuse and we report it
      }
    }
    const rec = new SR();
    rec.processLocally = true; // on this device, or not at all
    rec.lang = found.locale;
    rec.continuous = true;
    rec.interimResults = false;
    let said = "";
    rec.onresult = (e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => {
      said = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join(" ");
    };
    rec.onerror = (e: { error: string }) => {
      if (e.error === "not-allowed") cbs.current.onProblem("denied");
      else if (e.error !== "no-speech" && e.error !== "aborted") ways.delete(l); // ask again next time
    };
    rec.onend = () => {
      meter.stop();
      stream.getTracks().forEach((t) => t.stop());
      finish(said);
    };
    stopRef.current = () => {
      setState("working");
      rec.stop();
    };
    rec.start();
  }, [state, l, finish]);

  // leaving the screen mid-sentence: stop listening
  useEffect(() => () => stopRef.current(), []);

  return { state, level, start, stop: () => stopRef.current() };
}

/** How loud the mic is, about 15 times a second (the mic button grows with your voice) */
function loudness(stream: MediaStream, onLevel: (n: number) => void) {
  const ctx = new AudioContext();
  const src = ctx.createMediaStreamSource(stream);
  const an = ctx.createAnalyser();
  an.fftSize = 512;
  src.connect(an);
  const buf = new Uint8Array(an.fftSize);
  const t = setInterval(() => {
    an.getByteTimeDomainData(buf);
    let sum = 0;
    for (const v of buf) sum += ((v - 128) / 128) ** 2;
    onLevel(Math.min(1, Math.sqrt(sum / buf.length) * 4));
  }, 66);
  return {
    stop: () => {
      clearInterval(t);
      void ctx.close();
    },
  };
}
