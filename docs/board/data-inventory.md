# Protégé data inventory

Every piece of information Protégé keeps, why it's kept, who can see it, which company holds it, and when it's
deleted. This document covers version 0.6, the hosted version. It is written from the database schema
(`lib/db/schema.ts`), so if this document and the code ever disagree, the code is right and this document has
a bug.

**All of this is personal information.** Students use nicknames, not real names. But a class-scoped
nickname, plus what a student writes and how well they explained each idea, is still information about an
identifiable student (MFIPPA; the Ontario Ministry's EDSTA guidance names "academic work" and
"information that apps collect about a student"). Protégé is designed to collect as little as possible. It does not
claim to be anonymous.

## Where it lives

All three companies below are in the **United States**. Details and what a board should check:
[hosting](hosting-for-boards.md).

| Company | Role | What it holds or sees |
|---|---|---|
| **Turso** (database, AWS US East, Virginia) | Stores | Everything in the tables below. Turso also keeps a short point-in-time history of the database, so mistakes can be undone; deleted information stays in that history until it expires. |
| **Vercel** (app hosting, Washington, D.C. region `iad1`) | Processes | Every request passes through it over https, including what students type. Vercel keeps its own request and function logs (network addresses, pages, times) under its terms. Protégé's own log lines never contain what students write: a failed AI turn logs only the kind of error. |
| **Anthropic** (Claude Haiku 5.5, through its API) | Processes | What's marked "sent to Claude" below, and nothing else. Never a nickname, student id, class, teacher or account information. Anthropic doesn't train its models on API data by default. How long it keeps API inputs and outputs is set by its terms (an item for the board to check). |

There are **no analytics, no crash reporting, no ads, no trackers and no third-party scripts** (a strict
content-security policy enforces this). Whoever operates a copy of Protégé holds the accounts for these
companies and can technically reach the database; see the [privacy impact assessment](privacy-impact-assessment.md).

## Students

| What | Example | Why | Who sees it | Sent to Claude? | Deleted |
|---|---|---|---|---|---|
| Nickname | "Moss Otter" | So the student and their teacher know whose Gloam it is. Checked against a safety filter. Students are told not to use their real name, and anything that looks like an email or phone number is refused. | The student, their teacher | **Never** | With the student or class |
| Class | "Science 9, period 2" | Which teacher and lessons they belong to | Their teacher | **Never** | With the class |
| Picture key, scrambled | a scrypt hash | Signing in without an email or password. It can't be turned back into the pictures. | Nobody (it's a hash) | Never | With the student |
| Google account number, scrambled (only if the teacher allowed Google for the class) | a keyed HMAC hash | Signing in with a school Google account. Protégé asks Google only for `openid`, so it gets no name, email or photo. | Nobody (it's a hash) | Never | With the student |
| Wrong picture tries, lock-out time | 2, 10:42 | Stops someone guessing another student's pictures | Nobody (used by the sign-in check) | Never | Reset on a good sign-in |
| Conversations with Gloam | "it's because the earth is tilted…" and Gloam's replies, with times | So the student can carry on where they left off, and the teacher can see how they think | The student, their teacher | **Yes, without any name or id:** the new message and the last few messages of that conversation, when the AI is needed (many turns use hand-written lines and send nothing) | With the student or class |
| Candle levels per idea (0 to 3) and the order ideas were lit | the tilt: lit | The student's journey and the teacher's dashboard. These are the AI's **estimate**, not a mark. The teacher can correct them. | The student, their teacher | Never (worked out by code from the AI's judgement) | With the student or class |
| Candle history (each time an explanation was judged) | wrong → partial, 10:15 | The teacher's "stuck" flags and class-wide "what the class thinks" | Their teacher (as counts and flags) | Never | With the student or class |
| Gloam's level (ideas taught, lessons finished) | 12 ideas, 3 lessons | Gloam grows across the year | The student, their teacher | Never | With the student |
| Ways to play the student chose (voice typing, read-aloud, text size, contrast, easier reading, less motion, sound) | bigger text | So their settings follow them to any Chromebook. These can hint at a disability, so **the teacher never sees them**. | The student only (and their own data download) | Never | With the student |
| Ways to play their teacher switched on (an accommodation) | read-aloud | Accommodations from a learning plan. Kept separately, so the teacher sees only what they set. | The student, their teacher | Never | With the student |
| Met Gloam, last seen, joined | dates | Skipping the intro the second time; "online now" on the teacher's screen; retention | Their teacher (as "online now") | Never | With the student |
| Daily AI use count | student X: 41 messages today | Daily limits, so one student can't run up the cost or flood the service. A count only, never content. | Nobody in the app (the owner sees totals and the busiest classes) | Never | Counts older than 2 days are deleted every day |

**Never collected:** real names, emails, birthdays, photos, addresses, phone numbers, location, device
identifiers, contacts, voice recordings, and anything from outside Protégé.

**Voice typing:** done only by the browser's own speech recognition **on the student's device**, and only when
the browser promises to do it on the device (`processLocally`). If the device can't, the voice typing button
is hidden. No audio is sent to Protégé or anyone else, and none is stored. The words go into the student's
text box for them to check before sending, like typed words.

**Read-aloud:** done only with voices that run **on the student's device** (`localService`). No text or audio
is sent anywhere for it. If the device has no such voice, the button doesn't appear.

## Teachers

| What | Why | Who sees it | Sent to Claude? | Deleted |
|---|---|---|---|---|
| Email, name | Signing in; telling teachers apart | The teacher; other teachers at the same school (in the school's list of who signed up) | **Never** | When the teacher is removed |
| Password, scrambled (scrypt) | Signing in | Nobody (it's a hash) | Never | (same) |
| Recovery code, scrambled | Getting back in without email (Protégé sends no email) | Nobody (it's a hash) | Never | (same) |
| Google account number, scrambled (if they use Google) | Signing in with Google | Nobody (it's a hash) | Never | (same) |
| Which school they signed up with; whether they're the owner | Keeping each school's staff apart | The teacher, teachers at the same school | Never | (same) |
| Wrong password tries, lock-out time | Stops password guessing | Nobody | Never | Reset on a good sign-in |
| Lessons they made: the notes text they chose, Gloam's draft (the lesson blueprint), what they approved | Gloam teaches from the approved version | The teacher; their students see only approved lessons, through Gloam | **Yes:** the chosen notes text, when drafting; the lesson's ideas, with each student turn that uses the AI | When the teacher deletes the lesson, or is removed |
| Units: a name and the file's name, grouping the lessons made from one set of notes | Drafting long notes as several lessons, in order | The teacher | Never (the file's name stays in the database) | When the teacher deletes the unit (or its last lesson), or is removed |
| Daily drafting count | Daily limits on lesson drafting. A count only. | Nobody in the app | Never | Counts older than 2 days are deleted every day |

**Lesson files** (PDF, PowerPoint, Word) are read **in the teacher's browser**. The file is never uploaded.
Only the text the teacher chooses is sent to Protégé (and from there to Claude, to draft the lesson).

## Schools

| What | Why | Who sees it | Deleted |
|---|---|---|---|
| School name | Grouping teachers | The owner; teachers at that school | **[Operator to complete: how a school is removed]** |
| Staff code (12 characters) | How a new teacher proves they work at that school | The owner; teachers at that school | Replaced whenever a teacher there makes a new one |

## Records of what teachers do with students' information

| What | Why | Deleted |
|---|---|---|
| Access log: which teacher viewed a conversation, downloaded or changed a student's data, corrected candles, removed a student or deleted a class, and when (ids only, never content) | Safeguards; looking into a privacy concern or breach | After two years. A removed teacher's entries are kept too. |

Whoever operates Protégé reads it from the code with the database's credentials: `npm run access-log`
(`-- --all` for everything).

## Service secrets and settings

| What | Where | Notes |
|---|---|---|
| The sign-in signing secret (random, made on first start) | The database | Signs cookies, keys the stored Google account hashes, and authenticates the app's internal drafting requests. Anyone with database access could use it to forge a sign-in, so the database token must be protected like a password. |
| The one-time setup code | The database, and the server logs | Only used to make the first (owner) account |
| Claude API key, database token, cron secret | The host's environment variables | Never in the code, the database or the browser |

## On the student's device (the browser)

| What | Why |
|---|---|
| A signed sign-in cookie (the student's id), `HttpOnly`, `SameSite=Lax`, `Secure` | Staying signed in to their class |
| Which session they're in for each lesson; their Ways to play | Carrying on; showing their settings before the page loads |
| In practice mode only: a random practice id | Gloam remembering practice lessons on that device |

There are no third-party cookies and nothing else stored.

## Only in memory (never written down)

- Rate-limit counters (they include the network address requests come from), so nobody can flood sign-ins
  or the AI. Each server copy keeps its own, and they're forgotten within an hour.
- Which students are waiting for the AI.

## How long things are kept

One rule applies to the whole copy of Protégé (`PROTEGE_RETENTION`, set by whoever operates it). On the shared
service, every school gets the same rule: **[Operator to complete: the rule currently set]**. A board that
needs a different rule can run its own copy ([hosting](hosting-for-boards.md)).

| Rule | What happens |
|---|---|
| `after-a-year` (default) | A class and all its students' information are deleted **a year after the class was last used**. Ontario's MFIPPA (Reg. 823, s. 5) asks for personal information that was used to be kept at least a year unless the board sets a different period. |
| `end-of-school-year` | Each new class is deleted at the end of the school year (`SCHOOL_YEAR_END`, June 30 by default). |
| `never` | Kept until a teacher deletes it. |

Also:
- A clean-up job runs every day on Vercel's schedule and applies these rules.
- A teacher can set a delete date for any class, or delete a class, a student or one student's
  information at any time (subject to the board's records rules).
- Removing a teacher deletes their classes (with all their students' information), lessons and units.
- Practice mode (no class, no nickname but "Test Pilot") is deleted after 30 days without use.
- Daily AI use counts are deleted after 2 days.
- The access log is kept for two years.
- Deleted information stays in Turso's point-in-time history for a short time, then is gone for good.
  **[Operator to complete: the length of that history on the plan in use.]**
- What was sent to Claude is kept by Anthropic only as its terms allow. It carries no nickname or id.

## Requests to see or correct information

- **See:** the teacher opens the student on the class page and presses **Download their data**. They get
  everything above about that student, in plain words, as one file. The picture key is never included,
  because it can't be read back.
- **Correct:** the teacher can change the student's nickname, and correct any candle.
- **Delete:** **Remove from class** deletes the student and everything they did.
- **Copies at Anthropic** can't be found or deleted for one student, because nothing sent to Claude says who
  wrote it. They follow Anthropic's retention.

## Who else could see anything

- **The operator** of the copy of Protégé (on the shared service, the Protégé project; on a board's own copy,
  the board). In the app, the owner sees schools, staff codes, counts of AI use and the names of today's
  busiest classes, and teachers see only their own classes. But whoever holds the database token or the
  hosting account can technically read the whole database. **[Operator to complete: who holds those
  accounts, and the rules they follow.]**
- **Vercel, Turso and Anthropic**, as described under "Where it lives".
- **Google**, only if a teacher allows "Continue with Google" for a class. Google then knows that account
  signed in to this Protégé. Protégé gets no name, email or photo.
