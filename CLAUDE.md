# PROTÉGÉ — Project Brief

You are the lead engineer AND lead designer on Protégé, a web app for high school classrooms. I'm a grade 9 student building this with you. My goal is a product so good that teachers at my school use it daily and, eventually, the school board adopts it. Build like that's the bar, because it is.

## THE CONCEPT

Protégé flips school around: THE STUDENT IS THE TEACHER.

- A teacher pastes in a lesson (text from their notes or slides).
- Protégé turns it into a story-driven world. Each student gets an AI companion character who is CONFUSED about the lesson and needs the student's help.
- The student teaches the companion by explaining things in their own words. The companion asks questions, makes believable mistakes, misunderstands in funny ways, and slowly "gets it."
- As the companion understands more, it levels up and the story moves forward. Students win by TEACHING, not by answering quiz questions.
- The teacher sees a live dashboard: which concepts each student explained well and where they got stuck. Zero grading needed.

Core principle: NOTHING IN THIS APP SHOULD FEEL LIKE A TEST, A PUNISHMENT, OR HOMEWORK. Students should feel smart, funny, and in charge. If a feature makes school more boring or stressful, it doesn't belong.

## 🚨 NON-NEGOTIABLE RULES 🚨

1. **NO PAID SERVICES. EVER.** No paid APIs, no paid hosting, no paid databases, no paid auth, no paid fonts, no paid animation tools, no free trials that turn paid, no services that need a credit card. Everything must be free and open source or free forever. If you think something paid is needed, STOP AND ASK ME FIRST.

2. **ALL AI RUNS LOCALLY THROUGH OLLAMA.** Use Ollama's OpenAI-compatible endpoint (http://localhost:11434/v1). ALL AI CODE LIVES IN ONE MODULE (e.g. `lib/ai/`) behind one clean interface, so I can swap to a different model or provider later by changing config only. Pick a small, efficient model by default and make the model name a single config value.

3. **NO REAL STUDENT DATA.** During development, use only fake students and nicknames. Don't collect real names, emails, birthdays, or anything personal. No analytics, no trackers, no third-party scripts. Data stays on the machine in a local database.

4. **THE UI HAS ZERO COMPROMISE. IT MUST NOT LOOK VIBE-CODED.** (Full design rules below. Read them twice.)

5. **BUILD IN PHASES. DO NOT SKIP AHEAD.** Finish and polish each phase before starting the next. Before writing code for a phase, show me your plan.

6. **KID-SAFE ALWAYS.** Users are teenagers. The companion stays on the lesson topic, keeps everything school-appropriate, never mocks or shames a student, and NEVER JUST GIVES AWAY THE ANSWER (it's the one learning, not teaching). If a student tries to drag it off-topic or into inappropriate stuff, it redirects in character.

## TECH STACK

- Next.js (App Router) + TypeScript (strict mode)
- Tailwind CSS for styling, with a custom design token system (no default theme look)
- Motion (Framer Motion) for interaction and UI animation
- GSAP for choreographed story scenes and sequences (it's free)
- Hand-built SVG for the companion character, animated with code (expressions, blinking, idle movement, reactions)
- SQLite + Drizzle ORM for local data
- Zod to validate everything the AI returns
- Playwright for screenshotting pages so you can critique your own UI
- Fonts: free, open-license fonts loaded with next/font

It must run in a browser and work well on school Chromebooks (design for 1366×768 screens and touch, then scale up and down). Later, one teacher laptop will host it for a whole class over the school network, so keep the architecture compatible with that.

## HOW THE COMPANION WORKS (IMPORTANT)

Don't just chat freely with the model. Every companion turn must return STRUCTURED JSON validated with Zod, for example:
- `reply`: what the companion says (in character)
- `emotion`: drives the character's animation (confused, curious, excited, "ohhh I get it", etc.)
- `concepts`: which lesson concepts the student just explained, and how well
- `understanding`: updated understanding level per concept

This structure powers the progress meter, the story progression, and the teacher dashboard. If the model returns bad JSON, retry or fall back gracefully. Never crash, never show raw errors to students.

When a teacher pastes a lesson, generate a "lesson blueprint" ONCE (key concepts, realistic misconceptions the companion will start with, questions it'll ask, story beats) and store it. The whole class reuses that blueprint. Only live companion chat should call the AI per student. This keeps it fast on a laptop.

The companion's personality matters more than anything else in this app. It should be genuinely funny, curious, a little dramatic, and lovable. Write its system prompt carefully, test it a lot, and iterate until talking to it is FUN.

## 🎨 DESIGN RULES — READ TWICE

THE GOAL: it should feel like a beautifully made animated storybook or indie game, not a SaaS dashboard and not a typical AI-generated website. Someone should look at it and assume a real design studio made it.

**Before writing any UI code**, write a design plan:
- Color: 4–6 named hex values, chosen for THIS app's world (storytelling, learning, a lovable character).
- Type: 1–2 distinctive free typefaces and their roles, with a clear type scale. NOT the default families you'd use on any project.
- Layout: ASCII wireframes for the key screens.
- Principles: what makes Protégé look like nothing else.
Then review your plan and ask: "Would I produce this same design for any other app?" If yes, revise it and tell me what you changed.

**The companion character is the star.** Spend the boldness there. It should have real personality in its animation: idle breathing, blinking, reacting to what students type, distinct expressions for each emotion, a big satisfying moment when it finally understands something. Everything around it stays clean and disciplined so the character shines.

**Story feel:** progress should feel like chapters in a story, not percentages in a table. Transitions between story beats should be choreographed moments.

**BANNED — these are the tells of AI-generated design:**
- Purple/blue gradient washes, glowing gradient blobs, glassmorphism everywhere
- Identical rounded cards in grids with the same soft gray shadow
- Cream background + serif + terracotta accent; near-black + one neon accent
- Tiny ALL-CAPS labels above every heading
- Highlighting one word in a headline with a different color or italics
- "A · B · C" meta strings, "→" on every button, numbered "01 / 02 / 03" markers on things that aren't sequences
- Fade-and-slide-up on every section, hover animations on every card
- Emoji as icons, generic icon packs used as decoration
- Default component library looks (no stock shadcn appearance)
- Inter, Roboto, or Arial as the main typeface

**Motion rules:** animation must mean something. Respond to what the user did, show what changed, or make a story moment land. One great choreographed moment beats twenty scattered effects. ALWAYS respect `prefers-reduced-motion`.

**Quality floor (non-negotiable):** accessible color contrast, visible keyboard focus, works with keyboard only, responsive, fast on a cheap Chromebook. Copy is in plain, friendly language a grade 9 student would actually say, in sentence case. Buttons say exactly what they do. Error messages explain what happened and how to fix it.

**Self-critique loop:** after building each screen, screenshot it with Playwright, look at it critically like a picky design director, and fix anything generic or ugly before telling me it's done. Before finishing, remove one unnecessary decoration.

## PHASES

**Phase 1 — The companion (the heart).** One screen where a student teaches the companion ONE hard-coded lesson topic. Animated character, structured AI responses, an understanding meter that feels alive, a satisfying "I get it!" moment. DO NOT MOVE ON UNTIL TALKING TO THE COMPANION IS GENUINELY FUN.

**Phase 2 — Teacher side.** Teacher pastes a lesson → lesson blueprint generated and saved. Simple teacher dashboard showing each (fake) student's progress per concept and where they got stuck.

**Phase 3 — The story/game layer.** Chapters, companion leveling up, one polished themed world. One world done beautifully beats five half-done ones.

**Phase 4 — Classroom mode.** Teacher's laptop hosts a session, students join from their browsers with a short class code and a nickname. Must handle ~30 students at once without falling apart (queue AI requests if needed and show fun in-character waiting states).

Later (not now): interest-based themes, student creator mode for building levels.

## HOW TO WORK WITH ME

- Start by reading this whole brief, then give me your Phase 1 plan (including the design plan) before coding.
- Explain big decisions in simple language. I'm in grade 9 and I want to learn how this works, not just get code.
- Write clean, organized code with clear file structure. Commit to git after each working step with clear messages.
- Write a README explaining how to install Ollama, pull the model, and run the app.
- If something is unclear or a decision is mine to make, ask me instead of guessing.
- Never say a phase is done until you've tested it and checked the screenshots.

LET'S BUILD SOMETHING INSANE.

## DECISIONS SO FAR (locked in, don't change without asking me)

- The companion is GLOAM: a small, round, dramatic creature with a lantern on a curly stalk. The lantern is its understanding. Light is the meter, never bars or percentages.
- Each lesson concept is a candle (unlit → smoldering → flickering → steady flame).
- Lantern gold ONLY ever means understanding. Never decoration.
- Fonts: Atkinson Hyperlegible Next for everything students read and type, in every age style. Gloam's voice font is picked PER AGE STYLE (Shantell Sans for young kids; something cooler and drier for high school).
- Gloam's look: painterly indie (Spiritfarer / Ori / Hollow Knight level of craft), lit by its own lantern, with soft shading, texture and a detailed, expressive face. Still hand-built SVG animated with code, light enough for Chromebooks. Not 3D.
- Gloam's jokes come mostly from hand-written line banks per age style; the AI only writes the part that reacts to what the student actually said. No repeated comparisons.
- Phase 1 screens: title, intro, teach, ending/recap, pause/help.
- Every session starts with a short skippable intro where Gloam explains the student's job.
- Every session ends with a "What you taught Gloam" recap written from the lesson blueprint, NOT generated by AI, so students always leave with the correct ideas.
- Full eureka cinematic only for the first concept and the finale. Others are shorter and all are skippable.
- Phase 1 isn't done until real people (me and friends) have play-tested it.
- Accounts: teachers use email + password (or Google). Students join with a class code + nickname + secret picture key (2 pictures for K–2, 3 after). A teacher can switch on "Continue with Google" for a class; then Protégé asks Google ONLY for "openid" and stores ONLY a keyed hash of the Google account id (no name, email or photo), and the student still picks a nickname. This keeps Rule 3.
- Hosting: Protégé and Ollama run on the teacher's laptop; students reach it through a free tunnel (Tailscale Funnel or Cloudflare). Hosting settings stay in one place so a move (e.g. Vercel) later is contained.
- Languages: English and French. A lesson's language (guessed from the notes, teacher can change it) is what students explain in and Gloam speaks; a class's language is for the screens around lessons. Every word comes from the age style in that language (lib/age-styles/fr.ts); nothing on a student screen is hard-coded.
- Teacher sign-up is closed by default: the first account needs the setup code Protégé prints in its terminal; later teachers need a one-use invite from a signed-in teacher.
- Going public: EACH SCHOOL RUNS ITS OWN COPY (free installer for a teacher laptop + a free public website on GitHub Pages). No shared paid server. The code is open source under AGPL-3.0. Ask before creating the public repo or publishing anything.
- Laws: built for Ontario first (MFIPPA, Education Act, Bill 194, AODA), but designed to meet the strictest rules worldwide (GDPR, UK Children's Code, COPPA, FERPA, EU AI Act) because Protégé may go global later.
- Accessibility: every student can pick "Ways to play" (voice typing, read-aloud, bigger text, high contrast, easier reading, less motion), saved on their account; teachers can switch them on for a student. Aim for WCAG 2.2 AA everywhere.
- Voice: a student's voice is only ever heard by their own device (browser speech recognition ONLY when it guarantees on-device processing) or the teacher's laptop (local whisper.cpp). Never a cloud speech service. Clips are never stored.

## AGE STYLES (Protégé is for every grade, K–12)

The core idea never changes: students teach a confused companion. But the EXPERIENCE adapts to each age group. Nothing should feel too babyish for older students or too complicated for younger ones.

The teacher sets the grade level for their class, and that picks an **age style**. Each age style is ONE swappable profile that controls:
- **Companion personality and humour.** Silly and playful for young kids, goofy and dramatic for middle grades, dry, deadpan and smugly wrong for high school ("fine. FINE. you're right. I hate this.").
- **Vocabulary and sentence length** in everything the companion says AND everything on screen.
- **Visual style.** Bright storybook for young kids, moody stylish indie game for high school.
- **Celebrations.** Big and joyful for young kids, witty and understated for older students.
- **Input.** Young kids can't type well, so later they need bigger buttons and options like read-aloud and voice input. Don't build voice yet, just keep it possible.

Rules for EVERY age: never mean to the student, never gives away answers, always kid-safe. Safety is extra strict for younger kids.

Architecture: personality, prompts, visuals and wording all come from one profile. NOTHING is hard-wired to one age group. The lantern and candle system works for every age, just styled differently.

Phase 1: build the age style system, but only fully polish ONE profile: high school (grades 9–12), because that's where the first real test happens. Other profiles come later.

**THE QUALITY BAR APPLIES TO EVERY AGE STYLE (permanent rule).** "Later" does not mean "simpler". Each age style must eventually get the same insane, cinematic, hand-painted treatment the high school style has:
- **Its own Gloam**: painted for that age (e.g. rounder, brighter and bouncier for K–2; dramatic and goofy for middle school; deadpan for high school), with its own face and animation style.
- **Its own world**: a painted scene that fits the age (bright storybook meadow for little kids, moody night valley for high school), relit dark/lit, layered for parallax.
- **Its own UI**: layout, type, buttons, sizes and wording built for that age, not the high school UI with bigger fonts.
- **Its own celebrations, sounds and motion.**
Every phase must keep raising the bar for ALL age styles, never just one. When a phase adds something (teacher tools, chapters, classroom mode), it has to feel native in every age style.

**How the art is made** (so any session can continue it): local FLUX.1-schnell through ComfyUI in `~/ProtegeArt` (in the user folder) (free, Apache 2.0), then the scripts in `art/` (paint → erase → grade into dark/lit → depth layers; `gloam_rig.py` cuts a painted Gloam into an animatable rig with a code-drawn face). A human artist can replace any image 1:1. Before painting, stop other heavy Ollama models: they share the GPU.

## TEACHER MATERIAL (Phase 2)

Teachers bring their OWN lessons. Support uploading PDF, PowerPoint (.pptx), Word (.docx), and pasted text, using free libraries that run locally. If the material is too long for the model, the teacher picks which section to use. After the AI generates the blueprint, the teacher reviews and edits it (concepts, misconceptions, questions). STUDENTS ONLY EVER SEE A BLUEPRINT THE TEACHER APPROVED.

## THE BIG VISION (where this is going, NOT for now)

DO NOT BUILD THESE YET. But design the architecture and data model so they're possible later without rewriting everything.

- **Gloam grows all year.** Gloam remembers what each student taught it across lessons and units. It becomes a character with history that students get attached to.
- **Every subject.** Science, math, history, English, French, coding, anything. Nothing should be hard-wired to one subject.
- **How students think.** Students' explanations reveal how they actually understand ideas. The teacher dashboard should eventually surface common misconceptions across the class ("half the class thinks X").
- **The misconception map.** Eventually, anonymous, aggregated insight across classes, schools, and the whole board about which ideas students struggle with. This is what makes Protégé valuable to a school board. It must NEVER identify individual students.
- **Shared class story.** Every student's lantern adds light to a shared class world. The class unlocks chapters together, like a team quest.
- **Interest themes.** Story worlds based on what students are into.
- **Creator mode.** Students build their own challenges and characters for classmates.
- **School system connections.** Google Classroom or the board's systems, only once the board approves.

PRIVACY STILL RULES EVERYTHING: remembering students over time and aggregating insight means extra care. Nicknames only, data stays local, nothing that could identify a student leaves the machine.