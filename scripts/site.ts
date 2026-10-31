/**
 * Builds Protégé's website into the app's public/ folder, so the app serves it at its own address (one place
 * for everything): the home page (/), the guide, privacy, the join page (/j), and the whole school board pack,
 * from the same documents as the code (so they never drift apart). No trackers, no cookies, no third-party
 * scripts or fonts: everything is served from Protégé itself, and each page's security policy refuses anything else.
 * The files it makes are listed in MADE (and ignored by git); next.config.ts gives / /fr /j /fr/j their pages.
 *
 *   npm run site                              → public/ (npm run dev and the Vercel build run it first)
 *   PROTEGE_REPO=owner/name npm run site      links "Code" to that repository
 */
import fs from "node:fs";
import path from "node:path";
import { build } from "esbuild";
import { marked } from "marked";
import pkg from "../package.json";
import { COPY, type Lang, type SiteCopy } from "../site/i18n";
import { homeBody, type Links } from "../site/pages/home";

const root = process.cwd();
const out = path.join(root, "public");
/** What the website adds to public/ (the app's own files there, like art/, are left alone) */
const MADE = ["index.html", "guide.html", "privacy.html", "style.css", "board", "fr", "j", "js", "img", "fonts", "audio"];
const repo = process.env.PROTEGE_REPO ?? (pkg as { repository?: string }).repository?.replace(/^github:/, "");
const repoUrl = repo ? `https://github.com/${repo}` : "#";
// (the join page is /j in English, /fr/j in French)
const links = (lang: Lang): Links => {
  const fr = lang === "fr" ? "/fr" : "";
  return { teacher: "/teacher", join: `${fr}/j`, repo: repoUrl, guide: `${fr}/guide.html`, privacy: `${fr}/privacy.html` };
};

/** A page's address: "fr/index.html" is /fr, "j/index.html" is /j, the rest as they are */
const href = (at: string) => `/${at.replace(/(^|\/)index\.html$/, "")}`;

/** The security policy in every page (the app adds its own on top): only Protégé, nothing else, ever */
const CSP = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; media-src 'self'; base-uri 'none'; form-action 'none'";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** A page's twin in the other language (the board pack is in English: its French twin is the French home) */
function twin(at: string, lang: Lang): string {
  if (lang === "fr") return at.replace(/^fr\//, "");
  return ["index.html", "guide.html", "privacy.html", "j/index.html"].includes(at) ? `fr/${at}` : "fr/index.html";
}

/** One page: the bar, the content, the footer. `at` = where the page lives (e.g. "fr/guide.html") */
function page({
  at,
  lang,
  title,
  description,
  body,
  kind = "doc",
  extraNav = "",
  bare = false,
}: {
  at: string;
  lang: Lang;
  title: string;
  description: string;
  body: string;
  kind?: string;
  extraNav?: string;
  /** a page for students: just the logo and the other language, no teacher links and no footer */
  bare?: boolean;
}) {
  const t = COPY[lang];
  // (every link starts from the root: the site is served at the top of Protégé's address)
  const up = "/";
  // the pages that exist in both languages live in fr/ for French; everything else (the board pack) at the root
  const local = (p: string) => href(lang === "fr" && ["index.html", "guide.html", "privacy.html"].includes(p) ? `fr/${p}` : p);
  const current = (p: string) => p === at || `fr/${p}` === at;
  const nav = [
    ["guide.html", t.nav.guide],
    ["privacy.html", t.nav.privacy],
    ["board/accessibility.html", t.nav.access],
    ["board/README.html", t.nav.boards],
  ]
    .map(([href, label]) => `<a href="${local(href)}"${current(href) ? ' aria-current="page"' : ""}>${label}</a>`)
    .join("");
  const otherLang = lang === "fr" ? "en" : "fr";
  const other = `<a class="lang" href="${href(twin(at, lang))}" hreflang="${otherLang}" lang="${otherLang}" aria-label="${t.nav.otherLabel}">${t.nav.other}</a>`;
  const navLinks = bare ? other : `${nav}<a href="${repoUrl}">${t.nav.code}</a>${other}${extraNav}`;
  const bar = `<header class="wrap bar"><a class="mark voice" href="${local("index.html")}" aria-label="${t.nav.home}"><img src="${up}img/mark.svg" alt="" width="34" height="34">protégé</a><nav aria-label="Protégé">${navLinks}</nav></header>`;
  const en = lang === "en" ? at : twin(at, lang);
  const fr = lang === "fr" ? at : twin(at, lang);
  return `<!doctype html>
<html lang="${lang === "fr" ? "fr-CA" : "en-CA"}" class="page-${kind}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="referrer" content="no-referrer">
<meta http-equiv="Content-Security-Policy" content="${CSP}">
<link rel="alternate" hreflang="en" href="${href(en)}">
<link rel="alternate" hreflang="fr" href="${href(fr)}">
<link rel="icon" href="${up}img/mark.svg" type="image/svg+xml">
<link rel="stylesheet" href="${up}style.css">
<script type="module" src="${up}js/main.js"></script>
</head>
<body data-page="${kind}" data-root="${up}">
<a class="skip" href="#main">${t.skip}</a>
${body.includes("<!--BAR-->") ? body.replace("<!--BAR-->", bar) : `${bar}\n${body}`}
${bare ? "" : `<footer class="night-foot">
  <div class="foot-sky" aria-hidden="true"><span class="stars"></span><span class="stars far"></span><img class="foot-far" src="${up}art/senior/valley-0-dark.webp" alt="" loading="lazy"><img class="foot-near" src="${up}art/senior/valley-2-dark.webp" alt="" loading="lazy"><span class="fly"></span><span class="fly"></span><span class="fly"></span><span class="fly"></span><span class="fly"></span></div>
  <div class="foot-gloam"><button class="sleeper" type="button" aria-label="${t.foot.wake}" data-mumbles="${esc(JSON.stringify(t.foot.mumbles))}"><img class="asleep" src="${up}img/gloam-asleep.webp" alt="" loading="lazy" width="220" height="276"><img class="awake" src="${up}img/gloam-sheepish.webp" alt="" loading="lazy" width="220" height="276"></button><p class="mumble voice" aria-live="polite"></p></div>
  <div class="wrap foot-row"><span>Protégé ${pkg.version}. ${t.footer.license} <a href="${repoUrl}/blob/main/LICENSE">GNU AGPL v3</a>. ${t.footer.noTrackers}</span><span class="foot-links"><a href="${local("guide.html")}">${t.nav.guide}</a><a href="${local("privacy.html")}">${t.nav.privacy}</a><a href="${up}board/accessibility.html">${t.nav.access}</a><a href="${up}board/README.html">${t.nav.boards}</a><a href="${up}board/security.html">${t.footer.security}</a><a href="${repoUrl}">${t.footer.source}</a></span></div>
</footer>`}
</body>
</html>
`;
}

/** Gloam in the margin of each reading page, with a line for that page */
const PEEK: Record<string, { mood: string; key: keyof SiteCopy["peeks"] }> = {
  "guide.md": { mood: "curious", key: "guide" },
  "privacy.md": { mood: "proud", key: "privacy" },
  "README.md": { mood: "sheepish", key: "pack" },
  "accessibility.md": { mood: "curious", key: "access" },
  "data-inventory.md": { mood: "proud", key: "inventory" },
  "family-notice.md": { mood: "curious", key: "family" },
};

/** A markdown document as a page (links to other .md files become .html) */
function doc(file: string, at: string, lang: Lang) {
  const t = COPY[lang];
  const md = fs.readFileSync(file, "utf8");
  const up = "/";
  const html = (marked.parse(md, { async: false }) as string)
    .replace(/href="([^"]+?)\.md(#[^"]*)?"/g, (_, p: string, h = "") => `href="${p}.html${h}"`)
    // the board pack and the pictures are at the root, for both languages
    .replace(/(href|src)="(board\/|img\/)/g, "$1=\"/$2")
    // wide tables scroll sideways on small screens: the keyboard can reach them too
    .replaceAll("<table>", '<table tabindex="0">');
  const title = md.match(/^# (.+)$/m)?.[1] ?? "Protégé";
  const back = at.startsWith("board/") ? `<a class="back" href="README.html">${t.docs.pack}</a>` : "";
  fs.mkdirSync(path.dirname(path.join(out, at)), { recursive: true });
  const peek = PEEK[path.basename(file)] ?? { mood: "curious", key: "other" as const };
  const rail = `<aside class="rail" data-contents="${t.docs.onThisPage}"><figure class="peek"><img src="${up}img/gloam-${peek.mood}.webp" alt="" width="220" height="276"><figcaption class="voice">${t.peeks[peek.key]}</figcaption></figure></aside>`;
  fs.writeFileSync(
    path.join(out, at),
    page({ at, lang, title: `${title} · Protégé`, description: title, body: `<main id="main" class="doc paper"><div class="wrap doc-grid">${rail}<article>${back}${html}</article></div></main>` }),
  );
}

function home(lang: Lang) {
  const t = COPY[lang];
  const at = lang === "fr" ? "fr/index.html" : "index.html";
  const up = "/";
  // the homepage's bar has Gloam's voice switch (off until the visitor turns it on)
  const sound = `<button class="sound" id="sound" type="button" aria-pressed="false"><svg viewBox="0 0 18 14" aria-hidden="true"><rect x="1" y="4" width="3" height="10" rx="1.5"/><rect x="7.5" y="0" width="3" height="14" rx="1.5"/><rect x="14" y="6" width="3" height="8" rx="1.5"/></svg><span>${t.sound.off}</span></button>`;
  fs.mkdirSync(path.dirname(path.join(out, at)), { recursive: true });
  fs.writeFileSync(path.join(out, at), page({ at, lang, title: t.meta.title, description: t.meta.description, body: homeBody(links(lang), "<!--BAR-->", t, up), kind: "home", extraNav: sound }));
}

/**
 * Where students join (/j, or /fr/j): the same link every class, every year. They type the class code on the
 * projector and the page takes them to their class (/join, site/js/join.ts). Nothing is stored or sent anywhere.
 */
function joinPage(lang: Lang) {
  const t = COPY[lang].join;
  const at = lang === "fr" ? "fr/j/index.html" : "j/index.html";
  const up = "/";
  const body = `<!--BAR-->
<main id="main" class="join">
  <img class="join-sky" src="${up}art/senior/valley-0-dark.webp" alt="">
  <img class="join-hills" src="${up}art/senior/valley-2-dark.webp" alt="">
  <div class="wrap join-grid">
    <form class="join-card" novalidate>
      <h1>${esc(t.title)}</h1>
      <p class="join-lede">${esc(t.lede)}</p>
      <label for="join-code">${esc(t.label)}</label>
      <input id="join-code" name="code" autocomplete="off" autocapitalize="characters" spellcheck="false" inputmode="text" maxlength="40" aria-describedby="join-hint join-said" data-problems="${esc(JSON.stringify({ unreadable: t.unreadable, going: t.going, stuck: t.stuck }))}">
      <p id="join-hint" class="join-hint">${esc(t.hint)}</p>
      <button class="btn primary big" type="submit">${esc(t.button)}</button>
      <p id="join-said" class="join-said" role="status" aria-live="polite"></p>
      <p class="join-privacy">${esc(t.privacy)}</p>
    </form>
    <figure class="join-gloam" aria-hidden="true">
      <img src="${up}img/gloam-curious.webp" alt="" width="220" height="276">
      <figcaption class="voice">${esc(t.gloam)}</figcaption>
    </figure>
  </div>
</main>`;
  fs.mkdirSync(path.dirname(path.join(out, at)), { recursive: true });
  fs.writeFileSync(path.join(out, at), page({ at, lang, title: t.meta, description: t.lede, body, kind: "join", bare: true }));
}

/** Copy a folder, file by file (Node's own folder copy crashes on Windows with Node 25) */
function copyDir(from: string, to: string) {
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    if (e.isDirectory()) copyDir(path.join(from, e.name), path.join(to, e.name));
    else fs.copyFileSync(path.join(from, e.name), path.join(to, e.name));
  }
}

async function main() {
  for (const f of MADE) fs.rmSync(path.join(out, f), { recursive: true, force: true });
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
  // (Gloam, the valley and every grade's world are the app's own paintings, already in public/art)
  // Gloam's voice, in English and French (recorded by scripts/site-voice.ts)
  copyDir(path.join(root, "site", "audio"), path.join(out, "audio"));
  // the site's scripts: the homepage's chapters and the living Gloam (loaded only when needed)
  await build({
    entryPoints: [path.join(root, "site", "js", "main.ts")],
    outdir: path.join(out, "js"),
    bundle: true,
    splitting: true,
    format: "esm",
    minify: true,
    target: "es2020",
    alias: { "@": root },
    define: { "process.env.NODE_ENV": '"production"' },
    legalComments: "linked",
    logLevel: "warning",
  });
  // English at the root, French in fr/ (the school board pack is in English, for both)
  for (const lang of ["en", "fr"] as Lang[]) {
    home(lang);
    joinPage(lang);
    const dir = lang === "fr" ? path.join(root, "site", "content", "fr") : path.join(root, "site", "content");
    const prefix = lang === "fr" ? "fr/" : "";
    doc(path.join(dir, "guide.md"), `${prefix}guide.html`, lang);
    doc(path.join(dir, "privacy.md"), `${prefix}privacy.html`, lang);
  }
  for (const f of fs.readdirSync(path.join(root, "docs", "board")).filter((x) => x.endsWith(".md"))) {
    doc(path.join(root, "docs", "board", f), `board/${f.replace(/\.md$/, ".html")}`, "en");
  }
  console.log("Website built into public/ (open it at / on the app).");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
