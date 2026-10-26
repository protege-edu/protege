"use client";

import { useState } from "react";
import { Button, api } from "./kit";

/**
 * Privacy and the class's data, at the bottom of the class page: exactly what Protégé keeps,
 * a spreadsheet of progress (nicknames only), and deleting the whole class.
 */
export function ClassData({ classId, className, lessonId }: { classId: string; className: string; lessonId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const matches = typed.trim().toLowerCase() === className.trim().toLowerCase();

  const remove = async () => {
    const res = await api(`/api/teacher/classes/${classId}`, { method: "DELETE" });
    if (!res.ok) return setError(res.error);
    window.location.replace("/teacher");
  };

  return (
    <section aria-labelledby="data-title" className="mt-14 border-t border-line pt-6">
      <h2 id="data-title" className="text-lg font-bold text-ink">
        Privacy and your data
      </h2>
      <p className="mt-2 max-w-[68ch] text-sm text-ink-dim">
        For each student, Protégé keeps their nickname, their secret pictures (scrambled, like a password), what they said to Gloam and what Gloam said back, and which ideas they taught it. No real names,
        emails or photos. It all stays on the laptop running Protégé.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {lessonId && (
          <a
            href={`/api/teacher/classes/${classId}/export?lesson=${encodeURIComponent(lessonId)}`}
            className="min-h-11 content-center rounded-md border border-line px-4 text-sm font-bold text-ink hover:bg-chip"
          >
            Download progress (spreadsheet)
          </a>
        )}
        {!confirming && (
          <Button variant="danger" onClick={() => setConfirming(true)}>
            Delete this class
          </Button>
        )}
      </div>
      {confirming && (
        <div className="mt-4 max-w-[60ch] rounded-md border border-[#e3b9b9] bg-[#fbf1f1] p-4">
          <p className="text-sm text-ink">
            This deletes <span className="font-bold">{className}</span>, every student in it, and everything they taught Gloam. It can&apos;t be undone. Download the spreadsheet first if you want to keep a record.
          </p>
          <label htmlFor="confirm-delete" className="mt-3 block text-sm font-bold text-ink">
            Type the class name to confirm
          </label>
          <input
            id="confirm-delete"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            className="mt-1 min-h-11 w-full rounded-md border border-line bg-panel px-3 text-md text-ink"
          />
          {error && (
            <p role="alert" className="mt-2 text-sm font-bold text-[var(--t-warn)]">
              {error}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="danger" disabled={!matches} onClick={() => void remove()}>
              Delete the class forever
            </Button>
            <Button
              variant="quiet"
              className="border-0"
              onClick={() => {
                setConfirming(false);
                setTyped("");
              }}
            >
              Keep it
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
