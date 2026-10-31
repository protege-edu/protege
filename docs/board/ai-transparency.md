# AI in Protégé: what it does, its limits, and who's in charge

An algorithmic impact assessment for school boards. It follows Canada's federal, provincial and territorial
privacy commissioners' 2025 resolution on ed-tech, and the Ontario IPC and Human Rights Commission's 2026
principles for responsible AI (valid and reliable, safe, privacy-protective, human-rights-affirming,
transparent, accountable). It also covers what the EU AI Act would look for.

## What the AI is

Protégé uses **Claude Haiku 5.5**, a language model made by **Anthropic**, through **Anthropic's API** under
its commercial terms. The model runs on Anthropic's systems in the United States, not on school devices or on
Protégé's own server. Anthropic does not train its models on API data by default. The model name is one
setting (`AI_MODEL`) and all AI code is in one module (`lib/ai/`), so a board running its own copy uses its
own Claude account. See [hosting](hosting-for-boards.md).

## What the AI does

It does three jobs:

1. **Drafting a lesson** from a teacher's notes: the key ideas, the wrong ideas students often have, Gloam's
   questions and story. **A teacher reviews, edits and approves every lesson. Students only ever see
   approved lessons.**
2. **Judging an explanation:** one call asks which of the lesson's ideas a student's message is about, and
   whether it agrees with the true version or the wrong one. Plain code then decides which of those answers
   count, and moves each idea's candle (0 to 3). Plain code skips the AI entirely for messages like "idk",
   "lol" or "just tell me".
3. **Writing Gloam's reply** to what the student actually said, in character. Many turns don't use the AI at
   all: they use hand-written lines from the age style.

## What is sent to Claude, and what never is

| Job | Sent | Never sent |
|---|---|---|
| Drafting a lesson | Instructions for drafting, and the notes text the teacher chose (files are read in the teacher's browser and never uploaded) | The teacher's name, email or account; the file itself |
| Judging and replying to a student | Gloam's instructions, the lesson's ideas, the student's message, and the last few messages of that conversation | The student's nickname, id, class, teacher, sign-in details, accessibility settings, or anything else about who they are |

The part of each request that's the same for the whole class (Gloam's instructions and the lesson) uses
Anthropic's prompt caching for a short time, to save cost. Messages that fail the safety filter are never sent.

**Voice typing and read-aloud are not AI services of Protégé.** They use the student's own device: the
browser's speech recognition only when it runs on the device (`processLocally`), and only voices that run on
the device (`localService`). If the device can't, the feature is hidden. No audio is sent anywhere.

## What the AI doesn't do

- **It doesn't grade.** Candles are labelled everywhere as the AI's estimate, not marks. The teacher sees them
  next to the student's actual words, and can correct any candle.
- **It doesn't decide anything about a student** beyond which part of the story they're in. No placement,
  ranking, discipline or reporting comes from it.
- **It isn't trained on students.** Protégé never uses what students write to train or tune any model, and
  Anthropic does not train on API data by default.
- **The AI that writes Gloam's replies never sees the answers**, so it can't give them away. (The judging step
  does see the lesson's true ideas, because it compares the student's words to them; its output is labels,
  never shown to students.) The correct ideas reach the student only through the end-of-lesson recap, which is
  written from the teacher-approved lesson and not by the AI.

## Human oversight and safeguards

- Teachers approve every lesson before students see it, and can edit any part of it.
- Teachers can read every conversation and correct any candle. The journey and the dashboard follow.
- Every AI answer is structured JSON, checked in code with Zod. If Claude can't be reached, declines, or sends
  something unusable, Protégé retries or uses a hand-written line. Students never see an error from the AI.
- Sensitive moments don't depend on the AI:
  - A code safety filter runs **before** the AI, and inappropriate messages never reach it.
  - A student who says something worrying gets a fixed, caring response pointing to a trusted adult.
  - Rude or off-topic messages get hand-written in-character lines.
- Every AI reply is checked by code before a student sees it: by the safety filter, and for answer words,
  banned phrases and repeats. If a reply fails, a hand-written line is used instead.
- **Daily limits** per student, per class, per teacher and for the whole service cap cost and abuse. When one
  is reached, Gloam falls asleep in character and nothing is sent to Claude.
- An access log records which teacher viewed or changed a student's information.

## Transparency to students and families

Students are told, in words for their age and in their language, that Gloam is an AI made with Claude by
Anthropic, that its candles are an estimate, what is kept, who reads what they write, and how to ask to see
or delete it. This appears on the title screen, the join screen and in "How this works". Families get the
notice in [family-notice.md](family-notice.md). The code is public.

## How it was checked (validation)

- **Scripted students** (`npm run eval`): real and invented conversations are replayed against the model:
  - a student explaining well
  - one who's wrong
  - one who's off-topic, rude, or pasting answers
  - one asking for the answer

  Checks: Gloam gives credit only for correct explanations, never gives the answer away, and stays on topic
  and kind.
- **Rule tests** (`npm run test:logic`, run on every change): grading, progress, giveaways, safety filters
  (English and French, including disguised swears and distress).
- **Load test** (`npm run load-test`): a pretend class of 30 students teaching Gloam at once with the real AI.
  **[Operator to complete: the latest results against the hosted service.]**

These checks were first built and run with the earlier local model. **[Operator to complete: the date and
results of the latest eval run with Claude Haiku 5.5.]**

## Known limits (honest)

- The model **can misjudge** an explanation, for example being too strict with very short or unusual wording,
  or too generous. That's why candles are estimates and teachers can correct them.
- **Not yet measured:** how accurately it judges explanations from English and French language learners,
  younger writers, and students who write in dialects or with many spelling mistakes, and how French drafting
  and judging compare with English. Until this is measured, boards should treat candles for these students with
  extra care. This is the most important next study, and it should be done with real classes and teachers
  checking the AI's calls.
- **It depends on an outside service.** If Anthropic's API is down or slow, Gloam uses hand-written lines and
  judging waits; nothing is lost, but teaching Gloam slows down.
- **Anthropic's model can change.** A new model version may judge differently. Changing the model is a
  deliberate setting, and the checks above should be run again when it changes.
- Voice typing quality depends on the student's device and browser. It is less accurate with background
  noise, young children's voices and strong accents. Students always see and can fix the words before
  sending.

## Risk level

Protégé helps a teacher see a student's understanding. It doesn't decide anything about them. The EU AI Act
lists AI that "evaluates learning outcomes" in education as potentially high-risk (Annex III, 3(b)), with
obligations from December 2027 (as amended by the 2026 Digital Omnibus). Whether Protégé's estimates fall in
that category hasn't been settled. **This matters only for use in the EU** and needs legal advice before
any EU deployment. In Canada, no AI regulation for school boards was in force as of October 2026 (EDSTA allows
future ones).

## Who's accountable

- **The school board** decides whether and how Protégé is used.
- **Teachers** approve lessons and have the last word on candles.
- **Whoever operates the service** chooses the model, holds the Anthropic account and sets the daily limits.
  **[Operator to complete: who that is for the shared service.]**
- **Anthropic** provides the model, under its commercial terms.
- **The open-source project** documents how the AI works and fixes problems reported to it.
