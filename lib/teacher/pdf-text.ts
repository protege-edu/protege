export interface PdfItem {
  str: string;
  /** [a, b, c, d, x, y]: y is the baseline, going UP the page */
  transform: number[];
  height: number;
  hasEOL?: boolean;
}

const SUP: Record<string, string> = { 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹", "+": "⁺", "-": "⁻", "−": "⁻", "–": "⁻", "=": "⁼", "(": "⁽", ")": "⁾", a: "ᵃ", b: "ᵇ", c: "ᶜ", k: "ᵏ", m: "ᵐ", n: "ⁿ", t: "ᵗ", x: "ˣ", y: "ʸ", i: "ⁱ" };
const SUB: Record<string, string> = { 0: "₀", 1: "₁", 2: "₂", 3: "₃", 4: "₄", 5: "₅", 6: "₆", 7: "₇", 8: "₈", 9: "₉", "+": "₊", "-": "₋", "−": "₋", "–": "₋", "=": "₌", "(": "₍", ")": "₎" };

/**
 * Joins a PDF page's text pieces back into lines. In a PDF, an exponent is its own smaller piece of text
 * sitting a little above the line, so plain extraction turns 2³ into "23", which changes the maths.
 * Small raised pieces become superscripts and small lowered ones subscripts (H₂O).
 */
export function pdfLinesToText(items: PdfItem[]): string {
  let out = "";
  let base: { y: number; h: number } | null = null;
  for (const it of items) {
    const y = it.transform[5];
    let str = it.str;
    if (it.height > 0 && str.trim()) {
      const shift = base ? y - base.y : 0;
      const small = base && it.height < base.h * 0.88 && Math.abs(shift) > base.h * 0.15 && Math.abs(shift) < base.h * 0.7;
      if (small) {
        const map = shift > 0 ? SUP : SUB;
        const chars = [...str.trim()];
        str = chars.every((ch) => map[ch]) ? chars.map((ch) => map[ch]).join("") : `${shift > 0 ? "^" : "_"}(${str.trim()})`;
      } else {
        base = { y, h: it.height };
      }
    }
    out += str;
    // A new line starts fresh: an exponent is never the first thing on a line (that's a subtitle)
    if (it.hasEOL) {
      out += "\n";
      base = null;
    }
  }
  return out;
}

/**
 * Removes running headers and footers ("Exponents: A Grade 9 Guide  Page 2 of 5") that repeat on most pages,
 * so each page is named by its own first heading and the AI doesn't read the same line five times.
 */
export function dropRunningLines(pages: string[]): string[] {
  if (pages.length < 2) return pages;
  const key = (line: string) => line.trim().toLowerCase().replace(/\d+/g, "#");
  const seen = new Map<string, number>();
  for (const page of pages) for (const k of new Set(page.split("\n").map(key).filter(Boolean))) seen.set(k, (seen.get(k) ?? 0) + 1);
  const running = (line: string) => (seen.get(key(line)) ?? 0) >= Math.max(2, pages.length * 0.6);
  return pages.map((page) =>
    page
      .split("\n")
      .filter((line) => !running(line))
      .join("\n"),
  );
}
