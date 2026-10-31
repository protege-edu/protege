import { z } from "zod";
import { chatJSON } from "./client";
import { checkSafety } from "./safety";
import { almostPrompt, beliefCheckPrompt, conceptPrompt, factCheckPrompt, fixQuestionPrompt, outlinePrompt, questionCheckPrompt, storyPrompt } from "./prompts/blueprint";
import { getAgeStyle, styleForGrade } from "@/lib/age-styles";
import { detectLanguage } from "@/lib/lesson/language";
import type { Concept, LessonBlueprint } from "@/lib/lesson/types";
import { checkConcept, slug } from "@/lib/teacher/checks";

/**
 * Drafts a lesson blueprint from a teacher's material, in small, focused steps:
 *   1. outline: the key ideas, each with the truth and the realistic wrong idea
 *   2. each idea: Gloam's 4 belief stages, questions, answer words, evidence words, recap (in the class's age-style voice)
 *   3. the story: Gloam's wrong opening theory, 5 story beats, the finale
 * Every step is checked by code and retried if it fails. The teacher reviews it all before students see it.
 */

const Outline = z.object({
  title: z.string().min(3).max(120),
  topic: z.string().min(2).max(40),
  subject: z.string().min(2).max(60),
  concepts: z
    .array(z.object({ name: z.string().min(2).max(60), truth: z.string().min(10).max(500), misconception: z.string().min(8).max(300) }))
    .min(2)
    .max(6),
});

const ConceptLines = z.object({
  // Named stages, not a list: small models shuffle list order
  beliefs: z.object({
    wrong: z.string().min(3).max(300),
    doubting: z.string().min(3).max(300),
    almost: z.string().min(3).max(300),
    gotIt: z.string().min(3).max(300),
  }),
  questions: z.array(z.string().min(5).max(200)).min(2).max(4),
  giveaways: z.array(z.string().min(2).max(40)).min(2).max(8),
  evidence: z.array(z.string().min(2).max(30)).min(3).max(16),
  recap: z.string().min(10).max(400),
});

const Story = z.object({
  opener: z.string().min(10).max(400),
  storyBeats: z.array(z.string().min(3).max(140)).length(5),
  finale: z.string().min(10).max(500),
  topicWords: z.array(z.string().min(2).max(30)).min(4).max(20),
});

const FixedQuestion = z.object({ question: z.string().min(5).max(200) });

const QuestionCheck = (n: number) => z.object({ checks: z.array(z.object({ revealsAnswer: z.boolean() })).length(n) });

const BeliefCheck = z.object({ startIsWrong: z.boolean(), almostIsTrue: z.boolean(), endIsTrue: z.boolean() });
const AlmostLine = z.object({ almost: z.string().min(2).max(300) });

const FactCheck = z.object({ inNotes: z.boolean(), truthIsCorrect: z.boolean(), wrongIsActuallyWrong: z.boolean(), note: z.string().max(300) });

// Words that are never evidence of anything
const STOP = new Set(["what", "when", "where", "which", "does", "need", "needs", "about", "from", "with", "that", "this", "they", "their", "have", "happens", "works", "makes", "things", "thing", "idea", "ideas", "why", "mean", "means", "really", "actually", "just", "example", "examples"]);

// Chinese, Japanese and Korean characters (lessons in English or French never need them)
const OTHER_SCRIPT = /[぀-ヿ㐀-鿿가-힯]/;

export type DraftProgress = (step: string) => void;

export class DraftFailed extends Error {}

/**
 * One drafting step, retried until the answer passes. `vet` can turn down an answer that fits the
 * schema but still isn't usable (it returns what's wrong, or null if it's fine).
 */
async function ask<T>(
  name: string,
  schema: z.ZodType<T>,
  messages: { role: "system" | "user"; content: string }[],
  tries = 3,
  vet?: (data: T) => string | null,
): Promise<T> {
  let last = "";
  for (let i = 0; i < tries; i++) {
    // A lesson is drafted once for the whole class, so the steps that decide what's TRUE (the outline, the
    // fact check) may think first. Every other step is a short writing job and doesn't need to.
    const think = name === "outline" || name === "fact_check";
    const res = await chatJSON({ name, schema, messages, thinking: think, effort: think ? "medium" : "low", maxTokens: think ? 8000 : 2000, timeoutMs: 120_000, priority: "background" });
    // A model can slip into another alphabet mid-word ("乘"): that answer can't be used
    if (res.ok && OTHER_SCRIPT.test(JSON.stringify(res.data))) {
      last = "text in an unexpected alphabet";
      continue;
    }
    if (res.ok) {
      const problem = vet?.(res.data);
      if (!problem) return res.data;
      last = problem;
      continue;
    }
    if (res.reason === "unreachable") throw new DraftFailed("Protégé can't reach Gloam's brain (Claude) right now. Try again in a minute.");
    if (res.reason === "busy") throw new DraftFailed("Gloam's brain (Claude) is very busy right now. Try again in a minute.");
    if (res.reason === "too_long") throw new DraftFailed("This part of your notes is too long for Gloam to read at once. Split it into two lessons, or leave a section out, and try again.");
    last = res.detail;
  }
  throw new DraftFailed(`The AI kept giving answers we couldn't use (${last.slice(0, 80)}). Try again, or use a shorter part of your notes.`);
}

const lower = (xs: string[]) => [...new Set(xs.map((x) => x.toLowerCase().trim()).filter(Boolean))];

export async function draftBlueprint(opts: { source: string; grade: number; titleHint?: string; onProgress?: DraftProgress }): Promise<LessonBlueprint> {
  const { source, grade, titleHint, onProgress } = opts;
  // the lesson speaks the notes' language (the teacher can change it on the review page)
  const language = detectLanguage(source);
  const style = getAgeStyle(styleForGrade(grade).id, language);
  // Everything Gloam says goes through the same school-safety filter as students' messages
  const unsafe = (lines: string[]) => (lines.some((l) => checkSafety(l, style) !== "ok") ? "a line that isn't school-appropriate" : null);

  onProgress?.("Reading your notes and finding the key ideas");
  const outline = await ask("outline", Outline, outlinePrompt({ source, grade, titleHint, language }));

  const ids = new Set<string>();
  const stageNotes: string[] = [];
  const concepts: Concept[] = [];
  for (const [i, c] of outline.concepts.entries()) {
    onProgress?.(`Writing Gloam's lines for idea ${i + 1} of ${outline.concepts.length}: ${c.name}`);
    let id = slug(c.name);
    while (ids.has(id)) id = `${id}-${i}`;
    ids.add(id);
    const prompt = conceptPrompt({ style, lessonTitle: outline.title, name: c.name, truth: c.truth, misconception: c.misconception, otherIdeas: outline.concepts.filter((o) => o !== c).map((o) => o.name) });
    const vetLines = (l: z.infer<typeof ConceptLines>) => unsafe([...Object.values(l.beliefs), ...l.questions]);
    let lines = await ask("concept", ConceptLines, prompt, 3, vetLines);
    // Gloam starts with the wrong idea and ends with the true one. Check it, and redo it if it's backwards.
    const checkStages = () => ask("belief_check", BeliefCheck, beliefCheckPrompt({ truth: c.truth, misconception: c.misconception, ...lines.beliefs }), 2).catch(() => null);
    let stagesOk = false;
    let check = await checkStages();
    for (let attempt = 0; attempt < 2 && check && !(check.startIsWrong && check.endIsTrue); attempt++) {
      lines = await ask("concept", ConceptLines, prompt, 3, vetLines);
      check = await checkStages();
    }
    // The "almost" stage is where Gloam lands after ONE good explanation, so it must already be right
    // (it can leave out why). Small models often write it as the wrong idea again: rewrite just that line,
    // and if that fails too, Gloam says its final, checked line (a wrong belief after a good explanation is worse).
    if (check && check.startIsWrong && check.endIsTrue && !check.almostIsTrue) {
      const fix = await ask("almost", AlmostLine, almostPrompt({ style, truth: c.truth, misconception: c.misconception, gotIt: lines.beliefs.gotIt }), 2).catch(() => null);
      if (fix) lines = { ...lines, beliefs: { ...lines.beliefs, almost: fix.almost } };
      check = await checkStages();
      if (check && !check.almostIsTrue) lines = { ...lines, beliefs: { ...lines.beliefs, almost: lines.beliefs.gotIt } };
    }
    stagesOk = !check || (check.startIsWrong && check.endIsTrue);
    if (!stagesOk) stageNotes.push(c.name);
    // Evidence also includes the real content words from the idea's own name (never "what", "need"…)
    // (accents folded first, so "être" gives "etre", not "tre")
    const folded = c.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const nameWords = (folded.match(/[a-z]{4,}/g) ?? []).filter((w) => !STOP.has(w));
    concepts.push({
      id,
      name: c.name,
      truth: c.truth,
      misconception: c.misconception,
      beliefs: [lines.beliefs.wrong, lines.beliefs.doubting, lines.beliefs.almost, lines.beliefs.gotIt],
      questions: lines.questions,
      // Answer words are matched exactly, so a long phrase protects nothing: keep the short ones
      giveaways: lower(lines.giveaways).filter((g) => g.split(/\s+/).length <= 4),
      evidence: lower([...lines.evidence, ...nameWords]).filter((w) => !STOP.has(w)),
      recap: lines.recap,
    });
  }

  onProgress?.("Writing Gloam's opening theory and the story");
  const story = await ask(
    "story",
    Story,
    storyPrompt({ style, lessonTitle: outline.title, topic: outline.topic, misconceptions: concepts.map((c) => c.misconception), truths: concepts.map((c) => c.truth) }),
    3,
    (st) => unsafe([st.opener, st.finale, ...st.storyBeats]),
  );

  // "Answer words" are checked across the whole lesson, so one can't be a word Gloam needs just to talk:
  // nothing from any idea's name, any wrong idea, Gloam's two confused belief stages, or its opening theory
  const talkText = [story.opener, ...concepts.flatMap((c) => [c.name, c.misconception, c.beliefs[0], c.beliefs[1]])].join(" ").toLowerCase();
  for (const c of concepts) c.giveaways = c.giveaways.filter((g) => !talkText.includes(g));

  // Evidence words pick which ideas a message could be about, so words that fit everything are useless:
  // the topic itself ("exponent" in an exponents lesson) and words that 3 or more ideas share
  const topic = outline.topic.toLowerCase();
  const uses = new Map<string, number>();
  for (const w of concepts.flatMap((c) => c.evidence)) uses.set(w, (uses.get(w) ?? 0) + 1);
  const shared = (w: string) => (uses.get(w) ?? 0) >= 3;
  for (const c of concepts) {
    const kept = c.evidence.filter((w) => !topic.includes(w) && !shared(w));
    c.evidence = kept.length >= 3 ? kept : c.evidence;
  }

  const bp: LessonBlueprint = {
    id: "draft",
    ageStyle: style.id,
    language,
    grade,
    topic: outline.topic.toLowerCase(),
    topicWords: lower(story.topicWords),
    title: outline.title,
    subject: outline.subject,
    opener: story.opener,
    concepts,
    storyBeats: story.storyBeats,
    finale: story.finale,
  };

  // A second look at the facts. Doubts become notes on the teacher's review screen (the teacher decides).
  onProgress?.("Double-checking the facts against your notes");
  const reviewNotes: NonNullable<LessonBlueprint["reviewNotes"]> = [];
  for (const name of stageNotes) {
    const c = concepts.find((x) => x.name === name)!;
    reviewNotes.push({ conceptId: c.id, note: `Check Gloam's lines for "${name}": the first should be the wrong idea, the third already right (it can leave out why), and the last fully correct.` });
  }
  for (const c of concepts) {
    try {
      const fc = await ask("fact_check", FactCheck, factCheckPrompt({ source, name: c.name, truth: c.truth, misconception: c.misconception }), 2);
      if (!fc.inNotes || !fc.truthIsCorrect || !fc.wrongIsActuallyWrong) {
        const why = !fc.wrongIsActuallyWrong ? "its \"wrong idea\" might actually be true" : !fc.truthIsCorrect ? "the correct idea might be inaccurate" : "it might not be in your notes";
        reviewNotes.push({ conceptId: c.id, note: fc.note || `Double-check "${c.name}": ${why}.` });
      }
    } catch {
      reviewNotes.push({ conceptId: c.id, note: `We couldn't double-check "${c.name}". Please read it carefully.` });
    }
  }
  bp.reviewNotes = reviewNotes;

  // Fix questions that give an answer away (and drop any that still do).
  // Code catches answer words; the model catches the sneakier kind ("why is it NOT -9?").
  onProgress?.("Checking that Gloam never gives away an answer");
  for (const c of bp.concepts) {
    let revealing: boolean[] = [];
    try {
      const qc = await ask("question_check", QuestionCheck(c.questions.length), questionCheckPrompt(c), 2);
      revealing = qc.checks.map((x) => x.revealsAnswer);
    } catch {
      // the code check below still runs
    }
    for (let q = 0; q < c.questions.length; q++) {
      const leaked = checkConcept(c, bp).find((p) => p.field === `questions.${q}`)?.message.match(/"([^"]+)"\.$/)?.[1];
      if (!leaked && !revealing[q]) continue;
      const problem = leaked ? `uses the word "${leaked}", which gives the answer away` : "gives the answer away or says Gloam's idea is wrong";
      try {
        const fixed = await ask("fix_question", FixedQuestion, fixQuestionPrompt({ style, question: c.questions[q], problem, name: c.name, misconception: c.misconception }), 2);
        c.questions[q] = fixed.question;
      } catch {
        // leave it; the next check drops it if it still has an answer word
      }
    }
    const stillLeaking = new Set(checkConcept(c, bp).filter((p) => p.field.startsWith("questions.")).map((p) => Number(p.field.split(".")[1])));
    c.questions = c.questions.filter((_, i) => !stillLeaking.has(i));
  }
  return bp;
}
