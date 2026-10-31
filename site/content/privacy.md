# Privacy at a glance

For students, families and teachers. The full details are in the [data inventory](board/data-inventory.html).

## The short version

- **Students use a nickname**, not their name, and sign in with secret pictures. No emails, birthdays, photos
  or addresses are collected.
- **Protégé is a website, and its information is kept online.** Classes, lessons, nicknames and what students
  taught Gloam are stored in Protégé's database (Turso, in the United States). The app itself runs on Vercel,
  also in the United States. Nothing is kept on the school's computers.
- **Gloam's brain is Claude**, an AI made by Anthropic. Students are told so, in words for their age.
- **What a student writes to Gloam** is seen by them and their teacher, and sent to Claude so Gloam can answer.
  It isn't sold, shared or used for ads.
- **Gloam's candles** are an estimate of how well an idea was explained, never a mark. Teachers can correct
  them.
- **Nothing tracks anyone.** There are no analytics, ads, trackers or third-party scripts.
- **Information is deleted** by the school board's rule (by default, a year after a class was last used).
- **You can ask** to see, correct or delete a student's information. Ask the teacher, who can download all of
  it in one file, fix it, or delete it.

## What goes to Claude

When a student writes to Gloam, Protégé sends Claude the lesson, Gloam's instructions, and what the student
wrote along with the recent conversation. It **never** sends the student's nickname or anything that says who
they are. When a teacher adds a lesson, Claude gets the text they chose from their notes.

Anthropic doesn't use what Protégé sends to train its AI.

## Lesson files

When a teacher adds a PDF, PowerPoint or Word file, it's read in their own browser. The file is never uploaded:
only the text they choose is sent to Protégé.

## Voice typing

When a student presses the mic, their own device turns their voice into words. The recording is never saved
or sent anywhere, not to Protégé and not to a speech company. If a device can't do that by itself, the mic
doesn't show. The words appear in the student's box so they can fix them before sending.

## Read-aloud

Read-aloud uses the voices already on the student's device. What it reads is never sent anywhere to be spoken.

## Accessibility settings

Students can choose settings like bigger text, read-aloud or a dyslexia-friendly font. These can say something
personal, so a teacher never sees what a student chose for themselves. A teacher only sees the
accommodations they switched on.

## Google

Only if a teacher turns it on for a class, students can sign in with their school Google account. Protégé
then keeps only a scrambled account number: no name, email or photo.

## This website

This website is information, and the page where students type their class code (/j). That page finds
their class and doesn't keep anything they type. The website has no
cookies, sign-ins, analytics, ads or trackers, and loads nothing from other websites. It remembers one thing,
on your own device only: whether you switched Gloam's voice on.

It's part of Protégé, hosted by Vercel. Like any website host, Vercel sees the internet address of whoever
visits, so it can deliver the pages and block attacks.

## Questions

Ask your teacher or school. Schools can find everything their privacy officer needs in the
[school board pack](board/README.html).
