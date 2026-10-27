# Running Protégé for a school or board

Protégé is made so that students' information never leaves the computer that runs it. To keep that promise,
the computer should be **one the school board manages**, not a teacher's personal laptop. Most boards don't
allow students' personal information on personal devices.

## Choose a setup

| Setup | Good for | Notes |
|---|---|---|
| **A board-managed laptop per teacher** | A pilot in a few classes | The teacher starts Protégé at the start of class. Students on the school network join directly. |
| **One board-managed computer per school** (a desktop or small server) | Several teachers in one school | Always on; teachers and students reach it over the school network. Give it a fixed address on the school network. |
| **A board server** | Many schools | Same as above, reached over the board's network. Needs a graphics card for a whole class at once. |

## What the computer needs

- Windows 10/11 or macOS (Linux works when building from the code).
- 16 GB of memory and about 10 GB of free space. A graphics card makes Gloam much faster: a laptop with an Intel
  Arc graphics card answered a class of 30 in about 13 seconds per message. A dedicated NVIDIA card is several
  times faster.
- **Full-disk encryption switched on** (BitLocker on Windows, FileVault on Mac). This is what protects students'
  information if the computer is lost or stolen.
- Automatic operating-system security updates, and the board's usual endpoint protection.
- Sign-in to the computer limited to the people who run Protégé.

## Install

1. Download the zip for Windows or Mac from the Protégé releases page, and unzip it (for example to
   `C:\Protégé`).
2. Optional: copy `protege.env.example` to `protege.env` and set the board's choices:
   - `PROTEGE_RETENTION`: how long classes are kept (`after-a-year`, the default; `end-of-school-year`; or
     `never`). See `data-inventory.md`.
   - `SCHOOL_YEAR_END`: for example `06-30`.
   - `PORT`: the port students' address ends with.
   - `AI_CONCURRENCY`: raise it on a computer with a strong graphics card.
3. Double-click **Start Protégé**. The first time, it helps install Ollama (free) and downloads Gloam's AI model
   (about 2.5 GB).
4. It prints a **setup code** and opens the teacher page. The first teacher account needs the code. Later
   teachers get one-use invites from a signed-in teacher.
5. Optional: **Set up voice typing** (downloads whisper.cpp and a speech model, a few hundred MB).
6. Open **Ready for class?** on the teacher page to check everything works.

## Students reaching it

- **On the school network (recommended):** students go to the address Protégé shows, for example
  `http://10.20.30.40:3000`. Allow Protégé through the computer's firewall on the school (private) network
  only. Nothing leaves the network.
- **From anywhere (only if the board approves):** use **Tailscale Funnel**. It gives an https address and keeps
  the traffic encrypted all the way to this computer: Tailscale relays it but can't read it. Set `PUBLIC_URL`
  to that address. Protégé refuses Cloudflare's quick tunnel unless `PROTEGE_ALLOW_CLOUDFLARE=1` is set,
  because Cloudflare decrypts traffic on its own servers.
- **Google sign-in** needs a fixed https address and a free Google Cloud project owned by the board (see the
  setup guide). It's off unless set up, and each teacher switches it on per class.

## Backups

- Protégé makes a backup every day it runs, next to the database, and keeps the last 7 days. They're as
  sensitive as the database: keep them on the encrypted disk.
- To restore: stop Protégé, then double-click **Restore a backup** in the Protégé folder and pick a day. (From the code: `npm run restore`.) Today's database is kept first, so a restore can be undone.
- If the board copies backups elsewhere (for example to a board file server), that copy is covered by the
  board's own retention and security rules. Note it in the privacy impact assessment.

## Updates

On the teacher page, **Ready for class? → Check for updates** asks the public releases page for the newest
version (only when pressed). To update: download the new zip, unzip it next to the old one, and start the
new one. Classes and students stay where they are: they live in the data folder, not the program folder.

## End of the school year

The retention rule clears old classes by itself. To remove **everything** from a computer that's being
retired or reassigned, stop Protégé and delete the data folder
(`%LOCALAPPDATA%\Protege` on Windows, `~/.local/share/Protege` on Mac), which includes the backups and the voice
models.
