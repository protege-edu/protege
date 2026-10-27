# Security summary

For a board's IT security review or vendor questionnaire. Version 0.1. Every statement here can be checked in
the public code; the file to look at is named.

## Architecture

- **One computer runs everything:** the web app (Next.js on Node), the database (SQLite, one file), the AI
  (Ollama), voice typing (whisper.cpp) and read-aloud (Kokoro, through a small helper). There is **no vendor server** and no telemetry, crash reporting or
  update calls in the background.
- **Students and teachers** connect with a browser over the school network, or over an encrypted tunnel
  (Tailscale Funnel) if the board allows remote access.
- **Ollama, whisper.cpp and the read-aloud helper** listen on `127.0.0.1` only (this computer). They are never
  reachable from the network.
- **The only outgoing connections:**
  - "Check for updates" (only when a teacher presses it; it asks GitHub for the latest version number)
  - Google sign-in (only if switched on)
  - First-time downloads, over https: Ollama's installer from ollama.com (only if Ollama isn't installed), the
    AI model through Ollama, and the voice models
- **The first-run setup page** only works with a one-time secret the launcher puts in the address it opens on
  this computer. The launcher's control channel listens on `127.0.0.1` with its own secret, which never
  leaves the server.

## Accounts and sign-in (`lib/auth/`, `lib/teacher/auth.ts`, `lib/student/auth.ts`)

| | |
|---|---|
| Teacher passwords | At least 8 characters; stored as scrypt with a random salt; compared in constant time |
| Teacher lock-out | 5 wrong passwords lock the account for 10 minutes; sign-in is also rate-limited per network address |
| Recovery | A one-time recovery code shown at sign-up (stored scrypt-hashed). No password-reset emails (Protégé sends no email). If both are lost, only someone at the computer running Protégé can reset it (`npm run reset-teacher`). |
| New teachers | Sign-up is closed: the first account needs a setup code printed on the computer running Protégé; later teachers need a one-use invite (expires in a week) from a signed-in teacher |
| Students | Class code + nickname + secret picture key (2 pictures for K–2, 3 after), stored scrypt-hashed. 5 wrong keys lock that student for 5 minutes. Wrong class codes are rate-limited. |
| Google (optional) | OAuth 2.0 authorization code flow with `state` and nonce; scope `openid` (plus `email` for teachers); for students only a keyed HMAC of the Google account id is stored |
| Sessions | Signed cookies (HMAC-SHA256 with a random 256-bit secret generated on first run), `HttpOnly`, `SameSite=Lax`, `Secure` over https. Teachers 14 days, students 30 days. |
| Authorization | Every teacher route checks the teacher owns the class, lesson or student (`lib/teacher/api.ts`, tested in `scripts/check-accounts.ts`). Students can only reach their own session. |

## Web protections (`next.config.ts`, `lib/auth/request.ts`)

- **Content-Security-Policy:** only Protégé's own scripts, styles, images, fonts and connections
  (`default-src 'self'`; inline scripts are allowed because Next.js needs them, but no outside source is);
  `frame-ancestors 'none'`; `object-src 'none'`; `form-action 'self'`.
- **Other headers:**
  - `Referrer-Policy: no-referrer`
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Cross-Origin-Opener-Policy: same-origin`
  - `Permissions-Policy` allowing only the microphone, and only for Protégé
  - `Strict-Transport-Security` over https
  - no `X-Powered-By`
- **Cross-site request forgery:** every request that changes something must come from Protégé's own origin.
- **Rate limits** on sign-in, joining, the AI, voice typing, read-aloud and settings changes. The counters are in memory
  and expire within an hour.
- **Input validation:** every request body and every AI response is validated with Zod schemas.
- **Uploads:** lesson files (PDF, Word, PowerPoint) are read on the server by maintained libraries and only
  their text is kept. Voice clips must be 16 kHz mono WAV, at most a minute, and are read with a hard size cap.

## Data protection

- See `data-inventory.md`. Logs never contain what students write: failed AI turns log only the kind of error.
- **Daily backups** (`lib/db/backup.ts`) are written next to the database, and the last 7 are kept. Restore one by double-clicking **Restore a backup** (`npm run restore` from the code).
- **Encryption at rest is the operating system's job:** run Protégé on a computer with full-disk encryption
  (BitLocker or FileVault). See `hosting-for-boards.md`.
- **An access log** records which teacher viewed or changed a student's information (`launch.js --access-log`, or `npm run access-log`).

## Supply chain

- **Open source:** AGPL-3.0. Every library's licence is checked by `npm run licenses`
  (`THIRD-PARTY-NOTICES.md`).
- `npm audit` for the libraries shipped with Protégé: **0 known vulnerabilities** (October 2026).
- **Automated checks** on every change (GitHub Actions): type checking, linting, 70 rule tests and 45
  account and privacy tests.
- **Releases** are built by GitHub Actions from tagged versions and published on the project's GitHub
  releases page. Teachers update by downloading the new version (nothing updates itself).

## Not done yet (honest)

- **No independent penetration test.** Boards that need one should arrange it before wide use.
- **No paid code signing** for the Windows and Mac downloads (it costs money every year; the Mac app is
  signed "ad hoc" only). Windows SmartScreen and macOS Gatekeeper warn the first time, and the website shows
  teachers what to click. A free option for open-source projects (SignPath Foundation) is possible later.
- **No single sign-on** beyond Google.
- Encryption of backups beyond full-disk encryption.
