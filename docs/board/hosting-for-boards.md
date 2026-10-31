# Hosting: the shared service or the board's own copy

Protégé is a web app. Students and teachers only need a browser: nothing is installed on Chromebooks or
teacher computers. There are two ways a board can use it.

| | The shared service | The board's own copy |
|---|---|---|
| Address | https://protege-edu.vercel.app | An address the board chooses |
| Who runs it | The Protégé project **[Operator to complete: legal name and contact of whoever operates the shared service]** | The board's IT department |
| Hosting, database, AI | Vercel, Turso and Anthropic accounts held by the operator | Accounts the board holds, with providers and regions it chooses |
| Data location | United States (see below) | Wherever the board's providers run it |
| Contract terms | The operator's, and the operator's agreements with Vercel, Turso and Anthropic | The board's own agreements |
| Good for | A pilot, or a board comfortable with the US processors below | A board that needs Canadian data residency, its own AI agreement, or its own retention rule |

## Where the shared service runs

| Part | Company | Location | What it handles |
|---|---|---|---|
| The app (pages and server code) | **Vercel**, Hobby plan | Functions in Washington, D.C., USA (region `iad1`) | Every request from students and teachers passes through it, over https |
| The database | **Turso** (hosted libSQL/SQLite) | AWS US East (Virginia, USA) | Everything Protégé keeps: see [data inventory](data-inventory.md) |
| Gloam's AI | **Anthropic** (Claude Haiku 5.5, through Anthropic's API, under its commercial terms) | United States | Lesson notes when a teacher drafts a lesson; a student's message, the last few messages and the lesson's ideas when Gloam answers. Never a nickname or account information. See [AI transparency](ai-transparency.md). |
| The public website | **Cloudflare Pages** (protege-edu.pages.dev) | Cloudflare's network | Information pages. Its `/j` page only forwards a typed class code to the app, and stores nothing. |
| "Continue with Google" (optional) | **Google** | Google's | Only if a teacher allows it for a class. Protégé asks only for `openid` (students) and keeps a keyed hash of the account number. |

Student devices only ever connect to the app and the website. They never connect to Turso or Anthropic
directly: the app's server does that.

**What this means for a board.** Students' information is stored and processed in the United States by three
companies. Information held by US companies can be subject to US legal process (for example, under the US
CLOUD Act). Some boards have policies, or contracts, that require personal information to stay in Canada. If
yours does, the shared service does not meet that requirement, and the board's own copy is the way to use
Protégé.

## Before using the shared service: what the board should check

These are open items. None of them should be read as done.

- **[Operator to complete]** Who operates the shared service, how to reach them, and whether they offer the
  board a written agreement (for example, a data processing or service agreement). None is described here.
- **Anthropic's commercial terms and data processing addendum:** how long API inputs and outputs are kept, and
  for what. Anthropic does not train its models on API data by default. Also check whether Anthropic's usage
  policy places conditions on services used by minors, and whether the operator meets them.
- **Vercel's terms and data processing addendum,** including whether the Hobby plan's terms allow this use, and
  how long Vercel keeps request and function logs (which include network addresses).
- **Turso's terms and data processing addendum,** including encryption at rest and how long its point-in-time
  history keeps deleted data.
- **Cross-border transfer:** whether the board's policies allow storage in the US; for Québec, the assessment
  required before information is communicated outside Québec; for the EU or UK, a valid transfer mechanism
  for each processor.
- **Retention rule:** on the shared service, **one rule applies to every school** (it's a setting of the
  service). **[Operator to complete: the rule currently set.]** Teachers can still set an earlier delete date
  for any class, or delete it.
- **Uptime and support:** **[Operator to complete: whether any uptime or support commitment is offered.]**
- Certifications or audit reports (for example SOC 2 or ISO 27001) for each processor, if the board requires
  them. Protégé itself has none.

## Running the board's own copy

Protégé is open source (AGPL-3.0). A board can run its own copy with its own
accounts. Hosting settings live in one place (`lib/hosting/`), and the AI in one module (`lib/ai/`), so
changing where things run is a matter of settings.

What it needs:
- A host for a Next.js (Node) app. The code is set up for Vercel (`vercel.json`), including the daily clean-up.
- A libSQL database (Turso, or another libSQL server), reached through two settings.
- A Claude API account with Anthropic, in the board's name, under terms the board has reviewed.
- Optional: a Google Cloud OAuth client, if teachers will use "Continue with Google".

Settings, all in the host's environment variables (never in the code or the browser):

| Setting | What it is |
|---|---|
| `ANTHROPIC_API_KEY` | The board's Claude API key |
| `AI_MODEL` | The Claude model (default `claude-haiku-5-5`) |
| `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` | The database and its access token |
| `CRON_SECRET` | Protects the daily clean-up job |
| `PROTEGE_RETENTION` | How long classes are kept: `after-a-year` (default), `end-of-school-year` or `never`. See [data inventory](data-inventory.md). |
| `SCHOOL_YEAR_END` | For example `06-30` |
| `AI_DAILY_PER_STUDENT`, `AI_DAILY_PER_CLASS`, `AI_DAILY_DRAFTS_PER_TEACHER`, `AI_DAILY_TOTAL` | Daily limits on AI use (they cap cost and abuse) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Optional Google sign-in |
| `PROTEGE_APP_URL`, `PROTEGE_SITE_URL` | The app's address when it isn't on Vercel; the board's own copy of the website, if any |

**The first account.** When the app first starts, it prints a one-time **setup code** in the server logs.
Whoever can read those logs makes the first account with it. That account is the **owner**. The owner adds
each school, and each school gets a 12-character **staff code**. Teachers sign up with their school's staff
code. (Students and teachers share the school's email domain, so an email address can't prove someone is a
teacher.) Teachers at a school see who signed up with its code, can remove someone (with everything they made),
and can replace the code; the old one stops working at once. Give staff codes out through a channel only
staff can read, such as the principal's school email.

**Costs.** Claude is paid per use. Set a monthly spending limit on the Claude account, and keep the daily
limits above. When a limit is reached, Gloam "falls asleep" in character until the next day and nothing is
sent to Claude.

## Students reaching it

- Students go to the app's address, or to protege-edu.pages.dev/j and type the class code (or scan the QR
  code the teacher shows).
- The school network must allow **protege-edu.vercel.app** and **protege-edu.pages.dev** (or the board's own
  addresses), and **accounts.google.com** only if Google sign-in is used.
- Nothing else is needed on the network: no ports to open, no tunnels, no devices that must see each other.

## Restoring after a mistake

There are no backup files to manage. Turso keeps a short point-in-time history of the database, so whoever
holds the database account can restore it to an earlier moment (see the project README). This also means a
deleted class can be recovered for a short time after it's deleted, and is then gone for good.
**[Operator to complete: how long that history is on the plan in use, and who can restore.]**

## Updates

Whoever runs the service deploys new versions from the code. Students and teachers get them the next time they
load the page. Nothing is installed or updated on school devices. **[Operator to complete: how updates are
announced to boards.]**

## Leaving, or the end of the school year

The retention rule clears old classes by itself every day. To remove a school's information sooner, teachers
delete their classes, or a teacher at the school removes accounts (each removal deletes that teacher's
classes, students and lessons). What was deleted stays in Turso's point-in-time history until it expires.
Copies at Anthropic follow Anthropic's own retention (see the open items above). They carry no nickname or
student identifier, so they can't be found or deleted per student.
