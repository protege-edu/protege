# Protégé

**The student is the teacher.** Gloam, a small, dramatic creature with a lantern on its head, is confused about the lesson. Students explain things in their own words. When Gloam understands an idea, a candle lights up, and when it gets everything, the whole valley glows.

Everything runs on your own computer: no paid services, no tracking, and no student data leaves the machine. Teachers have accounts; students join a class with a code, a nickname and a secret picture key.

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

### 5. Make your teacher account
Open **http://localhost:3000/teacher**. The first account needs the **setup code**, which Protégé prints in the window where `npm run dev` is running:
```
  ┌──────────────────────────────────────────────┐
  │  Protégé setup code:  ABCD-EFGH              │
```
(It's also saved in `SETUP-CODE.txt` next to the database, see Privacy.) The first account takes over everything made before, like the practice class. Save the **recovery code** it shows you: it's the only way back in if you forget your password, because Protégé doesn't send emails.

**More teachers:** on teacher home, press "Make an invite code" and give it to them. Each code works once and lasts a week. Every teacher only sees their own classes and lessons.

---

## Changing the AI model
All AI settings live in one place. Copy `.env.example` to `.env.local` and change:
```
AI_MODEL=qwen3:4b-instruct
```
Any model from `ollama list` works. Bigger models are smarter but slower. Any OpenAI-compatible server works too: change `AI_BASE_URL`.

**A whole class at once:** at most `AI_CONCURRENCY` AI calls run together (default 2); everyone else waits in a fair line, and Gloam tells them in character ("3 gloams are thinking before me"). Students always go before lesson drafting. Once a student's message starts being answered, its next calls go to the front, so every message finishes promptly.

**What to expect** (measured with `npm run load-test`, 30 students at a real pace, on the development laptop with an Intel Arc GPU): every message answered, no errors, a typical reply in about 13 seconds, 1 in 10 over 20 seconds, the slowest about 45. While Gloam waits, it says where it is in line. When many students are waiting, Gloam answers with its hand-written lines for that moment instead of writing new ones (the judging of what they taught always uses the AI), so nobody waits much longer. A laptop with a faster GPU (for example NVIDIA) answers several times faster. Try `AI_CONCURRENCY=3` or `4` there and keep whichever `npm run load-test` says is fastest.

## Useful commands

| Command | What it does |
|---|---|
| `npm run dev` | Runs the app at http://localhost:3000 |
| `npm run eval` | Talks to Gloam with pretend students (good, wrong, off-topic, rude) and prints the transcripts and a report |
| `npm run screenshots` | Takes screenshots at Chromebook, desktop and phone sizes (app must be running) |
| `npm run test:logic` | Tests the non-AI rules (grading, progress, giveaways, safety). Takes a second |
| `npm run class` | Runs Protégé for a real class (see "Putting Protégé online") |
| `npm run load-test -- --code GLOW-42` | A pretend class of 30 teaching Gloam at once, with the real AI. Reports reply times and any errors. Use a class made just for this |
| `npm run test:accounts` | Tests accounts and safety (passwords, picture keys, lock-outs, invites, nicknames, each teacher seeing only their own things) on a throwaway database |
| `npm run typecheck` | Checks the TypeScript |
| `npx tsx scripts/perf.ts --rate 4` | Measures how smooth the game is with the CPU slowed 4x, like a cheap Chromebook (app must be running) |
| `npm run lint` | Checks code style |

**Play-testing:** see [PLAYTEST.md](PLAYTEST.md) for how to run a session with friends.

**Test mode** (only while developing): open http://localhost:3000/?test. Pasted answers (like a Google AI Overview) can teach Gloam, and a small panel lets you teach the next idea or everything instantly, or make Gloam doze off, so you can see every moment without typing real explanations. It saves like a real turn. A real build doesn't have it.

Development-only pages (they don't exist in a production build): `/dev/style` (every button, panel and font), `/dev/rig` (Gloam's rig: every mood and moment, e.g. `/dev/rig?mood=excited&talk=1`), `/dev/journey` (the adventure at any checkpoint, e.g. `/dev/journey?levels=3,3,1,0,0`).

## Putting Protégé online for a class (free)

Protégé and the AI run on the teacher's laptop. To let students reach it from their Chromebooks, use a free **tunnel**: it gives the laptop a secure https address. No credit card for either option.

1. Run, in this folder:
   ```
   npm run class
   ```
   It checks that Ollama and Gloam's model are ready, builds Protégé in **real mode** (faster, and test mode and the `/dev` pages don't exist there), starts it, and prints the address for students with a QR code. Students on the same Wi-Fi can use that address straight away.
2. For students anywhere else, add a tunnel: `npm run class -- --tunnel` starts one for you if Tailscale or cloudflared is installed. To set one up:
   - **Tailscale Funnel** (a fixed address, needed for Google sign-in): install [Tailscale](https://tailscale.com/download) (free personal plan), sign in, then run `tailscale funnel 3000`. The first time, it gives you a link to switch Funnel on. Your address looks like `https://your-laptop.your-tailnet.ts.net`.
   - **Cloudflare quick tunnel** (no account at all, but the address changes every time): install [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/), then run `cloudflared tunnel --url http://localhost:3000`.
3. On your class page, press **Show the code** and put it on the projector. Students open the address (or scan the QR code), type the class code, pick a nickname and 3 secret pictures (2 for K–2). Their nicknames pop up on the screen as they arrive. Next time, they tap their nickname and their pictures, on any Chromebook.

Everyone on the same Wi-Fi as the laptop can skip the tunnel: the code screen shows the laptop's school-network address.

The laptop has to stay on and awake during class, because it runs the AI.

Everything is internet-safe: sign-ins are rate-limited and lock after too many wrong tries, cookies are `Secure` over https, and every change has to come from Protégé's own pages.

## Google sign-in (optional)

"Continue with Google" appears once three settings are in `.env.local` (see `.env.example`). Making them takes about 10 minutes and is free.

1. Get a fixed https address with Tailscale Funnel (above), and set `PUBLIC_URL` to it.
2. Go to [console.cloud.google.com](https://console.cloud.google.com), sign in, and make a new project called "Protégé".
3. **APIs & Services → OAuth consent screen**: pick **External**, app name "Protégé", add your email. Scopes: just `openid` and `email`, which don't need Google's review.
4. **APIs & Services → Credentials → Create credentials → OAuth client ID**: type **Web application**. Under **Authorized redirect URIs** add `https://<your address>/api/auth/google/callback`.
5. Copy the client ID and secret into `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, then restart Protégé.

While the consent screen is in "Testing", only the Google accounts you list as test users can sign in. Press "Publish app" when you're ready for everyone.

- **Teachers** sign in with Google instead of a password. A new teacher still needs an invite code (they type it first).
- **Students** only get the Google button if their teacher switches it on for the class, and only if the school allows it. Protégé asks Google for nothing but a scrambled account id. No name, email or photo. The student still picks a nickname.

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
- Students are nicknames only. No real names, emails or birthdays are collected. Their picture key is stored scrambled (hashed), like a password.
- Students who use Google: only a scrambled (keyed hash) Google account id is stored, never their name, email or photo.
- Teachers: their email, name, and a scrambled password and recovery code. No passwords are ever stored as they were typed.
- The database is a file on this computer, in the app-data folder: `%LOCALAPPDATA%\Protege\protege.db` on Windows (`~/.local/share/Protege` on Mac/Linux). Set `PROTEGE_DATA_DIR` to keep it somewhere else. Delete it to wipe everything. (It lives outside the project folder because the dev server reloads the page whenever a file inside the project changes.)
- No analytics, no trackers, no third-party scripts. Fonts are downloaded once at build time and served from this computer.

## Troubleshooting
- **The page keeps reloading by itself (while developing):** stop `npm run dev`, delete the `.next` folder, and start it again.
- **Students on the school Wi-Fi can't open the address:** the first time, Windows asks whether Node.js may use the network. Allow it on private networks. Some school networks block devices from reaching each other; then use a tunnel.
- **Forgot the setup code:** it's in `SETUP-CODE.txt` in the database folder, and printed again every time Protégé starts until the first account exists.
- **A teacher forgot their password and lost the recovery code:** on the laptop running Protégé, run `npm run reset-teacher -- their@email`. It prints a new recovery code; they use it with "Forgot your password?". Only someone at the laptop can do this.
- **A student forgot their pictures:** the teacher opens the class and presses "Reset pictures" next to that student. The student picks new ones next time.
