/**
 * Builds Protégé's public website (Cloudflare Pages, see the README) into site-dist/: the home page, the setup
 * guide, privacy, and the whole school board pack, from the same documents as the code (so they never drift
 * apart). No trackers, no cookies, no third-party scripts or fonts: everything is served from the site itself,
 * and its headers (_headers) tell browsers to refuse anything else.
 *
 *   npm run site                     → site-dist/ (open site-dist/index.html)
 *   PROTEGE_REPO=owner/name npm run site    links the downloads to that repository's releases
 */
import fs from "node:fs";
import path from "node:path";
import { marked } from "marked";
import pkg from "../package.json";

const root = process.cwd();
const out = path.join(root, "site-dist");
const repo = process.env.PROTEGE_REPO ?? (pkg as { repository?: string }).repository?.replace(/^github:/, "");
const repoUrl = repo ? `https://github.com/${repo}` : "#";
const download = repo ? `${repoUrl}/releases/latest` : "#download";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** One page: the bar, the content, the footer. `depth` = how many folders down (for relative links) */
function page({ title, description, body, depth = 0, current, dark = false }: { title: string; description: string; body: string; depth?: number; current?: string; dark?: boolean }) {
  const up = "../".repeat(depth);
  const nav = [
    ["guide.html", "Set it up"],
    ["privacy.html", "Privacy"],
    ["board/accessibility.html", "Accessibility"],
    ["board/README.html", "For school boards"],
    [repoUrl, "Code"],
  ]
    .map(([href, label]) => `<a href="${href.startsWith("http") || href === "#" ? href : up + href}"${current === href ? ' aria-current="page"' : ""}>${label}</a>`)
    .join("");
  const bar = `<header class="wrap bar"><a class="mark voice" href="${up}index.html" aria-label="Protégé, home"><img src="${up}img/mark.svg" alt="" width="34" height="34">protégé</a><nav aria-label="Protégé">${nav}</nav></header>`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="referrer" content="no-referrer">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; img-src 'self' data:; style-src 'self'; font-src 'self'; script-src 'none'; base-uri 'self'; form-action 'none'">
<link rel="icon" href="${up}img/mark.svg" type="image/svg+xml">
<link rel="stylesheet" href="${up}style.css">
</head>
<body>
<a class="skip" href="#main">Skip to the content</a>
${dark ? body.replace("<!--BAR-->", bar) : `${bar}\n${body}`}
<footer><div class="wrap"><span>Protégé ${pkg.version}. Free software under the <a href="${repoUrl}/blob/main/LICENSE">GNU AGPL v3</a>. No trackers on this site, or in Protégé.</span><span><a href="${up}board/security.html">Security</a></span><span><a href="${repoUrl}">Source code</a></span></div></footer>
</body>
</html>
`;
}

/** A markdown document as a page (links to other .md files become .html) */
function doc(file: string, to: string, depth: number, current?: string) {
  const md = fs.readFileSync(file, "utf8").replaceAll("](DOWNLOAD)", `](${download})`);
  const html = (marked.parse(md, { async: false }) as string).replace(/href="([^"]+?)\.md(#[^"]*)?"/g, (_, p: string, h = "") => `href="${p}.html${h}"`);
  const title = md.match(/^# (.+)$/m)?.[1] ?? "Protégé";
  const back = depth ? `<a class="back" href="README.html">The school board pack</a>` : "";
  fs.mkdirSync(path.dirname(path.join(out, to)), { recursive: true });
  fs.writeFileSync(path.join(out, to), page({ title: `${title} · Protégé`, description: title, body: `<main id="main" class="doc paper wrap">${back}<article>${html}</article></main>`, depth, current }));
}

function home() {
  const body = `<div class="night">
<div class="hero">
<!--BAR-->
<div class="wrap lead" id="main">
  <div>
    <h1>The student is the teacher.</h1>
    <p class="say">Gloam is confused about your lesson. Your students explain it in their own words until it gets it. They learn by teaching, and you see exactly what they understand.</p>
    <div class="buttons">
      <a class="btn primary" href="${download}">Download Protégé</a>
      <a class="btn quiet" href="guide.html">Read the setup guide</a>
    </div>
    <p class="small">Free and open source. For Windows and Mac. Runs on one school computer, AI included, and nothing about your students ever leaves it.</p>
  </div>
  <figure class="screen"><img src="img/teach.webp" width="1366" height="768" alt="A student's screen: Gloam, an orange creature with a lantern, stands in a night valley. Its speech bubble says it figured out seasons: summer is when Earth gets closer to the sun. Below is a box to explain it to Gloam."></figure>
</div>
</div>
</div>

<main class="paper">
<section class="wrap" aria-labelledby="lesson">
  <h2 id="lesson">A lesson, from both sides</h2>
  <p class="intro">Nothing in Protégé looks like a test. Students win by explaining, and you get the clearest picture of their thinking you've ever had.</p>
  <div class="steps">
    <div class="step">
      <div class="words"><p class="when">Before class</p><h3>You bring your own lesson</h3><p>Upload your notes, slides or a Word file. Gloam drafts the lesson on your computer: the key ideas, the wrong ideas students usually have, and the questions it will ask. You read it, change anything, and approve it. Students only ever see what you approved.</p></div>
      <figure class="shot"><img src="img/review.webp" width="1366" height="768" alt="The teacher's lesson page: the lesson title, its grade and language, and Gloam's wrong theory, ready to edit and approve." loading="lazy"><figcaption>Every lesson is yours to check and change.</figcaption></figure>
    </div>
    <div class="step">
      <div class="words"><p class="when">In class</p><h3>Students teach a confused, funny companion</h3><p>Gloam starts out confidently wrong. It asks questions, misunderstands in believable ways, and slowly gets it. Each idea it finally understands lights a candle on its journey. Gloam never gives the answer away. It's the one learning.</p></div>
      <figure class="shot"><img src="img/eureka.webp" width="1366" height="768" alt="Gloam with its arms up and its lantern lit: 'oh. You taught Gloam: the tilt.'" loading="lazy"><figcaption>When an idea clicks, Gloam's lantern lights up.</figcaption></figure>
    </div>
    <div class="step">
      <div class="words"><p class="when">While they teach</p><h3>You see what they understand</h3><p>Each student's candles show which ideas they explained well and where they're stuck. "What the class thinks" shows the wrong ideas many students said out loud. Read any conversation, and correct any candle: the candles are Gloam's estimate, never a mark.</p></div>
      <figure class="shot"><img src="img/dashboard.webp" width="1366" height="768" alt="The teacher's class page: students' candles for each idea, and 'what the class thinks'." loading="lazy"><figcaption>No grading. Just what each student understands.</figcaption></figure>
    </div>
  </div>
</section>
</main>

<div class="night">
<section class="wrap" aria-labelledby="grades">
  <h2 id="grades">One idea, every grade</h2>
  <p class="intro">The class's grade picks the world, the words and the Gloam. A kindergartner and a grade 12 student both teach, but nothing feels too babyish or too hard.</p>
  <div class="worlds">
    <figure class="world"><img src="img/little.webp" width="1366" height="768" alt="A sunny storybook meadow with a round, bright Gloam." loading="lazy"><figcaption><b>Kindergarten to grade 2</b><span>A sunny meadow, tiny words, big buttons, and read-aloud and talking on from the start.</span></figcaption></figure>
    <figure class="world"><img src="img/junior.webp" width="1366" height="768" alt="A storybook forest with mushroom houses and a playful Gloam." loading="lazy"><figcaption><b>Grades 3 to 5</b><span>A mushroom forest and a cheeky, playful Gloam.</span></figcaption></figure>
    <figure class="world"><img src="img/middle.webp" width="1366" height="768" alt="Windy sea cliffs at twilight with a dramatic Gloam in a scarf." loading="lazy"><figcaption><b>Grades 6 to 8</b><span>Windy cliffs and a goofy, very dramatic Gloam.</span></figcaption></figure>
    <figure class="world"><img src="img/senior.webp" width="1366" height="768" alt="A moody night valley with a deadpan Gloam." loading="lazy"><figcaption><b>Grades 9 to 12</b><span>A night valley and a dry, deadpan Gloam who hates being wrong.</span></figcaption></figure>
  </div>
</section>
</div>

<main class="paper">
<section class="wrap two" aria-labelledby="access">
  <div>
    <h2 id="access">Every student can play</h2>
    <p class="intro">Every student screen has "Ways to play". The settings follow each student to any Chromebook, and teachers can switch them on as an accommodation.</p>
    <ul class="plain">
      <li><b>Talk instead of typing.</b> Their voice is turned into words on the school's computer and never saved.</li>
      <li><b>Read aloud</b> Gloam's words, the steps and the recap.</li>
      <li><b>Bigger text, stronger contrast, more spacing</b> or a <b>dyslexia-friendly font</b>, and <b>less motion</b>.</li>
      <li>Every screen works with a <b>keyboard alone</b> and with <b>screen readers</b>, in English and French.</li>
    </ul>
    <div class="buttons"><a class="btn quiet" href="board/accessibility.html">How accessibility was checked</a></div>
  </div>
  <figure class="shot"><img src="img/ways.webp" width="1366" height="768" alt="The 'Ways to play' panel: talk instead of typing, read Gloam's words aloud, text size, stronger contrast, easier reading, less motion, sound." loading="lazy"></figure>
</section>

<section class="wrap two" aria-labelledby="private">
  <div>
    <h2 id="private">Private by design</h2>
    <p class="intro">Made for schools from the first line of code, starting with Ontario's privacy and accessibility laws.</p>
  </div>
  <ul class="plain">
    <li><b>Nothing leaves the school's computer.</b> Protégé, its AI and voice typing all run there. Its makers never receive anything.</li>
    <li><b>Nicknames, not names.</b> No emails, birthdays or photos.</li>
    <li><b>Students are told Gloam is an AI</b>, who reads what they write, and how to ask to see or delete it.</li>
    <li><b>No trackers, ads or analytics</b>, enforced by a strict security policy.</li>
    <li><b>Deleted on the board's schedule</b>, with tools to download, correct or delete one student's information.</li>
  </ul>
</section>

<div class="board">
<section class="wrap" aria-labelledby="boards">
  <h2 id="boards">For school boards</h2>
  <p class="intro">Everything a privacy officer, IT department or principal needs to say yes.</p>
  <ul class="docs">
    <li><a href="board/data-inventory.html">Data inventory</a><span>Every piece of information, why, who sees it, when it's deleted</span></li>
    <li><a href="board/privacy-impact-assessment.html">Privacy impact assessment</a><span>Pre-filled for Protégé; your board completes its parts</span></li>
    <li><a href="board/family-notice.html">Notice to families (EN/FR)</a><span>Ready to send, covering O. Reg. 52/26</span></li>
    <li><a href="board/ai-transparency.html">AI transparency</a><span>What the AI does, human oversight, known limits</span></li>
    <li><a href="board/security.html">Security summary</a><span>Accounts, sessions, headers, supply chain</span></li>
    <li><a href="board/hosting-for-boards.html">Running it for a school</a><span>Board-managed computers, encryption, network, backups</span></li>
    <li><a href="board/breach-response.html">If something goes wrong</a><span>Breach steps and the access log</span></li>
    <li><a href="board/accessibility.html">Accessibility conformance</a><span>WCAG 2.2 AA status and how it was tested</span></li>
  </ul>
</section>
</div>
</main>`;
  fs.writeFileSync(
    path.join(out, "index.html"),
    page({ title: "Protégé: the student is the teacher", description: "A free, open-source classroom app where students learn by teaching Gloam, a confused, funny AI companion. Runs on one school computer; nothing about students leaves it.", body, dark: true }),
  );
}

function main() {
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  fs.copyFileSync(path.join(root, "site", "style.css"), path.join(out, "style.css"));
  // fonts (SIL Open Font License), served from the site itself
  const fonts = path.join(out, "fonts");
  fs.mkdirSync(fonts);
  const nm = (p: string) => path.join(root, "node_modules", p);
  fs.copyFileSync(nm("@fontsource/atkinson-hyperlegible-next/files/atkinson-hyperlegible-next-latin-400-normal.woff2"), path.join(fonts, "atkinson-400.woff2"));
  fs.copyFileSync(nm("@fontsource/atkinson-hyperlegible-next/files/atkinson-hyperlegible-next-latin-700-normal.woff2"), path.join(fonts, "atkinson-700.woff2"));
  fs.copyFileSync(nm("@fontsource-variable/recursive/files/recursive-latin-full-normal.woff2"), path.join(fonts, "recursive.woff2"));
  // (file by file: Node's own folder copy crashes on Windows with Node 25)
  fs.mkdirSync(path.join(out, "img"));
  for (const f of fs.readdirSync(path.join(root, "site", "img"))) fs.copyFileSync(path.join(root, "site", "img", f), path.join(out, "img", f));
  home();
  doc(path.join(root, "site", "content", "guide.md"), "guide.html", 0, "guide.html");
  doc(path.join(root, "site", "content", "privacy.md"), "privacy.html", 0, "privacy.html");
  for (const f of fs.readdirSync(path.join(root, "docs", "board")).filter((x) => x.endsWith(".md"))) {
    doc(path.join(root, "docs", "board", f), `board/${f.replace(/\.md$/, ".html")}`, 1, f === "README.md" ? "board/README.html" : f === "accessibility.md" ? "board/accessibility.html" : undefined);
  }
  // Cloudflare Pages reads this: nothing from anywhere else may load, no referrer leaves the site, and
  // the site can't be framed or use the camera, mic or location
  fs.writeFileSync(
    path.join(out, "_headers"),
    [
      "/*",
      "  Content-Security-Policy: default-src 'none'; style-src 'self'; img-src 'self'; font-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
      "  Referrer-Policy: no-referrer",
      "  X-Content-Type-Options: nosniff",
      "  Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=(), browsing-topics=()",
      "  Cross-Origin-Opener-Policy: same-origin",
      "",
    ].join("\n"),
  );
  console.log(`Site built in site-dist/ (${repo ? `downloads: ${download}` : "set PROTEGE_REPO to link the downloads"}).`);
}

main();
