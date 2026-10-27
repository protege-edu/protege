# Privacy impact assessment: Protégé (draft for school boards)

This is a **pre-filled draft**. The facts about how Protégé works are filled in. The parts only a school board
can decide are marked **[Board to complete]**. It follows the shape of an Ontario MFIPPA privacy impact
assessment (written PIAs become mandatory for institutions from January 1, 2027, under Bill 97's amendments).
It is also organized so the same answers can feed a Québec *évaluation des facteurs relatifs à la vie privée*
(Access Act s. 63.5) or a GDPR data protection impact assessment (Art. 35).

It is not legal advice. The board's privacy officer and legal counsel decide whether it's complete.

---

## 1. The project

| | |
|---|---|
| Name | Protégé (version 0.1) |
| What it is | A classroom web app where students learn by **teaching** an AI companion, "Gloam", who is confused about the lesson. Students explain ideas in their own words; Gloam asks questions and slowly understands. Teachers see which ideas each student explained well and where they got stuck. |
| Who uses it | Students in grades K–12, and their teachers |
| Who makes it | Open-source software (GNU AGPL v3). The makers receive **no** data from schools. |
| Who runs it | **[Board to complete]**: the board's IT department, on a board-managed computer (recommended, see `hosting-for-boards.md`), or a school |
| Program owner / contact | **[Board to complete]** |
| Legal authority to collect | **[Board to complete]**: typically the *Education Act* (duties of teachers and boards to deliver the curriculum and assess learning) and MFIPPA s. 28(2) (collection necessary to the proper administration of a lawfully authorized activity) |

## 2. What information, and why (data minimization)

See `data-inventory.md` for every field. In short:

- **Students:** a nickname (students are told not to use their real name), the class, a scrambled picture
  key (or a scrambled Google account number, only if the teacher turns Google on), their conversations with
  Gloam, the AI's estimate of how well they explained each idea, their accessibility settings, and dates.
- **Teachers:** email, name, scrambled password and recovery code; the lessons they create.
- **Not collected:** real names, birthdays, photos, addresses, phone numbers, location, device identifiers,
  and anything from outside Protégé. No analytics, ads or tracking.

**Is each item necessary?** The nickname, class and sign-in key are needed to give each student their own
companion across devices. The conversations and the AI's estimates are the learning activity itself, and
what the teacher uses instead of a quiz. Accessibility settings are needed to provide the accommodations.
Dates are needed for "carry on where you left off" and for retention.

## 3. How information flows

1. A student opens the Protégé address on a school Chromebook, types the class code, picks a nickname and
   a picture key.
2. What they type goes to the computer running Protégé over the school network (or over an encrypted
   tunnel, if the board allows remote access, see section 6).
3. On that computer, a safety filter checks it, a local AI model (Ollama) judges which ideas were explained,
   and writes Gloam's reply. **No information leaves that computer.**
4. The result is saved in a database file on that computer, and copied to a daily backup next to it.
5. The teacher signs in on the same computer (or the school network) to see their class.

Voice typing (optional): a short recording goes to the same computer, is turned into words by whisper.cpp,
and is discarded. The words go back to the student to check before sending.

Read-aloud in Gloam's voice (optional): the words on the student's screen go to the same computer, which
turns them into sound with Kokoro. The sound is kept in memory for up to an hour, so a line the whole class
hears is made once, and is never written to disk.

## 4. Use and disclosure

- **Used for:** the student's learning activity, and the teacher's view of each student's understanding.
- **Not used for:** grading (the AI's estimates are explicitly not marks, and teachers can correct them),
  advertising, profiling beyond the class, training any AI model, or anything outside the classroom.
- **Disclosed to:** nobody outside the board, except as in section 6 (Google, if the teacher turns it on; the
  tunnel provider, if used).
- **Third-party software notice** (Ontario O. Reg. 52/26 under EDSTA): **[Board to determine]** whether
  Protégé, run by the board itself, is a "third-party software application". If Google sign-in or a tunnel
  is used, those providers are third parties. A ready-to-fill notice is in `family-notice.md`.

## 5. Safeguards

**Technical** (see `security.md`):
- No vendor cloud; the AI runs locally.
- Passwords and picture keys stored scrambled (scrypt).
- Signed, `HttpOnly` cookies.
- Rate limits and lock-outs on every sign-in.
- Each teacher sees only their own classes.
- A strict content-security policy (no third-party code).
- Every change must come from Protégé's own pages.
- An access log of who viewed or changed a student's information.
- Safety filtering of what students type, with in-character redirection and a care response for students
  in distress.

**Physical and administrative:** **[Board to complete]**: who can use the computer running Protégé; full-disk
encryption (for example BitLocker); where backups are kept; staff training; the board's acceptable-use and
records-retention policies.

## 6. Risks and what reduces them

| Risk | Likelihood / impact | What reduces it | Remaining risk |
|---|---|---|---|
| A student types personal or sensitive information (their real name, something about home) | Medium / medium | Students are told not to use real names; nicknames that look like emails or phone numbers are refused; Gloam stays on topic and points students to a trusted adult if something worrying is said; teachers can delete it | Low–medium **[Board to rate]** |
| The computer running Protégé is lost or stolen | Low / high | Run it on a board-managed computer with full-disk encryption; data never leaves that computer | **[Board to rate]** |
| Someone guesses a student's picture key | Low / low | Lock-out after repeated wrong tries; teachers can reset keys | Low |
| A teacher sees another class | Low / medium | Every teacher route checks ownership; tested automatically | Low |
| The AI misjudges a student's understanding | Medium / low | Estimates are labelled as estimates, never marks; teachers read the conversation and correct candles; the end-of-lesson recap comes from the teacher-approved lesson, not the AI | Low |
| The AI says something inappropriate | Low / medium | Teacher-approved lessons only; safety filters before and after the AI; the AI never sees the answers, so it can't give them away; hand-written lines for sensitive moments | Low |
| Remote access exposes data to a third party | Depends on the tunnel | School network by default; Tailscale Funnel keeps traffic encrypted to the computer; Cloudflare's quick tunnel is refused unless the school allows it | **[Board to rate]** |
| Information kept longer than needed | Medium / medium | The board's retention rule runs every day; backups expire after 7 days; practice data after 30 days | Low |
| Accessibility settings reveal a disability | Low / medium | The teacher never sees a student's own settings, only accommodations the teacher set | Low |

## 7. Retention and disposal

The board sets one rule (see `data-inventory.md`). The default deletes a class and all its students'
information a year after the class was last used, which meets MFIPPA Reg. 823 s. 5's one-year minimum
unless the board sets a different period by by-law or resolution. **[Board to confirm the period, and whether
teacher-initiated deletion fits the board's records schedule.]**

## 8. Individuals' rights

- **Access:** the teacher downloads everything about one student (**Download their data**).
- **Correction:** nickname and candles can be corrected by the teacher.
- **Deletion:** **Remove from class** deletes a student and everything they did.
- **Complaints:** **[Board to complete: the board's privacy contact, and the IPC's address]**.

## 9. Openness

Students are told, in words for their age, that Gloam is an AI, that its candles are an estimate, who reads
what they write, and how to ask to see or delete it (on the title screen, the join screen and in "How this
works"). Families get the notice in `family-notice.md`. The code is public, so anyone can check how it works.

## 10. AI-specific assessment

See `ai-transparency.md` (an algorithmic impact assessment, as recommended by Canada's federal, provincial
and territorial privacy commissioners' 2025 resolution on ed-tech).

## 11. Breaches

See `breach-response.md`. Under MFIPPA as amended (from January 1, 2027), the board reports breaches with a
real risk of significant harm to the IPC and to the people affected, and keeps a breach log.

## 12. Sign-off

| Role | Name | Date |
|---|---|---|
| Privacy officer | **[Board to complete]** | |
| IT security | **[Board to complete]** | |
| Program owner | **[Board to complete]** | |
