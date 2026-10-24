# Protégé

**The student is the teacher.** Gloam, a small, dramatic creature with a lantern on its head, is confused about the lesson. Students explain things in their own words. When Gloam understands an idea, a candle lights up, and when it gets everything, the whole valley glows.

Everything runs on your own computer. No accounts, no paid services, no tracking, and no student data leaves the machine.

---

## Setup (about 10 minutes)

### 1. Install Node.js
Download the LTS version from [nodejs.org](https://nodejs.org) (free). Check it worked:
```
node -v
```

### 2. Install Ollama (runs the AI on your computer, free)
Download it from [ollama.com/download](https://ollama.com/download) and open it. Ollama runs in the background.

### 3. Download Gloam's brain (the AI model)
```
ollama pull qwen3:4b-instruct
```
It's about 2.5 GB. You only do this once. (We tested smaller models: they gave credit for wrong answers.)

### 4. Install and run Protégé
In this folder:
```
npm install
npm run dev
```
Open **http://localhost:3000** and start teaching.

---

## Changing the AI model
All AI settings live in one place. Copy `.env.example` to `.env.local` and change:
```
AI_MODEL=qwen3:4b-instruct
```
Any model from `ollama list` works. Bigger models are smarter but slower. Any OpenAI-compatible server works too: change `AI_BASE_URL`.

## Useful commands

| Command | What it does |
|---|---|
| `npm run dev` | Runs the app at http://localhost:3000 |
| `npm run eval` | Talks to Gloam with pretend students (good, wrong, off-topic, rude) and prints the transcripts and a report |
| `npm run screenshots` | Takes screenshots at Chromebook, desktop and phone sizes (app must be running) |
| `npm run test:logic` | Tests the non-AI rules (grading, progress, giveaways, safety). Takes a second |
| `npm run typecheck` | Checks the TypeScript |
| `npm run lint` | Checks code style |

---

## Age styles

Protégé is for every grade, K–12. The core idea never changes, but **how it feels** adapts to the class. Each age group has one profile in `lib/age-styles/`:

| Style | Grades | Gloam is… | Looks like… | Status |
|---|---|---|---|---|
| `little` | K–2 | silly, gentle, tiny words | bright storybook | basic |
| `junior` | 3–5 | playful, a bit silly | bright storybook | basic |
| `middle` | 6–8 | goofy, dramatic | storybook | basic |
| `senior` | 9–12 | dry, deadpan, smugly wrong | moody indie game at night | **polished** |

A profile controls Gloam's personality and AI rules, its **hand-written lines** (most of the jokes live here, so they're consistent and never repeat), every word on screen, the visuals (Gloam's skin, the valley, colors, Gloam's voice font), how big the celebrations are, how strict safety is (stricter for younger kids), and input options (bigger buttons, read-aloud and voice later). Nothing outside `lib/age-styles/` should be written for one age group.

Lessons say which style they're written for (`ageStyle` in the blueprint). In Phase 2 the teacher's grade level picks it.

## How it works (the short version)

Every time a student sends a message, four things happen:

1. **Safety check** (`lib/ai/safety.ts`). Not-for-school messages get an in-character redirect and the AI never sees them. Insults get a good-natured comeback. If a student says something worrying, Gloam drops the jokes and points them to a trusted adult. Younger age styles use a stricter filter.
2. **The judge** (`lib/companion/grade.ts` + `lib/ai/prompts/judge.ts`). Code finds which ideas a message could be about (using each idea's evidence words), then the AI answers one small question per idea: does the student agree with the true version or the wrong one? A small AI can't give credit for "yes" or file an answer under the wrong idea.
3. **The director** (`lib/companion/director.ts`). Plain code, no AI. It decides what happens in the story: did something click? Is the student stuck? Off topic? Asking for the answer? If the student didn't explain anything ("yea", "idk", "js tell me"), Gloam answers **instantly** with a hand-written line from the age style. No AI needed.
4. **Gloam performs** (`lib/ai/prompts/gloam.ts`). Only when the student explained something does the AI write Gloam's reply, so it can react to their exact words. Gloam **never sees the real answers**, so it can't give them away, and every reply is checked for answer words, banned phrases, reused comparisons and repeats before a student sees it.

Every AI answer is checked with Zod (`lib/ai/schemas.ts`). If the AI sends back nonsense, we retry, then fall back to a friendly line. Students never see an error message from the AI.

## Project map

```
app/                  pages and API routes (Next.js)
components/gloam/     Gloam: the SVG, its poses (emotions), blinking
components/scene/     the valley, the candles, the eureka moment
components/chat/      the conversation and the input box
lib/ai/               ALL the AI code. Swap models here (config.ts)
lib/companion/        progress rules, the director, grading, sessions
lib/lesson/           lesson blueprints (Phase 1: seasons)
lib/db/               the local SQLite database (data/protege.db)
scripts/              eval and screenshot tools
```

## Privacy
- Students are nicknames only. No real names, emails or birthdays are collected.
- The database is a file on this computer: `data/protege.db`. Delete it to wipe everything.
- No analytics, no trackers, no third-party scripts. Fonts are downloaded once at build time and served from this computer.
