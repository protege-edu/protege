# AI in Protégé: what it does, its limits, and who's in charge

An algorithmic impact assessment for school boards. It follows Canada's federal, provincial and territorial
privacy commissioners' 2025 resolution on ed-tech, and the Ontario IPC and Human Rights Commission's 2026
principles for responsible AI (valid and reliable, safe, privacy-protective, human-rights-affirming,
transparent, accountable). It also covers what the EU AI Act would look for.

## What the AI does

Protégé uses one small language model (by default **Qwen3 4B Instruct**, Apache 2.0) through **Ollama**, on the
computer running Protégé. It never runs in a cloud. It does three jobs:

1. **Drafting a lesson** from a teacher's notes: the key ideas, the wrong ideas students often have, Gloam's
   questions and story. **A teacher reviews, edits and approves every lesson. Students only ever see
   approved lessons.**
2. **Judging an explanation:** for each idea a student's message might be about, the AI answers one small
   question: does this agree with the true version, or the wrong one? This moves the idea's candle (0 to 3).
   It runs with temperature 0, so the same message gets the same answer.
3. **Writing Gloam's reply** to what the student actually said, in character.

Optional **voice typing** uses **whisper.cpp** with a Whisper speech model (MIT), on the same computer, to turn
speech into words the student checks before sending.

Optional **read-aloud in Gloam's voice** uses **Kokoro** (Apache 2.0), a small speech model, run by
sherpa-onnx (Apache 2.0) on the same computer. It only reads out words already on the student's screen
(Gloam's lines, the steps to join, the recap). It never invents words. The voice is computer-made, as
students are told in "About Gloam". Without it, read-aloud uses the device's own voices.

## What the AI doesn't do

- **It doesn't grade.** Candles are labelled everywhere as the AI's estimate, not marks. The teacher sees them
  next to the student's actual words, and can correct any candle.
- **It doesn't decide anything about a student** beyond which part of the story they're in. No placement,
  ranking, discipline or reporting comes from it.
- **It isn't trained on students.** Nothing students write is used to train or tune any model. The model
  file never changes.
- **It never sees the answers while talking to students**, so it can't give them away. The correct ideas reach
  the student only through the end-of-lesson recap, which is written from the teacher-approved lesson and
  not by the AI.

## Human oversight

- Teachers approve every lesson before students see it, and can edit any part of it.
- Teachers can read every conversation and correct any candle. The journey and the dashboard follow.
- Sensitive moments don't depend on the AI:
  - A safety filter runs **before** the AI, and inappropriate messages never reach it.
  - A student who says something worrying gets a fixed, caring response pointing to a trusted adult.
  - Rude or off-topic messages get hand-written in-character lines.
- Every AI reply is checked before a student sees it: for answer words, banned phrases and repeats. If a
  reply fails, a hand-written line is used instead.
- An access log records which teacher viewed or changed a student's information.

## Transparency to students and families

Students are told, in words for their age and in their language, that Gloam is an AI, that its candles are an
estimate, who reads what they write, and how to ask to see or delete it. This appears on the title screen,
the join screen and in "How this works". Families get the notice in `family-notice.md`. The code is public.

## How it was checked (validation)

- **Scripted students** (`npm run eval`): real and invented conversations are replayed against the model:
  - a student explaining well
  - one who's wrong
  - one who's off-topic, rude, or pasting answers
  - one asking for the answer

  Checks: Gloam gives credit only for correct explanations, never gives the answer away, and stays on topic
  and kind.
- **Rule tests** (`npm run test:logic`, 64 tests): grading, progress, giveaways, safety filters (English and
  French, including disguised swears and distress), voice transcripts going through the same checks.
- **Load test** (`npm run load-test`): 30 students at once; every message answered, no errors.
- **Choosing the model:** smaller models were tested and rejected because they gave credit for wrong answers.

## Known limits (honest)

- A small model **can misjudge** an explanation, usually by being too strict with very short or unusual
  wording. That's why candles are estimates and teachers can correct them.
- **French** lesson drafting is weaker than English with the default model. Teachers should review French
  drafts carefully (they review every draft anyway).
- **Not yet measured:** how accurately it judges explanations from English and French language learners,
  younger writers, and students who write in dialects or with many spelling mistakes. Until this is measured,
  boards should treat candles for these students with extra care. This is the most important next study,
  and it should be done with real classes and teachers checking the AI's calls.
- Voice typing understands clear speech well. It is less accurate with background noise, young children's
  voices and strong accents. Students always see and can fix the words before sending.

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
- **The open-source project** documents how the AI works and fixes problems reported to it.
