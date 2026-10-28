import { MAX_SOURCE_CHARS } from "./limits";

/**
 * Turning a teacher's notes (any length) into lessons. Plain code, no AI, so it's instant and works the
 * same on the server and in the browser (the teacher moves the breaks around before anything is drafted).
 *
 * Why lessons and not one long one: Gloam's brain reads about 4,000 tokens at a time on a laptop (Ollama's
 * context), and one lesson works best with a handful of ideas. So each lesson gets a part of the notes that
 * fits (MAX_SOURCE_CHARS, measured to fit in English and French with room for Gloam's instructions), and a
 * unit can have as many lessons as the notes need.
 */
export interface Part {
  id: string;
  title: string;
  text: string;
  /** 1 = a big heading (a new topic), 2 = a sub-heading, 3 = smaller; none = a page or a chunk */
  level?: number;
}

export interface PlannedLesson {
  title: string;
  parts: Part[];
  chars: number;
}

/** Parts too long to share a lesson are cut at paragraph breaks (or sentences, if a paragraph is huge) */
export function splitLong(sections: Part[], budget = MAX_SOURCE_CHARS): Part[] {
  const most = Math.round(budget * 0.9);
  const piece = Math.round(budget * 0.6);
  return sections.flatMap((s) => {
    if (s.text.length <= most) return [s];
    // paragraphs (with their blank line), and a paragraph too long for a piece as its sentences
    const bits = s.text.split(/\n\s*\n/).flatMap((para) => {
      const pieces = para.length <= piece ? [para] : (para.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) ?? [para]);
      // (a single sentence longer than a piece, rare, is cut where it has to be)
      const cut = pieces.flatMap((x) => (x.length <= piece ? [x] : (x.match(new RegExp(`[\\s\\S]{1,${piece}}`, "g")) ?? [x])));
      cut[cut.length - 1] += "\n\n";
      return cut;
    });
    const chunks: string[] = [];
    let cur = "";
    for (const b of bits) {
      if (cur && cur.length + b.length > piece) {
        chunks.push(cur.trim());
        cur = "";
      }
      cur += b;
    }
    if (cur.trim()) chunks.push(cur.trim());
    return chunks.map((text, i) => ({ id: i ? `${s.id}-${i + 1}` : s.id, title: i ? `${s.title} (continued)` : s.title, text, level: i ? undefined : s.level }));
  });
}

/**
 * Where each lesson starts (indexes into `parts`, always beginning with 0). A lesson ends when the next part
 * wouldn't fit, at a big heading once it has enough to teach (a few paragraphs: two or three ideas), or at a
 * sub-heading once it's nicely full. A tiny last bit joins the lesson before (a short topic under its own
 * big heading stays a lesson of its own).
 */
export function planBreaks(parts: Part[], budget = MAX_SOURCE_CHARS): number[] {
  const enough = budget * 0.13;
  const tiny = budget * 0.07;
  const full = budget * 0.7;
  const starts = [0];
  let size = 0;
  parts.forEach((p, i) => {
    const level = p.level ?? 9;
    if (i > 0 && (size + p.text.length > budget || (level <= 1 && size >= enough) || (level <= 2 && size >= full))) {
      starts.push(i);
      size = 0;
    }
    size += p.text.length;
  });
  if (starts.length > 1) {
    const sum = (from: number, to: number) => parts.slice(from, to).reduce((n, p) => n + p.text.length, 0);
    const last = starts[starts.length - 1];
    const before = starts[starts.length - 2];
    const ownTopic = (parts[last].level ?? 9) <= 1;
    const left = sum(last, parts.length);
    if ((left < tiny || (left < enough && !ownTopic)) && sum(before, parts.length) <= budget) starts.pop();
  }
  return starts;
}

/** The lessons the breaks make, leaving out the parts the teacher unticked (and lessons left empty) */
export function lessonsFrom(parts: Part[], breaks: number[], skipped: ReadonlySet<string> = new Set()): (PlannedLesson & { start: number })[] {
  const starts = [...new Set([0, ...breaks])].filter((b) => b >= 0 && b < parts.length).sort((a, b) => a - b);
  return starts
    .map((start, i) => {
      const kept = parts.slice(start, starts[i + 1] ?? parts.length).filter((p) => !skipped.has(p.id));
      return { start, title: (kept[0]?.title ?? "").slice(0, 80), parts: kept, chars: kept.reduce((n, p) => n + p.text.length, 0) };
    })
    .filter((l) => l.parts.length > 0);
}

/** The text Gloam reads for one lesson */
export const lessonSource = (l: Pick<PlannedLesson, "parts">) => l.parts.map((p) => p.text).join("\n\n");

/** Pasted text: split on markdown-style headings, or into ~900-character chunks at paragraph breaks */
export function splitPlainText(text: string): Part[] {
  const byHeading = text.split(/\n(?=#{1,3}\s)/);
  const blocks = byHeading.length > 1 ? byHeading : chunkParagraphs(text, 900);
  return blocks.map((b, i) => {
    const head = b.match(/^\s*(#{1,3})\s+(.*)/);
    const text = b.replace(/^\s*#+\s*/, "");
    // (a heading is the title however short it is; otherwise the first real line)
    return { id: `t${i + 1}`, title: head?.[2].trim() || firstLine(text) || `Part ${i + 1}`, text, level: head?.[1].length };
  });
}

function chunkParagraphs(text: string, size: number): string[] {
  const paras = text.split(/\n\s*\n/);
  const out: string[] = [];
  let cur = "";
  for (const p of paras) {
    if (cur && cur.length + p.length > size) {
      out.push(cur);
      cur = "";
    }
    cur += (cur ? "\n\n" : "") + p;
  }
  if (cur) out.push(cur);
  return out;
}

/** A part's title when it has no heading: its first real line */
export const firstLine = (t: string) => t.split("\n").map((l) => l.trim()).find((l) => l.length > 2) ?? "";
