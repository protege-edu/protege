# The school board pack

Everything a school board's privacy officer, IT department and principals need to decide whether to use
Protégé, and how to use it safely. Written for Ontario first (MFIPPA, the Education Act, EDSTA as enacted by
Bill 194 and its 2026 regulations, AODA), and organized so it carries over to Québec, the rest of Canada, the
EU, the UK and the US.

| Document | For | What's in it |
|---|---|---|
| [Data inventory](data-inventory.md) | Privacy officer | Every piece of information, why it's kept, who sees it, which company holds it, when it's deleted |
| [Privacy impact assessment (draft)](privacy-impact-assessment.md) | Privacy officer | Pre-filled PIA; the board fills in its own parts |
| [Notice to families (EN/FR)](family-notice.md) | Schools | Ready-to-send notice covering O. Reg. 52/26 |
| [AI transparency](ai-transparency.md) | Privacy officer, principals | What the AI does and doesn't do, what is sent to it, human oversight, validation, known limits |
| [Security summary](security.md) | IT security | Architecture, accounts, sessions, headers, supply chain, what's not done yet |
| [Hosting: the shared service or the board's own copy](hosting-for-boards.md) | IT | Where Protégé runs, what to check before using it, how a board runs its own copy |
| [If something goes wrong](breach-response.md) | Privacy officer | Breach steps, using the access log, notification |
| [Accessibility conformance](accessibility.md) | Accessibility lead | WCAG 2.2 AA status, how it was tested, known gaps |

**In one paragraph.** Protégé is a web app. It runs on Vercel, keeps its data in a Turso database, and uses
Claude (by Anthropic) as Gloam's AI. **All three companies are in the United States**, so students' information
is stored and processed outside Canada. Students use nicknames and a picture key, never real names or email.
What a student writes is sent to Claude to judge and answer it, without their nickname or anything else that
says who they are. Voice typing and read-aloud stay on the student's own device. What students write is seen by
them and their teacher, and is deleted by the retention rule. Teachers approve every lesson, can read every
conversation, and can correct anything the AI judged. Students are told plainly that Gloam is an AI made with
Claude. Protégé is free and open source (AGPL-3.0), so anyone can check every claim in these documents against
the code, and a board that needs different terms or a different location can run its own copy.

**What changed in version 0.6.** Earlier versions ran on a computer at the school, with a local AI and nothing
sent to any company. That is no longer how Protégé works. These documents describe the hosted version. A
board that approved an earlier version should review it again, starting with the
[privacy impact assessment](privacy-impact-assessment.md).

*These documents explain how the software works. They are not legal advice. The board's privacy officer and
counsel decide how they apply.*
