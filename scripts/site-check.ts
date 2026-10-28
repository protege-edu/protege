/**
 * The website's quality gate: it walks every page at many screen shapes, the way people really see it
 * (real scrollbars, English and French, motion on and off), stopping every 100px of scroll, and fails on:
 *   - sideways scrolling
 *   - words cut off by the screen's edge (in scenes that stay on screen while you scroll), or under the top bar
 *   - words on top of other words, on Gloam, its speech bubble or the teach box
 *   - words on a picture with less than 4.5:1 contrast, measured from the pixels underneath them
 *   - console errors, failed files, anything the security policy blocks
 * Writes a report and a screenshot of every failure to screenshots/site-check/.
 *
 *   npm run site && npx tsx scripts/site-check.ts            everything
 *   npx tsx scripts/site-check.ts --quick                    the laptop sizes, English, motion on
 *   npx tsx scripts/site-check.ts --only 1270x547            one size
 */
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { chromium, type Page } from "playwright";

const root = path.join(process.cwd(), "site-dist");
const out = path.join(process.cwd(), "screenshots", "site-check");
const args = process.argv.slice(2);
const quick = args.includes("--quick");
const only = args.includes("--only") ? args[args.indexOf("--only") + 1] : null;

// the screens people really use: laptops at 125-150% scaling are short and wide (1270x547 is the user's)
const SIZES: [number, number][] = [
  [1270, 547],
  [1366, 768],
  [1536, 864],
  [1920, 1080],
  [2560, 1440],
  [1024, 600],
  [768, 1024],
  [390, 844],
];
const sizes = only ? SIZES.filter(([w, h]) => `${w}x${h}` === only) : quick ? SIZES.slice(0, 3) : SIZES;
if (!sizes.length) throw new Error(`No screen size matches ${only}.`);
const langs = quick ? ["en"] : ["en", "fr"];
const motions = quick ? [false] : [false, true];
// (the last is an address that doesn't exist: the lost page, 404.html)
const LOST = "no/such/page";
const pages = ["index.html", "guide.html", "privacy.html", "board/README.html", "board/data-inventory.html", LOST];

// ---- a tiny server that sends the same headers as the real site (so the security policy is tested too) ----
const headers = Object.fromEntries(
  fs
    .readFileSync(path.join(root, "_headers"), "utf8")
    .split("\n")
    .filter((l) => l.startsWith("  "))
    .map((l) => {
      const i = l.indexOf(":");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);
const TYPES: Record<string, string> = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".webp": "image/webp", ".woff2": "font/woff2", ".mp3": "audio/mpeg", ".png": "image/png", ".txt": "text/plain" };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent((req.url ?? "/").split("?")[0].split("#")[0]);
  if (p.endsWith("/")) p += "index.html";
  const f = path.join(root, p);
  if (!f.startsWith(root)) return void res.writeHead(404).end();
  // like Cloudflare Pages: an address that doesn't exist gets the nearest 404.html (fr/404.html under fr/)
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) {
    const lost = path.join(root, p.startsWith("/fr/") ? "fr/404.html" : "404.html");
    if (!fs.existsSync(lost)) return void res.writeHead(404).end();
    return void res.writeHead(404, { ...headers, "content-type": "text/html" }).end(fs.readFileSync(lost));
  }
  res.writeHead(200, { ...headers, "content-type": TYPES[path.extname(f)] ?? "application/octet-stream" }).end(fs.readFileSync(f));
});

interface Problem {
  where: string;
  what: string;
  shot?: string;
}
const problems: Problem[] = [];
let shots = 0;

/** What's on screen right now, measured in the page */
async function measure(page: Page) {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const vh = innerHeight;
    const shown = (el: Element) => {
      for (let e: Element | null = el; e; e = e.parentElement) {
        const cs = getComputedStyle(e);
        if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) < 0.35) return false;
      }
      return true;
    };
    const name = (el: Element) => `${el.tagName.toLowerCase()} "${(el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 40)}"`;
    // every bit of visible text, as the boxes its lines actually take up
    const texts: { el: Element; boxes: DOMRect[]; label: string }[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const seen = new Map<Element, DOMRect[]>();
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.textContent?.trim()) continue;
      const el = n.parentElement!;
      if (el.closest(".sr-only,script,style,[aria-hidden='true'] .sr-only")) continue;
      if (!shown(el)) continue;
      const r = document.createRange();
      r.selectNodeContents(n);
      const boxes = [...r.getClientRects()].filter((b) => b.width > 1 && b.height > 1 && b.bottom > 0 && b.top < vh);
      if (!boxes.length) continue;
      seen.set(el, [...(seen.get(el) ?? []), ...boxes]);
    }
    for (const [el, boxes] of seen) texts.push({ el, boxes, label: name(el) });

    const found: string[] = [];
    const doc = document.documentElement;
    if (doc.scrollWidth > doc.clientWidth + 1) found.push(`the page scrolls sideways by ${doc.scrollWidth - doc.clientWidth}px`);

    // words cut off: in a scene that's pinned (fully on screen), all its words must be fully on screen
    for (const t of texts) {
      const pin = t.el.closest(".story-pin,.desk-pin,.worlds-pin,.get-pin");
      if (!pin) continue;
      const pb = pin.getBoundingClientRect();
      if (pb.top < -2 || pb.bottom > vh + 2) continue;
      for (const b of t.boxes) {
        if (b.top < -1 || b.bottom > vh + 1 || b.left < -1 || b.right > vw + 1) {
          found.push(`cut off by the screen's edge: ${t.label}`);
          break;
        }
      }
    }
    // under the top bar (it sits at the top of the page)
    const bar = document.querySelector(".bar");
    if (bar) {
      const bb = bar.getBoundingClientRect();
      const barText = new Set(texts.filter((t) => bar.contains(t.el)).map((t) => t.el));
      for (const t of texts) {
        if (barText.has(t.el)) continue;
        if (t.boxes.some((b) => b.bottom > bb.top + 2 && b.top < bb.bottom - 2 && b.right > bb.left && b.left < bb.right)) {
          // only a problem where the bar's own words or logo are
          const barBoxes = texts.filter((x) => barText.has(x.el)).flatMap((x) => x.boxes);
          const logo = bar.querySelector(".mark img")?.getBoundingClientRect();
          if (logo) barBoxes.push(logo);
          if (t.boxes.some((b) => barBoxes.some((o) => b.left < o.right && b.right > o.left && b.top < o.bottom && b.bottom > o.top))) found.push(`under the top bar: ${t.label}`);
        }
      }
    }
    // words on words (different elements, not one inside the other)
    const hit = (a: DOMRect, b: DOMRect, pad = 1) => a.left + pad < b.right && a.right - pad > b.left && a.top + pad < b.bottom && a.bottom - pad > b.top;
    for (let i = 0; i < texts.length; i++) {
      for (let j = i + 1; j < texts.length; j++) {
        const A = texts[i];
        const B = texts[j];
        if (A.el.contains(B.el) || B.el.contains(A.el)) continue;
        // (words in the same paragraph, heading, button or label are one block of text)
        const block = (e: Element) => e.closest("p,h1,h2,h3,h4,li,button,figcaption,td,th,a,text,label") ?? e;
        if (block(A.el) === block(B.el)) continue;
        if (A.boxes.some((a) => B.boxes.some((b) => hit(a, b, 2)))) found.push(`words on words: ${A.label} / ${B.label}`);
      }
    }
    // words on Gloam, its bubble, or the teach box
    const things: [string, DOMRect | null][] = [];
    const stage = document.querySelector<HTMLElement>("#stage");
    const poke = document.querySelector<HTMLElement>("#poke");
    if (stage && !stage.classList.contains("is-hidden") && poke && poke.getBoundingClientRect().width) {
      const p = poke.getBoundingClientRect();
      // Gloam's body, a little inside the poke button
      things.push(["Gloam", new DOMRect(p.left + p.width * 0.12, p.top + p.height * 0.18, p.width * 0.76, p.height * 0.8)]);
    }
    const bubble = document.querySelector<HTMLElement>("#bubble");
    if (bubble && shown(bubble) && !bubble.classList.contains("is-empty")) things.push(["Gloam's bubble", document.querySelector("#say")!.getBoundingClientRect()]);
    const tb = document.querySelector<HTMLElement>(".teachbox");
    if (tb && shown(tb)) things.push(["the teach box", tb.getBoundingClientRect()]);
    // (only where it's really on top: a paper section can cover Gloam, its bubble or the teach box)
    const onTop = (r: DOMRect, owner: Element | null) => {
      const x = Math.min(vw - 1, Math.max(0, r.left + r.width / 2));
      const y = Math.min(vh - 1, Math.max(0, r.top + r.height / 2));
      const top = document.elementFromPoint(x, y);
      return !!top && (!owner || owner.contains(top) || top.contains(owner) || top.closest("#stage,#bubble,.teachbox") !== null);
    };
    for (const [label, r] of things) {
      if (!r || r.width < 2) continue;
      const ownerEl = label === "Gloam" ? poke : label === "Gloam's bubble" ? bubble : tb;
      if (!onTop(r, ownerEl)) continue;
      for (const t of texts) {
        const owner = label === "Gloam's bubble" ? bubble : label === "the teach box" ? tb : null;
        if (owner?.contains(t.el)) continue;
        if (t.el.closest(".bar") && label === "Gloam") continue;
        // (the paper sections and the footer are drawn above the valley: their words can't be under Gloam)
        if (label !== "the teach box" && t.el.closest(".desk,.paper,.worlds,.night-foot")) continue;
        if (t.boxes.some((b) => hit(b, r, 3))) found.push(`words on ${label}: ${t.label}`);
      }
    }
    // words that sit on a picture (no solid background behind them): measured from pixels afterwards
    const onPicture: { label: string; box: { x: number; y: number; w: number; h: number }; color: string }[] = [];
    for (const t of texts) {
      let solid = false;
      for (let e: Element | null = t.el; e; e = e.parentElement) {
        const bg = getComputedStyle(e).backgroundColor;
        const m = bg.match(/rgba?\(([^)]+)\)/);
        if (m) {
          const a = m[1].split(",").map(Number)[3];
          if (a === undefined || a >= 0.9) {
            solid = !e.matches("body,html");
            break;
          }
        }
        if (e.matches(".paper,.desk,.ways,.boards,footer,.doc")) {
          solid = true;
          break;
        }
      }
      if (solid) continue;
      const b = t.boxes[0];
      if (b.top < 0 || b.bottom > vh) continue;
      onPicture.push({ label: t.label, box: { x: b.left, y: b.top, w: b.width, h: b.height }, color: getComputedStyle(t.el).color });
    }
    return { found, onPicture };
  });
}

/** Contrast of words on pictures: the words are made see-through, and the pixels under them measured */
async function contrast(page: Page, items: { label: string; box: { x: number; y: number; w: number; h: number }; color: string }[]): Promise<string[]> {
  if (!items.length) return [];
  // (set from script: the site's security policy rightly refuses injected <style> tags)
  await page.evaluate(() => {
    for (const el of document.querySelectorAll<HTMLElement | SVGElement>("body *")) {
      el.dataset.ccColor = el.style.getPropertyValue("color");
      el.style.setProperty("color", "transparent", "important");
      // (only the words: the shapes behind them, like a label's pill, are part of the background)
      if (el instanceof SVGTextElement) el.style.setProperty("fill-opacity", "0", "important");
    }
  });
  await page.waitForTimeout(60);
  const png = await page.screenshot();
  await page.evaluate(() => {
    for (const el of document.querySelectorAll<HTMLElement | SVGElement>("body *")) {
      if (el.dataset.ccColor) el.style.setProperty("color", el.dataset.ccColor);
      else el.style.removeProperty("color");
      el.style.removeProperty("fill-opacity");
      delete el.dataset.ccColor;
    }
  });
  return page.evaluate(
    async ({ b64, items }) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      const g = c.getContext("2d", { willReadFrequently: true })!;
      g.drawImage(img, 0, 0);
      const lum = (r: number, gg: number, b: number) => {
        const f = (v: number) => {
          v /= 255;
          return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        };
        return 0.2126 * f(r) + 0.7152 * f(gg) + 0.0722 * f(b);
      };
      const bad: string[] = [];
      const scale = img.width / innerWidth;
      for (const it of items) {
        const [r, gg, b] = (it.color.match(/[\d.]+/g) ?? ["255", "255", "255"]).map(Number);
        const tl = lum(r, gg, b);
        const x = Math.max(0, Math.floor(it.box.x * scale));
        const y = Math.max(0, Math.floor(it.box.y * scale));
        const w = Math.max(1, Math.min(img.width - x, Math.floor(it.box.w * scale)));
        const h = Math.max(1, Math.min(img.height - y, Math.floor(it.box.h * scale)));
        const d = g.getImageData(x, y, w, h).data;
        const ls: number[] = [];
        for (let i = 0; i < d.length; i += 16) ls.push(lum(d[i], d[i + 1], d[i + 2]));
        ls.sort((p, q) => p - q);
        // the worst 10% of the background under the words (light words: its brightest; dark words: its darkest)
        const bgL = tl > 0.4 ? ls[Math.floor(ls.length * 0.9)] : ls[Math.floor(ls.length * 0.1)];
        const ratio = (Math.max(tl, bgL) + 0.05) / (Math.min(tl, bgL) + 0.05);
        if (ratio < 4.5) bad.push(`hard to read on the picture (${ratio.toFixed(1)}:1): ${it.label}`);
      }
      return bad;
    },
    { b64: png.toString("base64"), items },
  );
}

async function main() {
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  await new Promise<void>((r) => server.listen(8790, r));
  // real scrollbars (Playwright hides them by default) and the real graphics card
  const browser = await chromium.launch({ ignoreDefaultArgs: ["--hide-scrollbars"], args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=default"] });
  for (const [w, h] of sizes) {
    for (const lang of langs) {
      for (const calm of motions) {
        const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: calm ? "reduce" : "no-preference" });
        // (the script runner names functions with a helper the page doesn't have: give it one)
        await ctx.addInitScript("window.__name = (f) => f");
        const page = await ctx.newPage();
        const errors: string[] = [];
        // (a missing file is caught below with its address; the browser's own "failed to load" line would repeat it)
        page.on("console", (m) => (m.type() === "error" || /Content Security Policy|Refused/i.test(m.text())) && !/^Failed to load resource/.test(m.text()) && errors.push(m.text()));
        page.on("pageerror", (e) => errors.push(e.message));
        // (the lost page itself is meant to answer 404)
        page.on("response", (r) => r.status() >= 400 && !r.url().endsWith(LOST) && errors.push(`${r.status()} ${r.url()}`));
        for (const p of pages) {
          const url = lang === "fr" && ["index.html", "guide.html", "privacy.html", LOST].includes(p) ? `fr/${p}` : p;
          if (lang === "fr" && url === p && p !== "index.html") continue; // the board pack is English only: checked once
          const where = `${w}x${h} ${lang}${calm ? " calm" : ""} ${url}`;
          await page.goto(`http://localhost:8790/${url}`, { waitUntil: "networkidle" });
          await page.waitForTimeout(p === "index.html" ? 2500 : p === LOST ? 1800 : 400);
          const total = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
          const seenHere = new Set<string>();
          for (let y = 0, i = 0; y <= total + 99; y += 100, i++) {
            await page.evaluate((y) => scrollTo(0, y), Math.min(y, total));
            await page.waitForTimeout(p === "index.html" ? 140 : 20);
            const m = await measure(page);
            const found = [...m.found];
            // contrast on pictures: every 300px is plenty (it's slower)
            if (i % 3 === 0 && m.onPicture.length) found.push(...(await contrast(page, m.onPicture)));
            const fresh = found.filter((f) => !seenHere.has(f));
            if (!fresh.length) continue;
            fresh.forEach((f) => seenHere.add(f));
            const shot = `${String(++shots).padStart(4, "0")}.png`;
            if (shots <= 400) await page.screenshot({ path: path.join(out, shot) });
            for (const f of fresh) problems.push({ where: `${where} @${Math.min(y, total)}px`, what: f, shot });
          }
        }
        for (const e of [...new Set(errors)]) problems.push({ where: `${w}x${h} ${lang}${calm ? " calm" : ""}`, what: `error: ${e.slice(0, 200)}` });
        await ctx.close();
        console.log(`${w}x${h} ${lang}${calm ? " calm" : ""}: ${problems.length} problems so far`);
      }
    }
  }
  await browser.close();
  server.close();
  const byWhat = new Map<string, Problem[]>();
  for (const p of problems) byWhat.set(p.what, [...(byWhat.get(p.what) ?? []), p]);
  const report = [
    `# Website check: ${problems.length} problems`,
    "",
    ...[...byWhat].map(([what, ps]) => `- **${what}** (${ps.length}×) e.g. ${ps[0].where}${ps[0].shot ? ` [${ps[0].shot}]` : ""}`),
  ].join("\n");
  fs.writeFileSync(path.join(out, "report.md"), report);
  console.log(`\n${report.split("\n").slice(0, 60).join("\n")}`);
  process.exitCode = problems.length ? 1 : 0;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
