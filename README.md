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
| `npx tsx scripts/perf.ts --rate 4` | Measures how smooth the game is with the CPU slowed 4x, like a cheap Chromebook (app must be running) |
| `npm run lint` | Checks code style |

**Test mode** (only while developing): open http://localhost:3000/?test. Pasted answers (like a Google AI Overview) can teach Gloam, and a small panel lets you teach the next idea or everything instantly, or make Gloam doze off, so you can see every moment without typing real explanations. It saves like a real turn. A real build doesn't have it.

Development-only pages (they don't exist in a production build): `/dev/style` (every button, panel and font), `/dev/rig` (Gloam's rig: every mood and moment, e.g. `/dev/rig?mood=excited&talk=1`), `/dev/journey` (the adventure at any checkpoint, e.g. `/dev/journey?levels=3,3,1,0,0`).

## The adventure (Phase 3)

A lesson is a journey across a painted valley. Each idea has a **shrine** along the path, with a candle that burns at that idea's level (unlit, a spark, flickering, lit). Gloam waits at the first idea it doesn't get yet; when it finally gets it, the "I get it" moment plays and Gloam **hop-walks to the next shrine** while the camera follows, then a chapter card appears. Lit shrines keep their own pools of light, so the path you've taught stays glowing. The **Muddle** (fog on the path ahead) thins as Gloam understands more. At the end Gloam walks to the overlook and the recap opens as **Gloam's journal**.

Gloam **grows across lessons**: each student's Gloam has a level that comes only from how many ideas they've taught it (`lib/companion/level.ts`). Its lantern gets bigger and brighter. No points, no shop. Leave in the middle of a lesson and Gloam is waiting at your last checkpoint when you come back.

Gloam itself is an **animated rig** (`lib/gloam-rig/`, `components/gloam/rig/`): a painted body that squashes, stretches and leans, painted arms and legs that move, a code-drawn face (eyes, felt eyelids, brows, a talking mouth), a springy stalk and a lantern that swings with real physics. An "animation brain" decides what every part does each frame: moods, blinking, glancing around, leaning in while you type, talking, hop-walking, a big eureka jump, and getting bored if nobody types (it looks around, fiddles with its lantern, sits down, then falls asleep). Each age style can point at its own rig file.

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

## The art (how the painted world was made)

The high school style's valley and Gloam are **hand-painted images made on this laptop** with a free local image model (FLUX.1-schnell, Apache 2.0) through ComfyUI. No paid tools, nothing uploaded. Every step is a script in `art/`, so any image can be re-made or **replaced 1:1 by a human artist**:

| Step | Script | What it does |
|---|---|---|
| Paint | `art/paint.py` + `art/prompts.py` | Paints candidates from a prompt and a seed (same seed = same image) |
| Clean up | `art/erase.py` | Paints out things that don't belong (like an extra lantern) |
| Relight | `art/grade.py` | Turns one painting into a matched **dark** and **lantern-lit** version |
| Depth | `art/layers.py` | Splits the painting into 4 depth layers for parallax (Depth Anything V2) |
| Gloam | `art/gloam2_rig.py` | Cuts the chosen painted Gloam into a body, arms, legs and lantern (lit and unlit); the face and stalk are drawn in code so they can act |
| Journey | `art/panorama.py` | Grows the valley painting sideways, one landmark at a time (outpainting) |
| Seams | `art/panorama_join.py`, `seams.py`, `mist_veil.py` | Stitches the stretches with matched colour, repaints the joins, hides the last one in a bank of mist |
| Props | `art/cutout.py` | Cuts a painted prop (the shrine) out of its background |

The game draws all of this with **PixiJS** on the GPU (`components/cinema/JourneyWorld.tsx`): lantern light reveals the lit painting as Gloam understands more, plus fog, fireflies, bloom, film grain and a camera that follows Gloam with parallax. Cheap Chromebooks automatically get a lighter version.

The painting tools are only needed to make new art, not to run Protégé. They live outside the project (`C:\Users\sonaw\ProtegeArt`), about 12 GB.

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
components/cinema/    the painted worlds (JourneyWorld = the adventure)
components/gloam/     Gloam: the animated rig (rig/), its poses (emotions), older skins
components/game/      the game screens: title, intro, teaching, journal, menus
components/ui/        the hand-cut UI kit: buttons, paper panels, the logo, the trail strip
components/teacher/   the teacher side: lessons, review, the class dashboard
lib/gloam-rig/        Gloam's animation brain and physics (plain code, tested)
lib/ai/               ALL the AI code. Swap models here (config.ts)
lib/companion/        progress rules, the director, grading, sessions
lib/lesson/           lesson blueprints (Phase 1: seasons)
lib/db/               the local SQLite database (see Privacy for where it lives)
scripts/              eval and screenshot tools
```

## Privacy
- Students are nicknames only. No real names, emails or birthdays are collected.
- The database is a file on this computer, in the app-data folder: `%LOCALAPPDATA%\Protege\protege.db` on Windows (`~/.local/share/Protege` on Mac/Linux). Set `PROTEGE_DATA_DIR` to keep it somewhere else. Delete it to wipe everything. (It lives outside the project folder because the dev server reloads the page whenever a file inside the project changes.)
- No analytics, no trackers, no third-party scripts. Fonts are downloaded once at build time and served from this computer.
