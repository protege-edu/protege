"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Voice typing in the browser. Two ways, both private, tried in this order:
 *   "laptop": a short clip goes to Protégé on the teacher's laptop, where whisper.cpp turns it into words
 *             (app/api/voice). Recorded in the browser, converted to 16 kHz WAV, never saved anywhere.
 *   "device": the browser's own speech recognition, ONLY when it promises to run on this device
 *             (processLocally). Chrome's usual speech recognition sends audio to Google: never used.
 * Neither available? The mic button doesn't show.
 */
type Lang = "en" | "fr";
type Way = "device" | "laptop";

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

const ways = new Map<Lang, Promise<Way | null>>();
/** Which way voice typing works here (asked once per language) */
function findWay(lang: Lang): Promise<Way | null> {
  let p = ways.get(lang);
  if (!p) {
    p = (async () => {
      // the teacher's laptop first: the same voice typing for everyone in the class
      try {
        const res = await fetch("/api/voice", { cache: "no-store" });
        if ((await res.json()).ready) return "laptop" as const;
      } catch {
        // not there: maybe this device can do it alone
      }
      // (asking a browser that has no on-device speech can crash its tab: skipped in automated test browsers)
      if (!navigator.webdriver && (await onDeviceLocale(lang))) return "device" as const;
      return null;
    })();
    ways.set(lang, p);
    // the laptop might start voice later: ask again next time if it wasn't there
    void p.then((w) => w || setTimeout(() => ways.delete(lang), 15_000));
  }
  return p;
}

/** Can this student talk instead of typing? null while we find out */
export function useVoiceReady(lang: string): boolean | null {
  const l: Lang = lang === "fr" ? "fr" : "en";
  const [ready, setReady] = useState<boolean | null>(null);
  useEffect(() => {
    let live = true;
    void findWay(l).then((w) => live && setReady(!!w));
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
    const way = await findWay(l);
    if (!way) return cbs.current.onProblem("failed");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
    } catch {
      return cbs.current.onProblem("denied");
    }
    const meter = loudness(stream, setLevel);
    setState("listening");
    if (way === "device") {
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
        else if (e.error !== "no-speech" && e.error !== "aborted") ways.delete(l); // try the laptop next time
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
      return;
    }
    // the laptop: record, then send one short clip
    const recorder = new MediaRecorder(stream);
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const limit = setTimeout(() => stopRef.current(), 60_000);
    recorder.onstop = async () => {
      clearTimeout(limit);
      meter.stop();
      stream.getTracks().forEach((t) => t.stop());
      try {
        const wav = await toWav16k(new Blob(chunks, { type: recorder.mimeType }));
        const res = await fetch(`/api/voice?lang=${l}`, { method: "POST", headers: { "content-type": "audio/wav" }, body: wav });
        if (!res.ok) {
          setState("idle");
          setLevel(0);
          return cbs.current.onProblem("failed");
        }
        finish(((await res.json()) as { text?: string }).text ?? "");
      } catch {
        setState("idle");
        setLevel(0);
        cbs.current.onProblem("failed");
      }
    };
    stopRef.current = () => {
      setState("working");
      if (recorder.state !== "inactive") recorder.stop();
    };
    recorder.start();
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

/** Any recording the browser made → 16 kHz mono 16-bit WAV (what whisper.cpp reads) */
async function toWav16k(blob: Blob): Promise<Blob> {
  const ctx = new AudioContext();
  const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
  void ctx.close();
  const off = new OfflineAudioContext(1, Math.max(1, Math.ceil(decoded.duration * 16000)), 16000);
  const src = off.createBufferSource();
  src.buffer = decoded;
  src.connect(off.destination);
  src.start();
  const pcm = (await off.startRendering()).getChannelData(0);
  const out = new DataView(new ArrayBuffer(44 + pcm.length * 2));
  const tag = (o: number, s: string) => [...s].forEach((c, i) => out.setUint8(o + i, c.charCodeAt(0)));
  tag(0, "RIFF");
  out.setUint32(4, 36 + pcm.length * 2, true);
  tag(8, "WAVE");
  tag(12, "fmt ");
  out.setUint32(16, 16, true);
  out.setUint16(20, 1, true); // PCM
  out.setUint16(22, 1, true); // mono
  out.setUint32(24, 16000, true);
  out.setUint32(28, 32000, true);
  out.setUint16(32, 2, true);
  out.setUint16(34, 16, true);
  tag(36, "data");
  out.setUint32(40, pcm.length * 2, true);
  for (let i = 0; i < pcm.length; i++) out.setInt16(44 + i * 2, Math.max(-1, Math.min(1, pcm[i])) * 0x7fff, true);
  return new Blob([out.buffer], { type: "audio/wav" });
}
