/**
 * The homepage: one continuous night valley, told in chapters (site/js/home.ts makes them move).
 * Everything here is real HTML first: with no JavaScript, or with reduced motion, it's a complete page.
 */
export interface Links {
  windows: string;
  mac: string;
  windowsZip: string;
  macZip: string;
  repo: string;
}

const layers = (k: number) => `<img class="layer" src="art/senior/valley-${k}-dark.webp" alt=""><img class="layer lit" data-lit src="art/senior/valley-${k}-lit.webp" alt="">`;

/** A candle, as in the app: unlit, smoldering, flickering or steady (steady is gold: understood) */
export const candle = (state: "unlit" | "smolder" | "flicker" | "steady", label?: string) =>
  `<span class="candle is-${state}"${label ? ` role="img" aria-label="${label}"` : ' aria-hidden="true"'}><svg viewBox="0 0 20 34"><path class="flame" d="M10 2c3 5 5.5 7.5 5.5 11a5.5 5.5 0 0 1-11 0C4.5 9.5 7 7 10 2z"/><rect class="wax" x="5" y="18" width="10" height="15" rx="2"/></svg></span>`;

const students: [string, ("unlit" | "smolder" | "flicker" | "steady")[]][] = [
  ["Moss Otter", ["steady", "steady", "flicker", "smolder"]],
  ["Comet", ["steady", "flicker", "flicker", "unlit"]],
  ["Pixel Fern", ["flicker", "smolder", "unlit", "unlit"]],
  ["Bluejay", ["steady", "steady", "steady", "flicker"]],
  ["Quiet Storm", ["smolder", "unlit", "unlit", "unlit"]],
  ["Noodle", ["steady", "flicker", "smolder", "smolder"]],
];
const ideas = ["The tilt", "Direct light", "Day length", "Hemispheres"];

export function homeBody(l: Links, bar: string): string {
  return `
<div class="stage" id="stage" aria-hidden="true">
  ${layers(0)}${layers(1)}${layers(2)}${layers(3)}
  <img class="gloam-still" src="img/gloam-confused.webp" alt="">
  <div class="gloam-canvas"></div>
  <div class="shade"></div>
</div>
<div class="bubble" id="bubble" hidden><p class="voice" id="say" aria-live="polite"></p></div>
<button class="poke" id="poke" type="button" aria-label="Poke Gloam" hidden></button>

${bar}

<main id="main">
<section class="ch hero" data-scene="hero" aria-labelledby="hero-title">
  <div class="wrap">
    <h1 id="hero-title" class="voice">The student is the teacher.</h1>
    <p class="lede">Gloam is confused about your lesson. Your students explain it, in their own words, until it gets it. They learn by teaching, and you see exactly what they understand.</p>
    <div class="buttons">
      <a class="btn primary" data-download href="${l.windows}">Download Protégé</a>
      <a class="btn quiet" href="#teach">See how it works</a>
    </div>
    <p class="small" data-download-note>Free for every school, for Windows and Mac. It runs on one teacher laptop, AI included, and nothing about your students ever leaves it.</p>
  </div>
  <p class="say-static voice" aria-hidden="true">ok so i figured out seasons by myself. summer = earth gets closer to the sun. not complicated.</p>
</section>

<section class="ch teach" id="teach" data-scene="teach" aria-labelledby="teach-title">
  <div class="pin">
    <div class="wrap">
      <h2 id="teach-title" class="voice">Students explain. Gloam gets it.</h2>
      <p class="lede">Gloam starts out confidently wrong. A student sets it straight, in their own words.</p>
    </div>
    <div class="teach-bottom">
      <div class="clicked">
        <p class="got">${candle("steady")} <span>You taught Gloam <b>the tilt</b>.</span></p>
        <p class="small">No quiz, no marks. When an idea finally clicks, Gloam's lantern lights up, and the valley with it.</p>
      </div>
      <div class="teachbox" role="group" aria-label="A student explaining to Gloam">
        <p class="typed" id="explain">Nope. Earth is tilted. In June our half leans toward the sun, so the light hits us more directly and the days are longer. That's summer.</p>
        <span class="send" aria-hidden="true">Teach</span>
      </div>
    </div>
  </div>
</section>

<section class="ch turn" id="turn" data-scene="turn" aria-labelledby="turn-title">
  <div class="wrap">
    <h2 id="turn-title" class="voice">Your turn. Gloam has a new theory.</h2>
    <p class="lede">Why does a metal spoon feel colder than a wooden one, even when they've been in the same room all day?</p>
    <p class="theory voice">“metal is a cold material. it was born that way.”</p>
    <div class="choices" role="group" aria-label="Pick what you'd tell Gloam">
      <button type="button" data-choice="wrong">“Yep, metal is just colder.”</button>
      <button type="button" data-choice="half">“Metal moves heat faster.”</button>
      <button type="button" data-choice="right">“They're the same temperature, but metal pulls heat out of your hand faster, so your hand gets colder.”</button>
    </div>
    <div class="result" aria-live="polite"><p class="reply voice"></p><p class="note"></p></div>
    <p class="small">In class, Gloam reads whatever students write, using the AI on your school's computer. This preview uses written answers.</p>
  </div>
</section>

<section class="ch teachers paper" id="teachers" aria-labelledby="teachers-title">
  <div class="wrap">
    <h2 id="teachers-title">Zero grading. A clear picture of every student.</h2>
    <div class="tsteps">
      <div class="tstep" data-step="0">
        <h3>Bring your own lesson</h3>
        <p>Upload your notes, slides, a PDF or a Word file. Gloam drafts the lesson on your computer: the key ideas, the wrong ideas students usually have, and the questions it will ask.</p>
        <figure class="visual v-notes"><div class="notes"><p class="nhead">My notes: why we have seasons</p><p class="typed" data-type="Earth's axis is tilted 23.5°. When a hemisphere leans toward the sun, sunlight is more direct and days are longer: summer. Common mix-up: summer is when Earth is closest to the sun (it isn't!).">Earth's axis is tilted 23.5°. When a hemisphere leans toward the sun, sunlight is more direct and days are longer: summer. Common mix-up: summer is when Earth is closest to the sun (it isn't!).</p></div><ol class="drafted"><li>${candle("unlit")} The tilt</li><li>${candle("unlit")} Direct light</li><li>${candle("unlit")} Day length</li><li>${candle("unlit")} Hemispheres</li></ol></figure>
      </div>
      <div class="tstep" data-step="1">
        <h3>You approve it</h3>
        <p>Read Gloam's draft, change anything, and approve it. Students only ever see a lesson you approved.</p>
        <figure class="visual"><img src="img/review.webp" width="1366" height="768" alt="The teacher's lesson page: the title, grade and language, and Gloam's wrong theory, ready to edit and approve." loading="lazy"></figure>
      </div>
      <div class="tstep" data-step="2">
        <h3>Watch the candles light up</h3>
        <p>Each student's candles show which ideas they explained well and where they're stuck. "What the class thinks" shows the wrong ideas many students said out loud. Candles are Gloam's estimate, never a mark, and you can correct any of them.</p>
        <figure class="visual v-class">
          <table class="class">
            <caption class="sr-only">Pretend students and their candles</caption>
            <thead><tr><th scope="col">Student</th>${ideas.map((i) => `<th scope="col">${i}</th>`).join("")}</tr></thead>
            <tbody>${students.map(([n, c]) => `<tr><th scope="row">${n}</th>${c.map((s, i) => `<td>${candle(s, `${ideas[i]}: ${s === "steady" ? "explained well" : s === "flicker" ? "getting there" : s === "smolder" ? "just started" : "not yet"}`)}</td>`).join("")}</tr>`).join("")}</tbody>
          </table>
          <p class="thinks"><b>What the class thinks:</b> 9 students said Earth is closer to the sun in summer.</p>
        </figure>
      </div>
    </div>
  </div>
</section>

<section class="ch worlds" id="worlds" aria-labelledby="worlds-title">
  <div class="pin">
    <div class="wrap"><h2 id="worlds-title" class="voice">One idea, every grade.</h2><p class="lede">The class's grade picks the world, the words and the Gloam. Nothing feels too babyish, or too hard.</p></div>
    <div class="track">
      <figure><img src="img/little.webp" width="1366" height="768" alt="A sunny storybook meadow with a round, bright Gloam." loading="lazy"><figcaption><b>Kindergarten to grade 2</b> A sunny meadow, tiny words, big buttons, and read-aloud on from the start.</figcaption></figure>
      <figure><img src="img/junior.webp" width="1366" height="768" alt="A storybook forest with mushroom houses and a playful Gloam." loading="lazy"><figcaption><b>Grades 3 to 5</b> A mushroom forest and a cheeky, playful Gloam.</figcaption></figure>
      <figure><img src="img/middle.webp" width="1366" height="768" alt="Windy sea cliffs at twilight with a dramatic Gloam in a scarf." loading="lazy"><figcaption><b>Grades 6 to 8</b> Windy cliffs and a goofy, very dramatic Gloam.</figcaption></figure>
      <figure><img src="img/senior.webp" width="1366" height="768" alt="A moody night valley with a deadpan Gloam." loading="lazy"><figcaption><b>Grades 9 to 12</b> A night valley and a dry, deadpan Gloam who hates being wrong.</figcaption></figure>
    </div>
  </div>
</section>

<section class="ch private" id="private" data-scene="private" aria-labelledby="private-title">
  <div class="wrap">
    <div class="words">
      <h2 id="private-title" class="voice">Nothing leaves the laptop.</h2>
      <ul class="plain">
        <li><b>Protégé, its AI and voice typing all run on one school computer.</b> Its makers never receive anything about anyone.</li>
        <li><b>Nicknames, not names.</b> No emails, birthdays or photos. Students sign in with secret pictures.</li>
        <li><b>Students are told Gloam is an AI</b>, and who can read what they write.</li>
        <li><b>No trackers, ads or analytics</b>, in Protégé or on this website.</li>
        <li><b>Deleted on your school board's schedule</b>, with tools to see, correct or delete one student's information.</li>
      </ul>
      <a class="btn quiet" href="privacy.html">Privacy, in plain words</a>
    </div>
    <svg class="net" viewBox="0 0 520 420" role="img" aria-label="Students' Chromebooks connect only to the teacher's laptop. Nothing goes out to the internet.">
      <g class="cloud"><path d="M396 64a28 28 0 0 1 54-8 22 22 0 0 1 28 30h-96a20 20 0 0 1 14-22z"/><text x="430" y="112">the internet</text></g>
      <path class="leak" d="M262 196 Q 360 120 420 92"/>
      <g class="stop" transform="translate(352 132)"><circle r="15"/><path d="M-6 -6 6 6M6 -6-6 6"/></g>
      ${[
        [90, 110],
        [70, 250],
        [150, 360],
        [372, 360],
        [452, 250],
      ]
        .map(([x, y]) => `<path class="thread" d="M${x} ${y} Q ${(x + 260) / 2} ${(y + 220) / 2 - 30} 260 220"/><g class="book" transform="translate(${x - 26} ${y - 18})"><rect width="52" height="34" rx="4"/><rect class="screen" x="5" y="5" width="42" height="22" rx="2"/></g>`)
        .join("")}
      <g class="laptop" transform="translate(212 186)"><rect width="96" height="62" rx="6"/><rect class="screen" x="8" y="8" width="80" height="46" rx="3"/><path d="M-12 66h120l-8 10H-4z"/></g>
      <text class="lbl" x="260" y="290">the school laptop</text>
    </svg>
  </div>
</section>

<section class="ch ways paper" id="ways" aria-labelledby="ways-title">
  <div class="wrap">
    <div class="words">
      <h2 id="ways-title">Every student can play</h2>
      <p class="lede">Every student screen has "Ways to play". Try them here: they change the preview, like they change Protégé.</p>
      <div class="toggles" role="group" aria-label="Ways to play">
        <button type="button" aria-pressed="false" data-way="big">Bigger text</button>
        <button type="button" aria-pressed="false" data-way="contrast">Stronger contrast</button>
        <button type="button" aria-pressed="false" data-way="space">Easier reading</button>
        <button type="button" aria-pressed="false" data-way="read">Read it to me</button>
      </div>
      <p class="small">Also: talk instead of typing (turned into words on the school's computer, never saved), less motion, and full keyboard and screen reader support, in English and French. The settings follow each student to any Chromebook.</p>
      <a class="btn quiet" href="board/accessibility.html">How accessibility was checked</a>
    </div>
    <figure class="mini" id="mini" aria-label="A preview of a student's screen">
      <p class="mini-say voice">wait. so the spoon is stealing my heat?</p>
      <div class="mini-box"><span>Explain it to Gloam…</span><b>Teach</b></div>
    </figure>
  </div>
</section>

<section class="ch get" id="download" data-scene="download" aria-labelledby="get-title">
  <div class="wrap">
    <h2 id="get-title" class="voice">Wake Gloam up on your laptop.</h2>
    <p class="lede">One download. No accounts with anyone, no credit card, nothing to pay, ever.</p>
    <div class="buttons">
      <a class="btn primary big" data-download href="${l.windows}">Download Protégé</a>
    </div>
    <p class="small" data-download-note>For Windows 10 and 11, and Mac. About 60 MB, then Gloam's brain downloads by itself (a few GB, once).</p>
    <ol class="how">
      <li><b>Open the installer.</b> <span data-os-only="windows">If Windows says it "protected your PC", choose More info, then Run anyway. (Protégé is free, so it isn't paid-signed.)</span><span data-os-only="mac">Drag Protégé into Applications. The first time, open it from System Settings, Privacy &amp; Security, then Open Anyway.</span></li>
      <li><b>Gloam wakes up.</b> Protégé opens in your browser and sets itself up while you make your account.</li>
      <li><b>Make a class.</b> Students join from their Chromebooks with a short code. Nothing to install for them.</li>
    </ol>
    <figure class="setupshot"><img src="img/setup.webp" width="1366" height="768" alt="Protégé setting itself up: Gloam asleep in the night valley while its brain downloads, and a card to make your teacher account." loading="lazy"></figure>
    <p class="others">Other downloads: <a href="${l.windows}">Windows installer</a>, <a href="${l.mac}">Mac</a>, and for school IT, the portable <a href="${l.windowsZip}">Windows zip</a> and <a href="${l.macZip}">Mac zip</a>. <a href="guide.html">The setup guide</a> has everything else.</p>
  </div>
</section>

<section class="ch boards paper" id="boards" aria-labelledby="boards-title">
  <div class="wrap">
    <h2 id="boards-title">For school boards</h2>
    <p class="lede">Everything a privacy officer, IT department or principal needs to say yes. Built for Ontario's laws first, and the strictest rules worldwide.</p>
    <ul class="docs">
      <li><a href="board/data-inventory.html">Data inventory</a><span>Every piece of information, why, who sees it, when it's deleted</span></li>
      <li><a href="board/privacy-impact-assessment.html">Privacy impact assessment</a><span>Pre-filled for Protégé; your board completes its parts</span></li>
      <li><a href="board/family-notice.html">Notice to families (EN/FR)</a><span>Ready to send</span></li>
      <li><a href="board/ai-transparency.html">AI transparency</a><span>What the AI does, human oversight, known limits</span></li>
      <li><a href="board/security.html">Security summary</a><span>Accounts, sessions, headers, supply chain</span></li>
      <li><a href="board/hosting-for-boards.html">Running it for a school</a><span>Board-managed computers, network, backups</span></li>
      <li><a href="board/breach-response.html">If something goes wrong</a><span>Breach steps and the access log</span></li>
      <li><a href="board/accessibility.html">Accessibility conformance</a><span>WCAG 2.2 AA, and how it was tested</span></li>
    </ul>
  </div>
</section>
</main>`;
}
