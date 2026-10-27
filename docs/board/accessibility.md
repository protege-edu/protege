# Accessibility conformance

**Target:** WCAG 2.2 level AA, for every student and teacher screen. Ontario's AODA (Integrated
Accessibility Standards Regulation, s. 14) requires WCAG 2.0 AA. WCAG 2.2 AA includes everything in 2.0 and
2.1 AA.

**Status for version 0.1:** partially conformant (the WCAG term). Every screen was checked with the methods
below and the problems found were fixed. What's left, and what hasn't been tested, is listed honestly at the
end.

## How it was checked

1. **Automated checks on every screen** (`scripts/audit.ts`, re-runnable by anyone):
   - **Screens:** every student screen in every state (joining and each of its errors, home, title, intro,
     teaching, typing, pause, help, Ways to play, the conversation, the trail map, the "I get it" moment, the
     recap) and every teacher screen (sign-in, sign-up, recovery, home, class, show the code, a student,
     new lesson, lesson review, status, help, and the "nothing here" page).
   - **In:** all four age styles, English and French.
   - **At four sizes:** Chromebook (1366×768), desktop (1920×1080), tablet (768×1024, touch) and phone
     (390×844, touch).
   - **With and without** the biggest text, stronger contrast and extra text spacing, with reduced motion.
   - **Each screen is checked for:**
     - the **axe-core** rules for WCAG 2.0, 2.1 and 2.2 A and AA
     - overlapping or cut-off text, and sideways scrolling
     - words or buttons covering Gloam (the painted character can't be seen by other checks, so Protégé
       marks where it stands and checks nothing sits on it)
     - tap targets (24 px minimum; 44 px flagged for young children)
     - browser errors
2. **Keyboard only** (`scripts/keyboard.ts`): a whole lesson with Tab, Enter and Escape. Focus is always
   visible, starts in the right place in every panel, stays inside open panels, and returns where it was.
3. **Screenshots reviewed by a person:** every screen at every size, for problems automated checks can't
   see, such as text over the painted world, or Gloam hidden behind a panel.
4. **Reduced motion** and **a slow computer** (4× slower CPU: about 60 frames per second in every world).

## What every student gets ("Ways to play")

| Need | What Protégé does | WCAG |
|---|---|---|
| Reading | Read-aloud of Gloam's words, the join steps and the recap, in a natural voice made on the school's computer (or the device's own voices); easier reading (spacing, OpenDyslexic); plain, short words per age | 1.4.12, 3.1.5 (AAA, partly) |
| Seeing | Up to 132% text that reflows; stronger contrast (near-solid backgrounds behind words, full-strength text, firm borders); layouts from phone to projector | 1.4.3, 1.4.4, 1.4.10, 1.4.11 |
| Typing | Voice typing (private: on the school's computer); sentence starters for younger students; nothing is timed | 2.1.1, 2.2.1 |
| Moving | Less motion (also follows the device's setting); no flashing; the "I get it" moment can be skipped | 2.3.1, 2.3.3 (AAA), 2.2.2 |
| Screen readers | Every control is named; Gloam's lines, waiting messages and candle changes are announced; the painted world is skipped (it's decoration); each screen declares its language, so French is read as French | 1.1.1, 1.3.1, 3.1.1, 3.1.2, 4.1.2, 4.1.3 |
| Keyboard | Everything works by keyboard; visible focus everywhere; panels trap focus and close with Escape | 2.1.1, 2.1.2, 2.4.3, 2.4.7, 2.4.11 |
| Touch | Targets at least 24 px everywhere (44 px or more for most); bigger buttons for younger students | 2.5.8 |

Settings follow each student to any Chromebook. A teacher can switch them on as an accommodation and never
sees what a student chose for themselves.

## Results of the last full check

Full run, October 27, 2026 (version 0.1). The run covered:
- **872 screens:** every student screen for all four ages, in English and French, at four sizes, with and
  without the biggest text, stronger contrast and more spacing; plus every teacher screen at four sizes.

The run found:
- **0 problems:** no axe WCAG A/AA violations, no overlapping or cut-off text, no sideways scrolling, no tap
  target under 24 px, no browser errors.
- **801 warnings, all the same:** the candle buttons in the lesson's top bar on phones and tablets were
  44 × 32 px. That passes WCAG 2.2 AA (24 px), but it's under 44 px, which we treat as the floor for young
  children. They were raised to 44 px after the run. Every age, in both languages, was then checked again at phone and
  tablet sizes, with and without the biggest text: **400 screens, 0 problems, 0 warnings**.

**Gloam check, added after the run:** automated checks can't see the painted Gloam, so a person
spotted the title's buttons over it on a big screen. Protégé now marks where Gloam stands, and the check
fails anything sitting on it. The first run of that check found 102 such cases, mostly on phones, upright
tablets and the biggest text. Gloam now stands above the words on every layout. Every student screen was
then checked again (824 screens): **0 problems, 0 warnings**.

The first full run found 77 problems. All were fixed before this one. For example:
- On phones with the biggest text, Gloam's words covered the headings.
- Some scrolling areas couldn't be reached by keyboard.
- The lesson file picker had no label.
- Long French button labels ran off the screen.
- French screens named the worlds in English.

## Known gaps and what hasn't been tested

- **Not yet tested with students who use screen readers, switch access or eye gaze every day.** Automated
  checks and a careful keyboard pass can't replace that. This is the most important next step.
- **Contrast over the painted worlds** can't be measured by automated tools, because the background is a
  painting. Words over the world always have a shading layer behind them, made near-solid by "stronger
  contrast", and were checked by eye.
- **Read-aloud** sounds natural when the school's computer has Gloam's voice set up ("Set up voices"). Without
  it, it uses the voices on the student's device, which sound more robotic. If neither is there, the button
  doesn't appear (rather than sending text to an online voice). Gloam's French voice sometimes misreads
  slang and joined words (like "vas-y").
- **Voice typing** is less accurate with background noise, young children's voices and strong accents.
  Students always see and can fix the words.
- **Sounds** are decorative only. Nothing important is said only by sound.
- **Teacher pages** follow the same rules but don't have their own "Ways to play". They use the browser's zoom
  (up to 200% reflows) and the operating system's settings.

To report a barrier: tell whoever runs Protégé at your school, or open an issue on the project. Barriers are
fixed first.
