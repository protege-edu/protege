# If something goes wrong: breach response for Protégé

A plan the board can adopt into its own privacy-breach protocol. From January 1, 2027, MFIPPA (as amended by
Bill 97) requires institutions to:
- report a breach that poses a **real risk of significant harm** to the Information and Privacy Commissioner
  (IPC) and to the people affected
- keep a record of every breach

Boards must also report critical cyber security incidents under O. Reg. 51/26 (EDSTA).

## What counts

Any time students' or teachers' information in Protégé is seen, copied, changed or deleted by someone who
shouldn't, or is lost. For example:
- the computer running Protégé is lost, stolen, or used by someone else
- a backup file is copied somewhere it shouldn't be
- a teacher account is used by someone else
- a student sees another student's conversation
- Protégé is put online in a way the board didn't approve

## The steps

1. **Contain (right away).**
   - Stop Protégé: close its window, or press Ctrl+C.
   - If an account was misused, change its password. If needed, open a terminal in the Protégé folder on the
     computer running it and run `node\node.exe launch.js --reset-teacher <email>` (from the code:
     `npm run reset-teacher -- <email>`).
   - If the computer is lost, the board's IT department follows its lost-device procedure (remote lock or
     wipe). Full-disk encryption is what keeps the data safe in that case.
   - If a tunnel was the problem, stop it: close Protégé's window (it closes a Cloudflare quick tunnel with it),
     or for a school's own Tailscale Funnel, `tailscale funnel off`.
2. **Find out what happened.**
   - On the computer running Protégé, open a terminal in the Protégé folder and run
     `node\node.exe launch.js --access-log --all` (from the code: `npm run access-log -- --all`). It shows
     which teacher account viewed or changed which student's information, and when.
   - Check which classes and students were involved (the teacher pages; `data-inventory.md` lists what each
     contains).
   - Keep a copy of the database and the access log as evidence, stored securely.
3. **Decide whether there's a real risk of significant harm.** The board's privacy officer weighs how
   sensitive the information is (conversations, accessibility settings), how many students, and whether
   it's likely to be misused.
4. **Notify** (the privacy officer):
   - the IPC, when required
   - the families of affected students under 16, and affected students aged 16 and older (the notice
     should say what happened, what information, what's been done, and who to contact)
   - the board's cyber security contact, for O. Reg. 51/26 reporting
5. **Record it** in the board's breach log, even if no notification was needed.
6. **Fix and learn.** Repair the cause, and tell the Protégé project if it was a flaw in the software. Report
   security flaws privately (see `SECURITY.md` in the code) so they're fixed before anyone can use them.

## What helps limit any breach

- Protégé keeps very little: nicknames, no real names, no contact details (`data-inventory.md`).
- Nothing is stored outside the computer running Protégé and its backups.
- Retention rules delete old classes automatically.
- The access log shows exactly which accounts looked at what.
