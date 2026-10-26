"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Cut, useSize } from "@/components/ui/Cut";
import { InkButton } from "@/components/ui/InkButton";
import { Modal } from "@/components/ui/Modal";
import { setAccess, useAccess } from "@/lib/access/store";
import type { Access } from "@/lib/access/settings";
import type { AgeStyle } from "@/lib/age-styles";
import { readAloud } from "@/lib/speech";
import { useCanReadAloud } from "./ReadAloud";
import { useDeviceCalm } from "@/lib/useCalmMotion";
import { useVoiceReady } from "@/lib/voice/client";

/**
 * "Ways to play": the student sets Protégé up the way that works for them. Every change shows at once
 * (the page behind it updates), is kept on this device, and on their account when they're in a class.
 */
export function WaysToPlay({ style, onClose }: { style: AgeStyle; onClose: () => void }) {
  const t = style.copy.access;
  const a = useAccess(style);
  const lang = style.language ?? "en";
  const deviceCalm = useDeviceCalm();
  const voice = useVoiceReady(lang);
  const canRead = useCanReadAloud(lang);
  const set = (patch: Partial<Access>) => setAccess(patch);

  return (
    <Modal onClose={onClose} label={t.title} side>
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-6 pb-4">
          <h2 className="voice text-lg text-ink" style={{ ["--casual" as string]: 1, ["--voice-weight" as string]: 750 }}>
            {t.title}
          </h2>
          <p className="mt-1 text-sm text-ink-dim">{t.intro}</p>

          <div className="mt-5 flex flex-col gap-1">
            <Toggle
              label={t.voice}
              hint={voice === false ? t.voiceMissing : `${t.voiceHint} ${t.voicePrivate}`}
              on={a.voice && voice !== false}
              disabled={voice === false}
              onChange={(v) => set({ voice: v })}
            />
            <Choices
              label={t.readAloud}
              hint={canRead ? undefined : t.readAloudMissing}
              choices={t.readAloudChoices}
              value={canRead ? ["off", "button", "auto"].indexOf(a.readAloud) : 0}
              disabled={!canRead}
              onChange={(i) => {
                const readAloudNow = (["off", "button", "auto"] as const)[i];
                set({ readAloud: readAloudNow });
                // a taste of it: the choice itself is read aloud
                if (i > 0) readAloud(t.readAloudChoices[i], lang);
              }}
            />
            <Choices label={t.text} choices={t.textChoices} value={a.text} onChange={(i) => set({ text: i as Access["text"] })} />
            <Toggle label={t.contrast} hint={t.contrastHint} on={a.contrast} onChange={(v) => set({ contrast: v })} />
            <Choices
              label={t.reading}
              choices={t.readingChoices}
              value={["normal", "spaced", "dyslexic"].indexOf(a.reading)}
              onChange={(i) => set({ reading: (["normal", "spaced", "dyslexic"] as const)[i] })}
            />
            <Toggle label={t.calm} hint={deviceCalm ? t.calmDevice : t.calmHint} on={a.calm || deviceCalm} disabled={deviceCalm} onChange={(v) => set({ calm: v })} />
            <Toggle label={t.sound} on={a.sound} onChange={(v) => set({ sound: v })} />
          </div>
        </div>
        <div className="border-t border-line px-6 py-4">
          <InkButton onClick={onClose} className="w-full">
            {t.done}
          </InkButton>
        </div>
      </div>
    </Modal>
  );
}

/** The button that opens the panel: plain words, in every place a student might need it */
export function WaysToPlayButton({ style, className = "" }: { style: AgeStyle; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <InkButton variant="ghost" onClick={() => setOpen(true)} className={className} aria-haspopup="dialog">
        {style.copy.access.open}
      </InkButton>
      {open && <WaysToPlay style={style} onClose={() => setOpen(false)} />}
    </>
  );
}

/** On or off. The whole row is the button: a big target, and the words say what it does. */
function Toggle({ label, hint, on, disabled = false, onChange }: { label: string; hint?: string; on: boolean; disabled?: boolean; onChange: (on: boolean) => void }) {
  const hintId = useId();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-describedby={hint ? hintId : undefined}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className="flex min-h-13 w-full cursor-pointer items-center justify-between gap-4 rounded-md px-2 py-2.5 text-left hover:bg-chip disabled:cursor-default disabled:hover:bg-transparent"
    >
      <span className="min-w-0">
        <span className="block text-sm font-bold text-ink">{label}</span>
        {hint && (
          <span id={hintId} className="mt-0.5 block text-xs text-ink-dim">
            {hint}
          </span>
        )}
      </span>
      <Track on={on} dim={disabled} />
    </button>
  );
}

/** The switch's painted track: a strip of cut paper, the knob slides across and fills with Gloam's colour */
function Track({ on, dim }: { on: boolean; dim: boolean }) {
  return (
    <span aria-hidden="true" className={`relative block shrink-0 ${dim ? "opacity-60" : ""}`} style={{ width: 56, height: 32 }}>
      <Cut w={56} h={32} seed={on ? "track-on" : "track-off"} radius={16} fill={on ? "var(--t-accent)" : "var(--t-chip)"} stroke="var(--t-line)" />
      <span
        className="absolute rounded-full border-2 transition-[left] duration-200"
        style={{ top: 4, width: 24, height: 24, left: on ? 28 : 4, background: on ? "var(--t-accent-ink)" : "var(--t-panel)", borderColor: on ? "var(--t-accent-ink)" : "var(--t-ink-dim)" }}
      />
    </span>
  );
}

/** One of three. A radio group: arrow keys move between the choices, Tab leaves the group. */
function Choices({
  label,
  hint,
  choices,
  value,
  disabled = false,
  onChange,
}: {
  label: string;
  hint?: string;
  choices: readonly [string, string, string];
  value: number;
  disabled?: boolean;
  onChange: (i: number) => void;
}) {
  const labelId = useId();
  const hintId = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: KeyboardEvent) => {
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!step || disabled) return;
    e.preventDefault();
    const next = (value + step + choices.length) % choices.length;
    onChange(next);
    refs.current[next]?.focus();
  };
  return (
    <div className="px-2 py-2.5">
      <span id={labelId} className="block text-sm font-bold text-ink">
        {label}
      </span>
      {hint && (
        <span id={hintId} className="mt-0.5 block text-xs text-ink-dim">
          {hint}
        </span>
      )}
      <div role="radiogroup" aria-labelledby={labelId} aria-describedby={hint ? hintId : undefined} onKeyDown={onKey} className="mt-2 grid grid-cols-[repeat(auto-fit,minmax(min(7.5rem,100%),1fr))] gap-1.5">
        {choices.map((c, i) => (
          <Choice key={c} ref={(el) => void (refs.current[i] = el)} chosen={i === value} disabled={disabled && i > 0} onPick={() => onChange(i)}>
            {c}
          </Choice>
        ))}
      </div>
    </div>
  );
}

function Choice({ chosen, disabled, onPick, children, ref }: { chosen: boolean; disabled: boolean; onPick: () => void; children: ReactNode; ref: (el: HTMLButtonElement | null) => void }) {
  const [box, { w, h }] = useSize<HTMLSpanElement>();
  return (
    <button
      ref={ref}
      type="button"
      role="radio"
      aria-checked={chosen}
      tabIndex={chosen ? 0 : -1}
      disabled={disabled}
      onClick={onPick}
      className="group relative min-h-11 cursor-pointer disabled:cursor-default disabled:opacity-50"
    >
      <span ref={box} className="absolute inset-0">
        <Cut w={w} h={h} seed={String(children)} radius={10} fill={chosen ? "var(--t-accent)" : "var(--t-chip)"} stroke={chosen ? undefined : "var(--t-line)"} />
      </span>
      <span className={`relative block px-2 py-2 text-xs leading-tight font-bold ${chosen ? "text-accent-ink" : "text-ink group-hover:underline"}`}>{children}</span>
    </button>
  );
}
