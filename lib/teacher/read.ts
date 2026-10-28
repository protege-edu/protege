import "server-only";
import JSZip from "jszip";
import mammoth from "mammoth";
import { getDocumentProxy } from "unpdf";
import { dropRunningLines, pdfLinesToText } from "./pdf-text";
import { firstLine, splitPlainText } from "./plan";

/**
 * Reads a teacher's material into plain text, split into sections they can pick from.
 * Everything runs on this computer with free libraries. Nothing is uploaded anywhere.
 *
 *   PDF          → one section per page        (unpdf)
 *   PowerPoint   → one section per slide       (it's a zip of slide XML; JSZip)
 *   Word (.docx) → one section per heading     (mammoth)
 *   pasted text  → split on headings / blank-line gaps
 */
export interface Section {
  id: string;
  title: string;
  text: string;
  /** how big a heading starts it (1 = a new topic; see lib/teacher/plan.ts), if the file says */
  level?: number;
}

export interface ReadResult {
  kind: "pdf" | "pptx" | "docx" | "text";
  sections: Section[];
  chars: number;
}

export { MAX_SOURCE_CHARS } from "./limits";

export async function readMaterial(name: string, data: Uint8Array | string): Promise<ReadResult> {
  if (typeof data === "string") return finish("text", splitPlainText(data));
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf")) return finish("pdf", await readPdf(data));
  if (lower.endsWith(".pptx")) return finish("pptx", await readPptx(data));
  if (lower.endsWith(".docx")) return finish("docx", await readDocx(data));
  if (lower.endsWith(".txt") || lower.endsWith(".md")) return finish("text", splitPlainText(new TextDecoder().decode(data)));
  throw new UnsupportedFile(name);
}

export class UnsupportedFile extends Error {
  constructor(name: string) {
    super(`"${name}" isn't a file type Protégé can read yet. Use a PDF, PowerPoint (.pptx), Word (.docx), or paste the text.`);
  }
}

function finish(kind: ReadResult["kind"], raw: Section[]): ReadResult {
  const sections = raw
    .map((s) => ({ ...s, text: tidy(s.text), title: shorten(tidy(s.title)) }))
    .filter((s) => s.text.length > 20);
  if (sections.length === 0) {
    throw new Error("We couldn't find any text in that file. If it's a scanned PDF (a picture of a page), try pasting the text instead.");
  }
  return { kind, sections, chars: sections.reduce((n, s) => n + s.text.length, 0) };
}

async function readPdf(data: Uint8Array): Promise<Section[]> {
  const pdf = await getDocumentProxy(new Uint8Array(data));
  const pages: string[] = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const { items } = await (await pdf.getPage(n)).getTextContent();
    // (the other kind of item marks a content group and has no text)
    pages.push(pdfLinesToText(items.flatMap((it) => ("str" in it ? [it] : []))));
  }
  return dropRunningLines(pages).map((t, i) => ({ id: `p${i + 1}`, title: firstLine(t) || `Page ${i + 1}`, text: t }));
}

async function readPptx(data: Uint8Array): Promise<Section[]> {
  const zip = await JSZip.loadAsync(data);
  const slideFiles = Object.keys(zip.files)
    .filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f))
    .sort((a, b) => num(a) - num(b));
  const out: Section[] = [];
  for (const f of slideFiles) {
    const xml = await zip.file(f)!.async("string");
    const lines = paragraphs(xml);
    // speaker notes often hold the real explanation
    const notesFile = zip.file(`ppt/notesSlides/notesSlide${num(f)}.xml`);
    const notes = notesFile ? paragraphs(await notesFile.async("string")).filter((l) => !/^\d+$/.test(l)) : [];
    // a slide with just a title (and maybe a line under it) starts a new part of the deck
    const header = lines.length <= 2 && lines.join(" ").length < 90 && !notes.length;
    out.push({ id: `s${num(f)}`, title: lines[0] ?? `Slide ${num(f)}`, text: [...lines, ...notes].join("\n"), level: header ? 1 : undefined });
  }
  return out;
}

async function readDocx(data: Uint8Array): Promise<Section[]> {
  const { value: html } = await mammoth.convertToHtml({ buffer: Buffer.from(data) });
  const parts = html.split(/(?=<h[1-3][^>]*>)/);
  return parts.map((part, i) => {
    const head = part.match(/^<h([1-3])[^>]*>([\s\S]*?)<\/h[1-3]>/);
    const text = decode(part.replace(/<\/(p|li|h[1-6])>/g, "\n").replace(/<[^>]+>/g, " "));
    return { id: `d${i + 1}`, title: head ? decode(head[2].replace(/<[^>]+>/g, "")) : firstLine(text) || `Part ${i + 1}`, text, level: head ? Number(head[1]) : undefined };
  });
}

/** Text in a slide's XML, one line per paragraph */
function paragraphs(xml: string): string[] {
  return xml
    .split(/<\/a:p>/)
    .map((p) => decode([...p.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)].map((m) => m[1]).join("")).trim())
    .filter(Boolean);
}

const num = (f: string) => Number(f.match(/(\d+)\.xml$/)?.[1] ?? 0);
/** A title of 80 characters at most, cut between words (a slide that starts with a long sentence) */
const shorten = (t: string) => (t.length <= 80 ? t : `${t.slice(0, 78).replace(/\s+\S*$/, "")}…`);
const tidy = (t: string) => t.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
const decode = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
