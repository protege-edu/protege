# Privacy impact assessment: Protégé (draft for school boards)

This is a **pre-filled draft**. The facts about how Protégé works are filled in. The parts only a school board
can decide are marked **[Board to complete]**, and the parts only whoever operates the service can answer are
marked **[Operator to complete]**. It follows the shape of an Ontario MFIPPA privacy impact assessment (written
PIAs become mandatory for institutions from January 1, 2027, under Bill 97's amendments). It is also organized
so the same answers can feed a Québec *évaluation des facteurs relatifs à la vie privée* (Access Act s. 63.5)
or a GDPR data protection impact assessment (Art. 35).

**This draft replaces the one for version 0.1.** Version 0.1 ran on a school computer with a local AI and sent
nothing to any company. Version 0.6 is a hosted web app that uses three US companies. A board that assessed the
earlier version should assess this one again.

It is not legal advice. The board's privacy officer and legal counsel decide whether it's complete.

---

## 1. The project

| | |
|---|---|
| Name | Protégé (version 0.6) |
| What it is | A classroom web app where students learn by **teaching** an AI companion, "Gloam", who is confused about the lesson. Students explain ideas in their own words; Gloam asks questions and slowly understands. Teachers see which ideas each student explained well and where they got stuck. |
| Who uses it | Students in grades K–12, and their teachers |
| Who makes it | Open-source software (GNU AGPL v3) |
| Who runs it | **[Board to complete]**: the shared service at https://protege-edu.vercel.app, operated by **[Operator to complete: legal name and contact]**, or the board's own copy (see [hosting](hosting-for-boards.md)) |
| Service providers | **Vercel** (app hosting, USA), **Turso** (database, USA), **Anthropic** (Claude AI, USA); optionally **Google** (sign-in) |
| Program owner / contact | **[Board to complete]** |
| Legal authority to collect | **[Board to complete]**: typically the *Education Act* (duties of teachers and boards to deliver the curriculum and assess learning) and MFIPPA s. 28(2) (collection necessary to the proper administration of a lawfully authorized activity) |

## 2. What information, and why (data minimization)

See [data inventory](data-inventory.md) for every field. In short:

- **Students:** a nickname (students are told not to use their real name), the class, a scrambled picture
  key (or a scrambled Google account number, only if the teacher turns Google on), their conversations with
  Gloam, the AI's estimate of how well they explained each idea, their accessibility settings, dates, and a
  daily count of AI messages (deleted after 2 days).
- **Teachers:** email, name, scrambled password and recovery code, their school; the lessons they create
  (the notes text they chose and the drafted lesson).
- **Schools:** name and staff code.
- **Not collected:** real names, birthdays, photos, addresses, phone numbers, location, device identifiers,
  voice recordings, and anything from outside Protégé. No analytics, ads or tracking.

**Is each item necessary?** The nickname, class and sign-in key are needed to give each student their own
companion across devices. The conversations and the AI's estimates are the learning activity itself, and
what the teacher uses instead of a quiz. Accessibility settings are needed to provide the accommodations.
Dates are needed for "carry on where you left off" and for retention. Daily counts are needed to cap cost and
abuse. The staff code is needed because teachers and students share the school's email domain, so an email
address can't show who is a teacher.

**Minimizing what goes to the AI.** Only the student's message, the last few messages of that conversation,
Gloam's instructions and the lesson's ideas are sent to Claude. The nickname, student id, class, teacher and
any account information are never sent. Many turns use hand-written lines and send nothing.

## 3. How information flows

1. A student opens the Protégé address (its `/j` page, where they type the class code) on a school
   Chromebook, types the class code, picks a nickname and a picture key.
2. What they type goes over https to the app on **Vercel** (Washington, D.C., USA).
3. On the server, a code safety filter checks it. Messages that fail never reach the AI. If the AI is needed,
   the message, the last few messages and the lesson's ideas go to **Anthropic's API** (USA), which judges
   which ideas were explained and writes Gloam's reply. The reply is checked again by code before the student
   sees it.
4. The result is saved in the **Turso** database (AWS US East, Virginia, USA).
5. The teacher signs in from any browser to see their class.

When a teacher drafts a lesson, their file is read in their own browser. Only the text they choose goes to the
app and then to Claude, which drafts the lesson. The teacher reviews and approves it before students see it.

Voice typing and read-aloud (optional) run on the student's own device. No audio leaves the device.

## 4. Use and disclosure

- **Used for:** the student's learning activity, and the teacher's view of each student's understanding.
- **Not used for:** grading (the AI's estimates are explicitly not marks, and teachers can correct them),
  advertising, profiling beyond the class, training any AI model, or anything outside the classroom.
  Anthropic does not train its models on API data by default.
- **Disclosed to:** the service providers in section 1, to provide the service:
  - **Vercel** processes every request.
  - **Turso** stores the database.
  - **Anthropic** receives what's described in section 2, without identifiers.
  - **Google**, only if the teacher turns on "Continue with Google".
  - **The operator** of the service holds the accounts with these providers and can technically reach the
    database (see section 6).
- **Outside Canada:** all three main providers are in the United States. **[Board to determine]** whether
  this is allowed by board policy and by any contract. Information held by US companies can be subject to US
  legal process.
- **Third-party software notice** (Ontario O. Reg. 52/26 under EDSTA): **[Board to determine]** whether
  Protégé is a "third-party software application". On the shared service, it is operated by someone other than
  the board, and Vercel, Turso and Anthropic are third parties in any case. A ready-to-fill notice is in
  [family-notice.md](family-notice.md).

## 5. Safeguards

**Technical** (see [security.md](security.md)):
- HTTPS everywhere; secrets (API key, database token, cron secret) only in the host's environment variables.
- Passwords and picture keys stored scrambled (scrypt).
- Signed, `HttpOnly`, `SameSite=Lax` cookies.
- Rate limits and lock-outs on every sign-in; daily AI limits per student, class, teacher and service.
- Each teacher sees only their own classes.
- Teacher sign-up only with a school's staff code.
- A strict content-security policy (no third-party code, no analytics or trackers).
- Every change must come from Protégé's own pages.
- An access log of who viewed or changed a student's information.
- Safety filtering of what students type and of Gloam's replies, with in-character redirection and a care
  response for students in distress.
- Nothing identifying is sent to the AI.

**Contractual:** **[Operator to complete, Board to review]**:
- Any agreement between the board and the operator.
- The terms and data processing addenda of Anthropic, Vercel and Turso: retention of API inputs and outputs and
  of logs, encryption at rest, subprocessors, breach notification to the operator, and cross-border transfer.
- Whether Anthropic's usage policy places conditions on services used by minors, and whether they're met.

None of these is described here as done.

**Administrative:** **[Board to complete]**: who gives out staff codes and how; staff training; the board's
acceptable-use and records-retention policies; who at the board is the contact for the operator.

## 6. Risks and what reduces them

| Risk | Likelihood / impact | What reduces it | Remaining risk |
|---|---|---|---|
| Students' information is stored and processed in the United States | Certain / medium | Little is collected; nothing sent to the AI identifies the student; a board can run its own copy with other providers | **[Board to rate]** |
| A provider (Vercel, Turso, Anthropic) has a breach, or is compelled by law to disclose data | Low / high | Little is collected; nicknames, not names; the AI never receives identifiers; retention deletes old classes | **[Board to rate]**; depends on the providers' terms (section 5) |
| Anthropic keeps what students write for a time under its terms | Certain / low–medium | Nothing sent identifies the student; Anthropic does not train on API data by default | **[Board to rate after reviewing Anthropic's terms]** |
| The operator, or someone who gets their database token or hosting account, reads the database | Low / high | Secrets only in the host's environment; teachers see only their own classes in the app | **[Operator to describe who holds the accounts and their safeguards; Board to rate]** |
| A student types personal or sensitive information (their real name, something about home), which then goes to the AI | Medium / medium | Students are told not to use real names and who reads what they write; nicknames that look like emails or phone numbers are refused; the safety filter catches worrying messages before the AI and points students to a trusted adult; teachers can delete it | Low–medium **[Board to rate]** |
| Someone who isn't a teacher signs up with a staff code | Low / medium | Codes are 12 characters and given out by the owner to schools; teachers at the school see everyone who signed up, can remove them and replace the code | Low |
| A teacher removes another teacher by mistake or on purpose, deleting their classes | Low / medium | Only teachers at the same school can; Turso's point-in-time history can restore for a short time | **[Board to rate]** |
| Someone guesses a student's picture key | Low / low | Lock-out after repeated wrong tries; teachers can reset keys | Low |
| A teacher sees another class | Low / medium | Every teacher route checks ownership; tested automatically | Low |
| The AI misjudges a student's understanding | Medium / low | Estimates are labelled as estimates, never marks; teachers read the conversation and correct candles; the end-of-lesson recap comes from the teacher-approved lesson, not the AI | Low |
| The AI says something inappropriate | Low / medium | Teacher-approved lessons only; safety filters before and after the AI; the AI that writes Gloam's replies never sees the answers, so it can't give them away; hand-written lines for sensitive moments | Low |
| The service is unavailable (provider outage, or daily limits reached) | Medium / low | Gloam falls asleep in character; nothing is lost; the activity isn't a test | **[Operator to state any uptime commitment]** |
| Information kept longer than needed | Medium / medium | The retention rule runs every day; practice data after 30 days; usage counts after 2 days; deleted data leaves Turso's history after a short time | Low; **[Operator to state the retention rule and history length]** |
| Accessibility settings reveal a disability | Low / medium | The teacher never sees a student's own settings, only accommodations the teacher set; they're never sent to the AI | Low |

## 7. Retention and disposal

One rule applies to the whole service (see [data inventory](data-inventory.md)). The default deletes a class and
all its students' information a year after the class was last used, which meets MFIPPA Reg. 823 s. 5's
one-year minimum unless the board sets a different period by by-law or resolution. On the shared service, the
board can't set its own rule; teachers can set an earlier delete date per class. **[Operator to complete: the
rule set on the shared service. Board to confirm the period, and whether teacher-initiated deletion fits the
board's records schedule.]**

Deleted information remains in Turso's point-in-time history for a short time **[Operator to complete: how
long]**. Copies of what was sent to Claude follow Anthropic's retention **[Board to review in Anthropic's
terms]**.

## 8. Individuals' rights

- **Access:** the teacher downloads everything about one student (**Download their data**).
- **Correction:** nickname and candles can be corrected by the teacher.
- **Deletion:** **Remove from class** deletes a student and everything they did.
- **Limit:** copies at Anthropic can't be found or deleted for one student, because nothing sent identifies
  them.
- **Complaints:** **[Board to complete: the board's privacy contact, and the IPC's address]**.

## 9. Openness

Students are told, in words for their age, that Gloam is an AI made with Claude by Anthropic, that its
candles are an estimate, what is kept, who reads what they write, and how to ask to see or delete it (on the
title screen, the join screen and in "How this works"). Families get the notice in
[family-notice.md](family-notice.md). The code is public, so anyone can check how it works.

## 10. AI-specific assessment

See [ai-transparency.md](ai-transparency.md) (an algorithmic impact assessment, as recommended by Canada's
federal, provincial and territorial privacy commissioners' 2025 resolution on ed-tech).

## 11. Breaches

See [breach-response.md](breach-response.md). Under MFIPPA as amended (from January 1, 2027), the board
reports breaches with a real risk of significant harm to the IPC and to the people affected, and keeps a
breach log. **[Operator to complete, Board to review]:** how the operator will tell the board about a breach,
including one at Vercel, Turso or Anthropic.

## 12. Sign-off

| Role | Name | Date |
|---|---|---|
| Privacy officer | **[Board to complete]** | |
| IT security | **[Board to complete]** | |
| Program owner | **[Board to complete]** | |
