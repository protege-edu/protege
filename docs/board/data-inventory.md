# Protégé data inventory

Every piece of information Protégé keeps, why it's kept, who can see it, where it lives, and when it's deleted.
This document covers version 0.1. It is written from the database schema (`lib/db/schema.ts`), so if this
document and the code ever disagree, the code is right and this document has a bug.

**All of this is personal information.** Students use nicknames, not real names. But a class-scoped
nickname, plus what a student writes and how well they explained each idea, is still information about an
identifiable student (MFIPPA; the Ontario Ministry's EDSTA guidance names "academic work" and
"information that apps collect about a student"). Protégé is designed to collect as little as possible. It does not
claim to be anonymous.

## Where it lives

- **One database file** on the computer running Protégé: `%LOCALAPPDATA%\Protege\protege.db` on Windows,
  `~/.local/share/Protege/protege.db` on Mac and Linux (or wherever `PROTEGE_DATA_DIR` points).
- **Daily backups** of that file, in the `backups` folder next to it. The last 7 days are kept.
- **Nothing is sent to the people who make Protégé.** There's no vendor server, no analytics, no crash
  reporting, no ads and no tracking. The AI and voice typing run on the same computer.

## Students

| What | Example | Why | Who sees it | Deleted |
|---|---|---|---|---|
| Nickname | "Moss Otter" | So the student and their teacher know whose Gloam it is. Checked against a safety filter. Students are told not to use their real name, and anything that looks like an email or phone number is refused. | The student, their teacher | With the student or class |
| Class | "Science 9, period 2" | Which teacher and lessons they belong to | Their teacher | With the class |
| Picture key, scrambled | a scrypt hash | Signing in without an email or password. It can't be turned back into the pictures. | Nobody (it's a hash) | With the student |
| Google account number, scrambled (only if the teacher allowed Google for the class) | a keyed HMAC hash | Signing in with a school Google account. Protégé asks Google only for `openid`, so it gets no name, email or photo. | Nobody (it's a hash) | With the student |
| Wrong picture tries, lock-out time | 2, 10:42 | Stops someone guessing another student's pictures | Nobody (used by the sign-in check) | Reset on a good sign-in |
| Conversations with Gloam | "it's because the earth is tilted…" and Gloam's replies, with times | So the student can carry on where they left off, and the teacher can see how they think | The student, their teacher | With the student or class |
| Candle levels per idea (0 to 3) and the order ideas were lit | the tilt: lit | The student's journey and the teacher's dashboard. These are the AI's **estimate**, not a mark. The teacher can correct them. | The student, their teacher | With the student or class |
| Candle history (each time an explanation was judged) | wrong → partial, 10:15 | The teacher's "stuck" flags and class-wide "what the class thinks" | Their teacher (as counts and flags) | With the student or class |
| Gloam's level (ideas taught, lessons finished) | 12 ideas, 3 lessons | Gloam grows across the year | The student, their teacher | With the student |
| Ways to play the student chose (voice typing, read-aloud, text size, contrast, easier reading, less motion, sound) | bigger text | So their settings follow them to any Chromebook. These can hint at a disability, so **the teacher never sees them**. | The student only (and their own data download) | With the student |
| Ways to play their teacher switched on (an accommodation) | read-aloud | Accommodations from a learning plan. Kept separately, so the teacher sees only what they set. | The student, their teacher | With the student |
| Met Gloam, last seen, joined | dates | Skipping the intro the second time; "online now" on the teacher's screen; retention | Their teacher (as "online now") | With the student |

**Never collected:** real names, emails, birthdays, photos, addresses, phone numbers, location, device
identifiers, contacts, and anything from outside Protégé.

**Voice typing:** a short recording goes from the Chromebook to the computer running Protégé, and whisper.cpp
turns it into words there. The recording is held in memory for those few seconds and **never saved, logged
or sent anywhere else**. The words go into the student's text box for them to check before sending. If the
browser can do speech recognition on the device itself (only when it promises to stay on the device),
nothing is sent at all.

**Read-aloud in Gloam's voice:** the words on the student's screen (Gloam's line, a join step, the recap) go
to the computer running Protégé, which makes the sound there and sends it back. To avoid making the same line
30 times, the sound of a line is **kept in memory for up to an hour** (never on disk, never logged), then
forgotten. It's also forgotten whenever Protégé restarts. Nothing else is kept.

## Teachers

| What | Why | Deleted |
|---|---|---|
| Email, name | Signing in; telling teachers apart | When removed by whoever runs Protégé |
| Password, scrambled (scrypt) | Signing in | (same) |
| Recovery code, scrambled | Getting back in without email (Protégé sends no email) | (same) |
| Google account number, scrambled (if they use Google) | Signing in with Google | (same) |
| Wrong password tries, lock-out time | Stops password guessing | Reset on a good sign-in |
| Lessons they made: their notes, Gloam's draft, what they approved | Gloam teaches from the approved version | When the teacher deletes the lesson |
| Units: a name and the file's name, grouping the lessons made from one upload | Drafting long notes as several lessons, in order | When the teacher deletes the unit (or its last lesson) |

## Records of what teachers do with students' information

| What | Why | Deleted |
|---|---|---|
| Access log: which teacher viewed a conversation, downloaded or changed a student's data, corrected candles, removed a student or deleted a class, and when (ids only, never content) | Safeguards; looking into a privacy concern or breach | After two years |

Whoever runs Protégé reads it on that computer: `launch.js --access-log` in the download, or `npm run access-log` from the code.

## On the student's device (the browser)

| What | Why |
|---|---|
| A signed sign-in cookie (the student's id), `HttpOnly`, `SameSite` and `Secure` over https | Staying signed in to their class |
| Which session they're in for each lesson; their Ways to play | Carrying on; showing their settings before the page loads |
| In practice mode only: a random practice id | Gloam remembering practice lessons on that device |

There are no third-party cookies and nothing else stored.

## Only in memory (never written down)

- Rate-limit counters (they include the network address requests come from), so nobody can flood sign-ins
  or the AI. Forgotten within an hour, and whenever Protégé restarts.
- Voice recordings, while being turned into words.
- Which students are waiting for the AI.

## How long things are kept

The school board picks one rule (`PROTEGE_RETENTION`, set by whoever runs Protégé):

| Rule | What happens |
|---|---|
| `after-a-year` (default) | A class and all its students' information are deleted **a year after the class was last used**. Ontario's MFIPPA (Reg. 823, s. 5) asks for personal information that was used to be kept at least a year unless the board sets a different period. |
| `end-of-school-year` | Each new class is deleted at the end of the school year (`SCHOOL_YEAR_END`, June 30 by default). |
| `never` | Kept until a teacher deletes it. |

Also:
- A teacher can set a delete date for any class, or delete a class, a student or one student's
  information at any time (subject to the board's records rules).
- Practice mode (no class, no nickname but "Test Pilot") is deleted after 30 days without use.
- Backups keep the last 7 days, so anything deleted is gone from backups within a week.
- The access log is kept for two years.

## Requests to see or correct information

- **See:** the teacher opens the student on the class page and presses **Download their data**. They get
  everything above about that student, in plain words, as one file. The picture key is never included,
  because it can't be read back.
- **Correct:** the teacher can change the student's nickname, and correct any candle.
- **Delete:** **Remove from class** deletes the student and everything they did.

## Who else could see anything

- **Google**, only if a teacher allows "Continue with Google" for a class. Google then knows that account
  signed in to this Protégé. Protégé gets no name, email or photo.
- **The tunnel provider**, only when a teacher starts **Protégé online** (for a school network that keeps
  devices apart). By default that's a **Cloudflare quick tunnel**: Cloudflare's servers decrypt the traffic
  as it passes (students' nicknames and what they type), store nothing Protégé knows of, and the address
  changes every time. Protégé says so every time it opens one, and on the teacher's "Ready for class?" page.
  A school can use its own fixed tunnel instead (e.g. **Tailscale Funnel**, which stays encrypted all the way
  to the computer) by setting `PUBLIC_URL`. On a school network where devices can reach each other, no tunnel
  is needed at all.
- **Ollama, whisper.cpp, Kokoro and the models** run on the same computer. They don't send anything anywhere.
