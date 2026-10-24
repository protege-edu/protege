"use client";

import { useEffect, useRef } from "react";

const MAX = 500;

/**
 * Where the student teaches. Enter sends, Shift+Enter makes a new line.
 * You can keep typing while Gloam thinks; you just can't send twice.
 */
export function TeachInput({
  value,
  onChange,
  onSend,
  canSend,
  disabled,
  hint,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  canSend: boolean;
  disabled: boolean;
  /** Replaces the keyboard tip, e.g. a nudge for a student who hasn't started yet */
  hint?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  // Grow with the text, up to about 5 lines
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [value]);

  const ready = canSend && value.trim().length > 0;

  return (
    <form
      className="border-t-2 border-moss/15 bg-mist px-5 pt-3 pb-4 sm:px-8"
      onSubmit={(e) => {
        e.preventDefault();
        if (ready) onSend();
      }}
    >
      <label htmlFor="teach" className="sr-only">
        Explain it to Gloam
      </label>
      <div className="flex items-end gap-3 rounded-lg border-2 border-moss bg-mist p-2 focus-within:border-rosehip-deep">
        <textarea
          id="teach"
          ref={ref}
          rows={1}
          value={value}
          maxLength={MAX}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              if (ready) onSend();
            }
          }}
          placeholder="Explain it to Gloam in your own words…"
          className="min-h-11 flex-1 resize-none bg-transparent px-2 py-2.5 text-sm text-moss placeholder:text-moss/75 focus:outline-none disabled:opacity-60"
          style={{ outline: "none" }}
        />
        <button
          type="submit"
          disabled={!ready}
          className="h-11 shrink-0 cursor-pointer rounded-md bg-rosehip-deep px-5 text-sm font-bold text-mist transition-[transform,background-color] duration-150 hover:bg-rosehip-ink active:scale-95 disabled:cursor-not-allowed disabled:bg-moss/15 disabled:text-moss/85"
        >
          Teach Gloam
        </button>
      </div>
      <p className="mt-1.5 flex justify-between text-xs text-moss/80">
        <span>{hint ?? "Press Enter to send. Shift+Enter adds a new line."}</span>
        {value.length > MAX - 80 && <span>{MAX - value.length} characters left</span>}
      </p>
    </form>
  );
}
