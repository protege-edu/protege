# If something goes wrong: breach response for Protégé

A plan the board can adopt into its own privacy-breach protocol. From January 1, 2027, MFIPPA (as amended by
Bill 97) requires institutions to:
- report a breach that poses a **real risk of significant harm** to the Information and Privacy Commissioner
  (IPC) and to the people affected
- keep a record of every breach

Boards must also report critical cyber security incidents under O. Reg. 51/26 (EDSTA).

Protégé is a hosted service (see [hosting](hosting-for-boards.md)). Some steps below can only be done by
whoever operates it, because they hold the hosting, database and AI accounts. On the shared service, that is
the operator, not the board. **[Operator to complete: a contact for breaches that answers quickly, and how the
operator will tell boards about a breach, including one at Vercel, Turso or Anthropic.]**

## What counts

Any time students' or teachers' information in Protégé is seen, copied, changed or deleted by someone who
shouldn't, or is lost. For example:
- a teacher account is used by someone else
- someone who isn't a teacher signs up with a school's staff code
- a student sees another student's conversation
- a secret leaks: the database token, the Claude API key, the cron secret, or the hosting account
- one of the providers (Vercel, Turso, Anthropic) reports a breach affecting the service
- classes are deleted by someone who shouldn't have (for example, a teacher removed by another teacher)

## The steps

1. **Contain (right away).**
   - **A misused teacher account:** change its password. If the teacher can't get in, the owner makes a new
     recovery code on the Owner page (or `npm run reset-teacher -- <email>` from the code).
   - **Someone who isn't a teacher signed up:** a teacher at that school opens **Your school**, removes them,
     and makes a new staff code (the old one stops working at once). Removing an account deletes its classes;
     note what was there first (step 2).
   - **A leaked secret** (operator): replace it in the provider's console and in the host's environment
     variables, then redeploy. A new database token means the old one stops working. If the database token
     leaked, assume the cookie signing secret (the `cookie_secret` row in the database's `settings` table) is
     known too. Deleting that row and redeploying makes a new one, which ends every sign-in. The same secret
     also keys the stored Google account hashes, so afterwards Google sign-ins no longer match their accounts:
     plan that step with the Protégé project.
   - **A provider breach** (operator): follow the provider's instructions, and tell the boards using the
     service.
   - **To stop the service entirely** (operator): take the deployment offline in the hosting account.
2. **Find out what happened.**
   - Read the access log (operator, from the code with the database's credentials):
     `npm run access-log -- --all`. It shows which teacher account viewed or changed which student's
     information, and when. A teacher's entries stay in the log even after their account is removed.
   - Check which classes and students were involved (the teacher pages; [data-inventory.md](data-inventory.md)
     lists what each contains).
   - The host's request logs and the database provider's records may help; how long they're kept depends on
     those providers.
   - Keep a copy of what you find, stored securely.
3. **Undo damage, if possible.** Turso keeps a short point-in-time history, so deleted or changed information
   can be restored to an earlier moment for a short time (operator).
4. **Decide whether there's a real risk of significant harm.** The board's privacy officer weighs how
   sensitive the information is (conversations, accessibility settings), how many students, and whether
   it's likely to be misused.
5. **Notify** (the privacy officer):
   - the IPC, when required
   - the families of affected students under 16, and affected students aged 16 and older (the notice
     should say what happened, what information, what's been done, and who to contact)
   - the board's cyber security contact, for O. Reg. 51/26 reporting
6. **Record it** in the board's breach log, even if no notification was needed.
7. **Fix and learn.** Repair the cause, and tell the Protégé project if it was a flaw in the software. Report
   security flaws privately (see `SECURITY.md` in the code) so they're fixed before anyone can use them.

## What helps limit any breach

- Protégé keeps very little: nicknames, no real names, no contact details for students
  ([data-inventory.md](data-inventory.md)).
- Nothing sent to the AI says who wrote it.
- Voice and lesson files never leave the device they're on.
- Retention rules delete old classes automatically, and usage counts after 2 days.
- The access log shows which accounts looked at what.
