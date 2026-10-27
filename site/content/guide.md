# Setting up Protégé

About 15 minutes the first time, mostly waiting for downloads. You need a Windows or Mac computer the school
allows you to use for student work (ideally one your board manages, see
[running Protégé for a school](board/hosting-for-boards.html)).

## 1. Download and unzip

Download the zip for your computer from the [releases page](DOWNLOAD), and unzip it somewhere easy to find,
like your Documents folder.

## 2. Start it

Double-click **Start Protégé**. A window opens and stays open while Protégé runs.

- **The first time**, it checks for **Ollama**, the free program that runs Gloam's AI on your computer. If it's
  missing, its download page opens: install it, and the Protégé window carries on by itself.
- Then it downloads **Gloam's AI model** (about 2.5 GB, once).
- Your browser opens the teacher page.

> Windows may ask whether Node.js can use the network. Allow it on **private** networks, so students on the
> school Wi-Fi can reach your computer.

## 3. Make your account

The Protégé window shows a **setup code**. Type it on the teacher page to make the first teacher account. Save
the **recovery code** it gives you somewhere safe: it's how you get back in if you forget your password
(Protégé doesn't send emails).

Other teachers on the same computer: press **Make an invite code** on your teacher page and give it to them.

## 4. Make a class and a lesson

- **Make a class**, and pick its grade. The grade picks how Gloam looks and talks: four different worlds,
  from a sunny storybook meadow for kindergarten to a moody night valley for high school.
- **Add a lesson:** upload your notes (PDF, PowerPoint, Word) or paste them. Gloam drafts the lesson in a few
  minutes: the key ideas, the wrong ideas students often have, and its story. **Read it, change anything, and
  approve it.** Students only ever see lessons you approved.
- Or start with the built-in lesson, "Why do we have seasons?"

## 5. In class

1. Start Protégé (keep the computer plugged in and awake).
2. On your class page, press **Show the code** and put it on the projector.
3. Students open the address on the screen (or scan the QR code), type the class code, pick a nickname and
   their secret pictures. Next time, they tap their nickname and their pictures, on any Chromebook.
4. Watch the class page: each student's candles, who's stuck, and what the class thinks. Open a student to
   read their conversation with Gloam, and correct any candle Gloam got wrong.

**Pause the class** puts every Gloam to sleep when you want everyone's attention.

## Voice typing (optional)

Double-click **Set up voice typing** once (a few hundred MB). Students can then press the mic and talk to
Gloam instead of typing. Their words appear in the box to check before sending. Their voice is turned into
words on your computer and never saved.

## Students outside the school network (optional)

Only if your school allows it. Install [Tailscale](https://tailscale.com/download) (free), sign in, and run
`tailscale funnel 3000` once. Copy `protege.env.example` to `protege.env`, set `PUBLIC_URL` to the address
Tailscale gives you, and use **Start Protégé online**. Traffic stays encrypted all the way to your computer.

## Checking everything works

On the teacher page, **Ready for class?** checks Gloam's AI, voice typing, the student address, disk space and
backups, and says what to do about anything that isn't ready.

## Backups and updates

- Protégé backs itself up every day it runs (the last 7 days are kept). **Restore a backup** goes back to an
  earlier day.
- **Check for updates** (on Ready for class?) tells you when there's a new version. Download it, unzip it, and
  use it instead. Your classes and students stay.

## If something's wrong

- **"Gloam's brain isn't running":** open the Ollama app. Students press Try again; nothing is lost.
- **Students can't reach the address:** check they're on the same network, and that Windows allowed Node.js
  on private networks. Some school networks keep devices apart: ask your IT department.
- **A student forgot their pictures:** open them on your class page and press **Reset their pictures**.
- **You forgot your password:** use your recovery code with **Forgot your password?**
