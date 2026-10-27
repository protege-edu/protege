import type { ReactNode } from "react";
import { CandleMark, Shell } from "./kit";

/** "How Protégé works", for teachers: one page, plain words, nothing to log in to understand */
export function Help() {
  return (
    <Shell back={{ href: "/teacher", label: "Teacher home" }} title="How Protégé works">
      <div className="mt-4 max-w-[68ch] text-md text-ink">
        <p className="text-lg text-ink-dim">Your students teach. Gloam learns. You see what they think.</p>

        <Part title="What students do">
          <p>
            Each student gets their own Gloam, a small creature who is confidently wrong about your lesson. They explain the ideas in their own words until Gloam gets them. Nothing is graded and
            nothing looks like a test. Gloam never gives the answers away. It&apos;s the one learning.
          </p>
          <p>
            Every idea in the lesson is a candle on Gloam&apos;s path. It lights up as Gloam understands it, and Gloam walks on to the next one. At the end, students see &ldquo;What you taught Gloam&rdquo;,
            written from your approved lesson (not by the AI), so they always leave with the right ideas.
          </p>
        </Part>

        <Part title="Reading the candles">
          <ul className="space-y-2">
            <Row mark={<CandleMark level={0} size={24} />}>Not yet: they haven&apos;t explained this idea.</Row>
            <Row mark={<CandleMark level={1} size={24} />}>A spark: they touched on it.</Row>
            <Row mark={<CandleMark level={2} size={24} />}>Flickering: almost there, part of it is still missing.</Row>
            <Row mark={<CandleMark level={3} size={24} />}>Lit: they explained it well enough for Gloam to get it.</Row>
            <Row mark={<CandleMark level={0} stuck size={24} />}>Stuck: they&apos;ve tried this idea a few times without progress. A good moment to check in.</Row>
          </ul>
          <p>
            <span className="font-bold">What the class thinks</span> shows the wrong ideas many students said out loud, like &ldquo;7 of 12 think summer is when Earth is closer to the sun&rdquo;. When it&apos;s a
            lot of the class, that&apos;s worth a quick whole-class discussion. Click a student&apos;s nickname to read their whole conversation with Gloam.
          </p>
        </Part>

        <Part title="Your lessons">
          <p>
            Upload your notes (PDF, PowerPoint, Word, or pasted text). Gloam reads them on this laptop and drafts a lesson: the key ideas, the wrong ideas students often have, the questions Gloam will ask
            and its story. You review it and change anything. <span className="font-bold">Students only ever see lessons you approved.</span>
          </p>
        </Part>

        <Part title="During class">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <span className="font-bold">Show the code:</span> put it on the projector. Students go to the address (or scan the QR code), type the class code, pick a nickname and secret pictures.
            </li>
            <li>
              <span className="font-bold">Pause the class:</span> Gloam falls asleep for everyone until you wake the class up. Handy when you want their eyes on you.
            </li>
            <li>
              <span className="font-bold">Forgot their pictures:</span> open the student and press Reset their pictures. They pick new ones next time.
            </li>
            <li>Students can sign in on any Chromebook and carry on where they left off. Gloam remembers what each student taught it, all year.</li>
          </ul>
        </Part>

        <Part title="Every student can play">
          <p>
            Every student screen has a <span className="font-bold">Ways to play</span> button (&ldquo;How I play&rdquo; for the youngest). Students can switch on what helps them, and it follows them to any
            Chromebook:
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <span className="font-bold">Talk instead of typing.</span> They press the mic, talk, and their words appear in the box to check before sending. Their voice is turned into words on this laptop
              and never saved. It&apos;s never sent to an online speech service. (Run <code className="rounded bg-chip px-1">npm run voice:setup</code> once to turn it on.)
            </li>
            <li>
              <span className="font-bold">Read aloud:</span> Gloam&apos;s words, the join steps and the recap, by a button or every line. It uses the voices on the student&apos;s device.
            </li>
            <li>
              <span className="font-bold">Bigger text</span> (two sizes up), <span className="font-bold">stronger contrast</span>, <span className="font-bold">easier reading</span> (more space, or a
              dyslexia-friendly font), <span className="font-bold">less motion</span>, and sound on or off.
            </li>
          </ul>
          <p>
            For an accommodation, open the student on your class page and use <span className="font-bold">Ways to play for them</span>. Only you see these settings. They never show up in class
            summaries or the spreadsheet.
          </p>
        </Part>

        <Part title="Privacy, in plain words">
          <ul className="list-disc space-y-2 pl-5">
            <li>Students only have a nickname. No real names, emails, birthdays or photos.</li>
            <li>Their secret pictures are stored scrambled, like a password.</li>
            <li>If you let a class use Google, Protégé only learns that it&apos;s the same account as last time. Never a name, email or photo.</li>
            <li>Everything stays on the laptop running Protégé, including the AI. Nothing is sent to an outside company. No ads, no tracking.</li>
            <li>Voice typing happens on this laptop too. Recordings are never saved.</li>
            <li>
              Classes are cleared out by your school board&apos;s rule (by default, a year after a class was last used). You can set a date for any class, or delete a class or a student
              yourself.
            </li>
            <li>
              A student or family asks what&apos;s kept? Open the student and press <span className="font-bold">Download their data</span>. You can also change their nickname, correct any
              candle, or remove them.
            </li>
            <li>Students are told that Gloam is an AI, that its candles are an estimate and not a mark, and that you can read what they write.</li>
            <li>Other teachers on this Protégé can&apos;t see your classes or lessons.</li>
          </ul>
        </Part>

        <Part title="Accessibility">
          <p>
            Protégé aims to meet <span className="font-bold">WCAG 2.2 level AA</span> on every screen, for students and teachers. Every screen works with a keyboard alone, shows where the keyboard is,
            works with screen readers (Gloam&apos;s words and candle changes are announced), respects &ldquo;reduce motion&rdquo;, and fits from a phone to a projector.
          </p>
          <p>
            How it&apos;s checked: an automatic accessibility test (axe) and a check for overlapping or cut-off text on every screen, in every age style, in English and French, at four screen sizes, with
            bigger text and stronger contrast on. Gloam&apos;s painted world is decoration, so screen readers skip it and hear the words instead.
          </p>
          <p>
            Not yet done: testing with students who use screen readers or switch access every day. If something gets in a student&apos;s way, tell whoever runs Protégé, and it&apos;ll be fixed first.
          </p>
        </Part>

        <Part title="If something goes wrong">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <span className="font-bold">&ldquo;Gloam&apos;s brain isn&apos;t running&rdquo;:</span> the Ollama app is closed on the laptop. Open it, then students press Try again. Nothing they typed is lost.
            </li>
            <li>
              <span className="font-bold">Students can&apos;t reach the address:</span> the laptop went to sleep, or it&apos;s on a different network. Keep it awake and plugged in during class.
            </li>
            <li>
              <span className="font-bold">You forgot your password:</span> use your recovery code on the sign-in page. Lost that too? Whoever runs this Protégé can make a new one for you.
            </li>
          </ul>
        </Part>
      </div>
    </Shell>
  );
}

function Part({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10 space-y-3">
      <h2 className="text-lg font-bold text-ink">{title}</h2>
      {children}
    </section>
  );
}

function Row({ mark, children }: { mark: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-center gap-3">
      <span className="flex w-7 justify-center">{mark}</span>
      <span>{children}</span>
    </li>
  );
}
