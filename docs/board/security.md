# Security summary

For a board's IT security review or vendor questionnaire. Version 0.6, the hosted version. Every statement here
can be checked in the public code; the file to look at is named.

## Architecture

- **The app** (Next.js on Node) runs on **Vercel** (functions in Washington, D.C., region `iad1`) at
  https://protege-edu.vercel.app. The **database** is **Turso** (hosted libSQL/SQLite, AWS US East). **Gloam's
  AI** is **Claude Haiku 5.5**, called from the server through **Anthropic's API**. All three are in the United
  States. See [hosting](hosting-for-boards.md).
- **The public website** (protege-edu.pages.dev, Cloudflare Pages) is static. Its `/j` page forwards a typed
  class code to the app and stores nothing.
- **Browsers only talk to the app** (and the website). They never connect to Turso or Anthropic. The
  content-security policy allows connections to the app's own origin only.
- **Voice typing and read-aloud run on the student's device** (`lib/voice/client.ts`, `lib/speech.ts`): the
  browser's speech recognition only with `processLocally`, and only voices marked `localService`. If the device
  can't do it on the device, the feature is hidden. No audio reaches the server.
- **The server's outgoing connections:** Turso (the database), Anthropic's API (Gloam's AI), and Google
  (sign-in, only if switched on). No telemetry, crash reporting or analytics.
- **A daily clean-up job** (`/api/internal/sweep`, scheduled in `vercel.json`) applies the retention rules. It
  only runs with the cron secret.

## Secrets

| Secret | Where it lives |
|---|---|
| Claude API key, database token, cron secret | The host's environment variables only. Never in git, the database or the browser. |
| Cookie signing secret (random, 256-bit, made on first start) | The database (`lib/auth/crypto.ts`). It also keys the stored Google account hashes. Anyone with the database token could forge a sign-in, so the token is as sensitive as the data. |
| Internal drafting requests (the app asking itself to draft the next lesson) | Carry the app's secret in a header and are checked in constant time (`lib/auth/internal.ts`). Anyone else gets "not found". |

## Accounts and sign-in (`lib/auth/`, `lib/teacher/auth.ts`, `lib/student/auth.ts`, `lib/teacher/schools.ts`)

| | |
|---|---|
| Teacher passwords | At least 8 characters; stored as scrypt with a random salt; compared in constant time |
| Teacher lock-out | 5 wrong passwords lock the account for 10 minutes; sign-in is also rate-limited per network address |
| Recovery | A one-time recovery code shown at sign-up (stored scrypt-hashed). No password-reset emails (Protégé sends no email). If both are lost, the owner makes a new recovery code on the Owner page (or `npm run reset-teacher` from the code, with the database's credentials). |
| The first account (the owner) | Needs a one-time setup code that Protégé prints in the server logs. Only someone who can read the host's logs can make it. |
| New teachers | Sign up with their school's 12-character **staff code**. The owner adds each school and gives it its code. Email can't prove who's a teacher (students and teachers share the school's email domain), so the staff code does. Teachers at a school see who signed up, can remove someone (with everything they made), and can replace the code; the old one stops working at once. |
| Students | Class code + nickname + secret picture key (2 pictures for K–2, 3 after), stored scrypt-hashed. 5 wrong keys lock that student for 5 minutes. Wrong class codes are rate-limited. |
| Google (optional) | OAuth 2.0 authorization code flow with `state` and nonce; scope `openid` (plus `email` for teachers); for students only a keyed HMAC of the Google account id is stored |
| Sessions | Signed cookies (HMAC-SHA256), `HttpOnly`, `SameSite=Lax`, `Secure` over https. Teachers 14 days, students 30 days. |
| Authorization | Every teacher route checks the teacher owns the class, lesson or student (`lib/teacher/api.ts`, tested in `scripts/check-accounts.ts`). Teachers only ever see their own classes. Students can only reach their own session. |

## Web protections (`next.config.ts`, `lib/auth/request.ts`)

- **HTTPS** everywhere (the host provides it), with `Strict-Transport-Security`.
- **Content-Security-Policy:** only Protégé's own scripts, styles, images, fonts and connections
  (`default-src 'self'`; inline scripts are allowed because Next.js needs them, but no outside source is);
  `frame-ancestors 'none'`; `object-src 'none'`; `form-action 'self'`. No third-party scripts, analytics or
  trackers.
- **Other headers:**
  - `Referrer-Policy: no-referrer`
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Cross-Origin-Opener-Policy: same-origin`
  - `Permissions-Policy` allowing only the microphone (for on-device voice typing), and only for Protégé
  - no `X-Powered-By`
- **Cross-site request forgery:** every request that changes something must come from Protégé's own origin,
  and cookies are `SameSite=Lax`.
- **Rate limits** on sign-in, joining, the AI and settings changes. The counters are in memory and expire
  within an hour. Each server copy keeps its own, so on a host that runs several copies they're a quick guard
  against floods, not an exact count.
- **Daily AI limits** (`lib/ai/allowance.ts`), stored in the database so they hold across server copies: per
  student, per class, per teacher (lesson drafts) and for the whole service. They cap cost and abuse. When one
  is reached, nothing more is sent to Claude that day.
- **Input validation:** every request body and every AI response is validated with Zod schemas.
- **Lesson files** (PDF, Word, PowerPoint) are read in the teacher's browser. Files are never uploaded; only
  the text the teacher picks is sent, up to a fixed size per lesson.

## Data protection

- See [data inventory](data-inventory.md). Protégé's logs never contain what students write: failed AI turns
  log only the kind of error.
- **What goes to Claude** carries no nickname, student id, class, teacher or account information. See
  [AI transparency](ai-transparency.md).
- **Encryption in transit:** https between browsers and the app, and between the app and Turso, Anthropic and
  Google.
- **Encryption at rest** is the database provider's job. **[Operator to confirm Turso's encryption at rest
  for the plan in use.]**
- **Undoing mistakes:** Turso keeps a short point-in-time history of the database. There are no backup files.
- **An access log** records which teacher viewed or changed a student's information (`npm run access-log`).

## Supply chain

- **Open source:** AGPL-3.0. Every library's licence is checked by `npm run licenses`
  (`THIRD-PARTY-NOTICES.md`).
- `npm audit --omit=dev` for the libraries shipped with Protégé: **0 known vulnerabilities** (October 30, 2026).
- **Automated checks** on every change (GitHub Actions, `.github/workflows/check.yml`): type checking, linting,
  rule tests, account and privacy tests, the licence check, and a build of the website.
- **Deploys:** the host builds the app from the code and runs database migrations first (`vercel.json`).
  Nothing is installed on school devices. **[Operator to complete: who can deploy, and from which branch.]**

## Not done yet (honest)

- **No independent penetration test.** Boards that need one should arrange it before wide use.
- **No certifications or audit reports** for Protégé itself (for example SOC 2 or ISO 27001). Boards that need
  them for Vercel, Turso or Anthropic should ask those companies.
- **No two-step sign-in for teachers**, except what Google provides when a teacher signs in with Google.
- **No single sign-on** beyond Google.
- **Any teacher at a school can remove another teacher there**, which deletes that teacher's classes and their
  students' information. This is meant for removing someone who isn't a teacher, but it can be misused or
  pressed by mistake. Turso's point-in-time history is the only way back, for a short time.
- **US location:** all processors are in the United States. A board needing Canadian residency must run its
  own copy with providers that offer it.
