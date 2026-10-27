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
import { build } from "esbuild";
import { marked } from "marked";
import pkg from "../package.json";
import { homeBody, type Links } from "../site/pages/home";

const root = process.cwd();
const out = path.join(root, "site-dist");
const repo = process.env.PROTEGE_REPO ?? (pkg as { repository?: string }).repository?.replace(/^github:/, "");
const repoUrl = repo ? `https://github.com/${repo}` : "#";
const download = repo ? `${repoUrl}/releases/latest` : "#download";
// straight to the newest installer (fixed names, see scripts/release.ts): teachers never see GitHub
const file = (name: string) => (repo ? `${repoUrl}/releases/latest/download/${name}` : "#download");
const links: Links = { windows: file("Protege-Setup.exe"), mac: file("Protege.dmg"), windowsZip: file("Protege-windows.zip"), macZip: file("Protege-mac.zip"), repo: repoUrl };

/** The security policy, in the page and in Cloudflare's headers: only this site, nothing else, ever */
const CSP = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; media-src 'self'; base-uri 'none'; form-action 'none'";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** One page: the bar, the content, the footer. `depth` = how many folders down (for relative links) */
function page({ title, description, body, depth = 0, current, dark = false, kind = "doc" }: { title: string; description: string; body: string; depth?: number; current?: string; dark?: boolean; kind?: string }) {
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
<meta http-equiv="Content-Security-Policy" content="${CSP}">
<link rel="icon" href="${up}img/mark.svg" type="image/svg+xml">
<link rel="stylesheet" href="${up}style.css">
<script type="module" src="${up}js/main.js"></script>
</head>
<body data-page="${kind}" data-root="${up}" data-windows="${links.windows}" data-mac="${links.mac}">
<a class="skip" href="#main">Skip to the content</a>
${dark ? body.replace("<!--BAR-->", bar) : `${bar}\n${body}`}
<footer><div class="wrap"><span>Protégé ${pkg.version}. Free software under the <a href="${repoUrl}/blob/main/LICENSE">GNU AGPL v3</a>. No trackers on this site, or in Protégé.</span><span class="foot-links"><a href="${up}guide.html">Set it up</a><a href="${up}privacy.html">Privacy</a><a href="${up}board/accessibility.html">Accessibility</a><a href="${up}board/README.html">For school boards</a><a href="${up}board/security.html">Security</a><a href="${repoUrl}">Source code</a></span></div></footer>
</body>
</html>
`;
}

/** Gloam in the margin of each reading page, with a line for that page */
const PEEKS: Record<string, { mood: string; line: string }> = {
  "guide.md": { mood: "curious", line: "installing me is easy. i'm very low maintenance. mostly." },
  "privacy.md": { mood: "proud", line: "i don't even know your name. i know your nickname. it's a good nickname." },
  "README.md": { mood: "sheepish", line: "this is the serious part. i'll be quiet. mostly." },
  "accessibility.md": { mood: "curious", line: "everyone gets to teach me. that's the rule." },
  "data-inventory.md": { mood: "proud", line: "everything i keep, and when i forget it. very organized. for me." },
  "family-notice.md": { mood: "curious", line: "hi, families. i'm the confused one." },
  default: { mood: "curious", line: "i read all of this. twice. ok, once." },
};

/** A markdown document as a page (links to other .md files become .html) */
function doc(file: string, to: string, depth: number, current?: string) {
  const md = fs
    .readFileSync(file, "utf8")
    .replaceAll("](DOWNLOAD)", `](${download})`)
    .replaceAll("DOWNLOAD_WINDOWS_ZIP", links.windowsZip)
    .replaceAll("DOWNLOAD_MAC_ZIP", links.macZip)
    .replaceAll("DOWNLOAD_WINDOWS", links.windows)
    .replaceAll("DOWNLOAD_MAC", links.mac);
  const html = (marked.parse(md, { async: false }) as string)
    .replace(/href="([^"]+?)\.md(#[^"]*)?"/g, (_, p: string, h = "") => `href="${p}.html${h}"`)
    // wide tables scroll sideways on small screens: the keyboard can reach them too
    .replaceAll("<table>", '<table tabindex="0">');
  const title = md.match(/^# (.+)$/m)?.[1] ?? "Protégé";
  const back = depth ? `<a class="back" href="README.html">The school board pack</a>` : "";
  fs.mkdirSync(path.dirname(path.join(out, to)), { recursive: true });
  const peek = PEEKS[path.basename(file)] ?? PEEKS.default;
  const rail = `<aside class="rail"><figure class="peek"><img src="${"../".repeat(depth)}img/gloam-${peek.mood}.webp" alt="" width="220" height="276"><figcaption class="voice">${peek.line}</figcaption></figure></aside>`;
  fs.writeFileSync(
    path.join(out, to),
    page({ title: `${title} · Protégé`, description: title, body: `<main id="main" class="doc paper"><div class="wrap doc-grid">${rail}<article>${back}${html}</article></div></main>`, depth, current }),
  );
}

function home() {
  // the homepage's bar has Gloam's voice switch (off until the visitor turns it on)
  const sound = `<button class="sound" id="sound" type="button" aria-pressed="false"><svg viewBox="0 0 18 14" aria-hidden="true"><rect x="1" y="4" width="3" height="10" rx="1.5"/><rect x="7.5" y="0" width="3" height="14" rx="1.5"/><rect x="14" y="6" width="3" height="8" rx="1.5"/></svg><span>Gloam's voice: off</span></button>`;
  const bar = `<header class="wrap bar"><a class="mark voice" href="index.html" aria-label="Protégé, home"><img src="img/mark.svg" alt="" width="34" height="34">protégé</a><nav aria-label="Protégé"><a href="guide.html">Set it up</a><a href="privacy.html">Privacy</a><a href="board/accessibility.html">Accessibility</a><a href="board/README.html">For school boards</a><a href="${repoUrl}">Code</a>${sound}</nav></header>`;
  fs.writeFileSync(
    path.join(out, "index.html"),
    page({
      title: "Protégé: the student is the teacher",
      description: "A free, open-source classroom app where students learn by teaching Gloam, a confused, funny AI companion. Runs on one school laptop; nothing about students leaves it.",
      body: homeBody(links, bar),
      dark: true,
      kind: "home",
    }).replace("<!--BAR-->", ""),
  );
}

async function main() {
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
  // Gloam and the valley, and every grade's world in full colour, from the app (the same paintings students see)
  for (const age of ["little", "junior", "middle", "senior"]) {
    const art = path.join(out, "art", age);
    fs.mkdirSync(art, { recursive: true });
    const keep = age === "senior" ? /^(valley-|gloam2-|journey-\d-lit)/ : /^journey-\d-lit/;
    for (const f of fs.readdirSync(path.join(root, "public", "art", age)).filter((x) => keep.test(x))) {
      fs.copyFileSync(path.join(root, "public", "art", age, f), path.join(art, f));
    }
  }
  // Gloam's voice (recorded by scripts/site-voice.ts)
  fs.mkdirSync(path.join(out, "audio"));
  for (const f of fs.readdirSync(path.join(root, "site", "audio"))) fs.copyFileSync(path.join(root, "site", "audio", f), path.join(out, "audio", f));
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
      `  Content-Security-Policy: ${CSP}; frame-ancestors 'none'`,
      "  Referrer-Policy: no-referrer",
      "  X-Content-Type-Options: nosniff",
      "  Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=(), browsing-topics=()",
      "  Cross-Origin-Opener-Policy: same-origin",
      "",
    ].join("\n"),
  );
  console.log(`Site built in site-dist/ (${repo ? `downloads: ${download}` : "set PROTEGE_REPO to link the downloads"}).`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
