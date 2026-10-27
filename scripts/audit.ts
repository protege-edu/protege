/**
 * The every-page check. Visits every student and teacher screen, in every state, for every age style, in
 * English and French, at four screen sizes (and with bigger text + stronger contrast), and checks each one for:
 *   - text that overlaps other text or a button, text that's cut off, sideways scrolling
 *   - tap targets under 24 px (fails WCAG 2.2 AA) or under 44 px (too small for little fingers: a warning)
 *   - accessibility rules (axe-core: WCAG 2.0, 2.1 and 2.2, A and AA)
 *   - errors in the browser
 * Screenshots go to screenshots/audit/, and a report to screenshots/audit/report.md.
 *
 *   1. copy a test database:  PROTEGE_DATA_DIR=<copy>   (it adds its own classes, lessons and students)
 *   2. start the dev server on it (test mode is needed to reach every moment quickly)
 *   3. PROTEGE_DATA_DIR=<copy> APP_URL=http://localhost:3100 npx tsx --conditions=react-server scripts/audit.ts
 *      [--only student|teacher] [--ages senior,little] [--langs en] [--sizes chromebook,phone]
 * Needs the test teacher ms.test@school.example (password lanterns-glow-9) in that database.
 */
import fs from "node:fs";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { chromium, type Browser, type BrowserContext, type Page } from "@playwright/test";

const BASE = process.env.APP_URL ?? "http://localhost:3100";
const OUT = path.join(process.cwd(), "screenshots", "audit");
const TEACHER = { email: "ms.test@school.example", password: "lanterns-glow-9" };
const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const SIZES = {
  chromebook: { width: 1366, height: 768, touch: false },
  desktop: { width: 1920, height: 1080, touch: false },
  tablet: { width: 768, height: 1024, touch: true },
  phone: { width: 390, height: 844, touch: true },
} as const;
type SizeName = keyof typeof SIZES;
const sizes = (arg("sizes")?.split(",") ?? Object.keys(SIZES)) as SizeName[];
const ages = arg("ages")?.split(",") ?? ["senior", "little", "junior", "middle"];
const langs = (arg("langs")?.split(",") ?? ["en", "fr"]) as ("en" | "fr")[];
const only = arg("only");
// "base" (normal settings) and/or "big" (bigger text + stronger contrast + more spacing)
const variants = arg("variants")?.split(",") ?? ["base", "big"];

interface Finding {
  screen: string;
  kind: "overlap" | "clipped" | "sideways" | "offscreen" | "target" | "small-target" | "axe" | "error";
  severity: "fail" | "warn";
  detail: string;
}
const findings: Finding[] = [];
let shots = 0;

/** Runs in the page: plain text, so the compiler can't add helpers the browser doesn't have */
const CHECKS = `(() => {
  const out = [];
  const W = innerWidth, H = innerHeight;
  const visible = (el) => {
    const s = getComputedStyle(el);
    if (s.visibility === "hidden" || s.display === "none" || Number(s.opacity) < 0.05) return false;
    if (el.closest("[aria-hidden=true], [data-test-panel], .sr-only")) return false;
    // inside a closed <details>, only its summary shows
    const d = el.closest("details:not([open])");
    if (d && !el.closest("summary")) return false;
    const r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1;
  };
  // the part of an element you can actually see: cut by every scrolling or clipping box around it
  const seen = (el, r) => {
    let x0 = r.left, y0 = r.top, x1 = r.right, y1 = r.bottom;
    for (let a = el; a && a !== document.body; a = a.parentElement) {
      const s = getComputedStyle(a);
      if (s.overflowX === "visible" && s.overflowY === "visible") continue;
      const b = a.getBoundingClientRect();
      x0 = Math.max(x0, b.left); y0 = Math.max(y0, b.top); x1 = Math.min(x1, b.right); y1 = Math.min(y1, b.bottom);
    }
    return { left: x0, top: y0, right: x1, bottom: y1, width: Math.max(0, x1 - x0), height: Math.max(0, y1 - y0) };
  };
  const label = (el) => (el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\\s+/g, " ").slice(0, 50);
  if (document.documentElement.scrollWidth > W + 1) out.push({ kind: "sideways", severity: "fail", detail: "page is " + document.documentElement.scrollWidth + "px wide" });
  // text boxes: elements with their own words (with a dialog open, only what's in the dialog: the rest is behind it)
  const texts = [];
  const scope = document.querySelector("[aria-modal=true]") || document.body;
  for (const el of scope.querySelectorAll("*")) {
    if (!visible(el) || ["SCRIPT", "STYLE", "SVG", "PATH", "CANVAS", "OPTION"].includes(el.tagName.toUpperCase())) continue;
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
    if (!own) continue;
    const range = document.createRange();
    range.selectNodeContents(el);
    const full = range.getBoundingClientRect();
    // scrolled out of sight inside a scrolling box: not on screen, so it can't overlap anything
    const r0 = seen(el, full);
    // big display type has tall, mostly empty line boxes: compare the middle of each line, where the letters are
    const inset = r0.height * 0.18;
    const r = { left: r0.left, right: r0.right, width: r0.width, top: r0.top + inset, bottom: r0.bottom - inset, height: r0.height - 2 * inset };
    if (r.width < 2 || r.height < 2 || r.width * r.height < 0.3 * full.width * full.height) continue;
    texts.push({ el, r });
    const s = getComputedStyle(el);
    // cut off: more text than room, with nothing to scroll it (ellipsis "truncate" is on purpose)
    if (s.textOverflow !== "ellipsis" && !el.closest("[data-truncate]") && (s.overflowX === "hidden" || s.overflowX === "clip" || s.overflowY === "hidden" || s.overflowY === "clip")) {
      if (el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 3) out.push({ kind: "clipped", severity: "fail", detail: label(el) });
    }
    // off the screen to the side (top/bottom can scroll): judged on the whole text, because a clipping box
    // hiding it is the problem (unless it's in a box meant to scroll sideways, or cut short with "…" on purpose)
    const sideways = el.closest("[class*=overflow-x-auto], [class*=overflow-auto]");
    if (!sideways && s.textOverflow !== "ellipsis" && (full.right > W + 2 || full.left < -2)) out.push({ kind: "offscreen", severity: "fail", detail: label(el) + " at x=" + Math.round(full.left) + ".." + Math.round(full.right) });
  }
  // overlaps: two separate text boxes covering each other (not one inside the other)
  for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
    const a = texts[i], b = texts[j];
    if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
    const x = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
    const y = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
    if (x <= 2 || y <= 2) continue;
    const small = Math.min(a.r.width * a.r.height, b.r.width * b.r.height);
    if ((x * y) / small > 0.2) {
      // only if one is actually drawn on top of the other where they meet
      const cx = Math.max(a.r.left, b.r.left) + x / 2, cy = Math.max(a.r.top, b.r.top) + y / 2;
      const top = document.elementFromPoint(cx, cy);
      if (top && (a.el.contains(top) || b.el.contains(top) || top.contains(a.el) || top.contains(b.el))) out.push({ kind: "overlap", severity: "fail", detail: label(a.el) + "  ×  " + label(b.el) });
    }
  }
  // Gloam is the star: no control or words may sit on its body (its speech, its lines, its big moments and open dialogs excepted)
  const g = document.querySelector("[data-gloam-box]");
  if (g && scope === document.body) {
    const gr = g.getBoundingClientRect();
    const core = { left: gr.left + gr.width * 0.15, right: gr.right - gr.width * 0.15, top: gr.top + gr.height * 0.08, bottom: gr.bottom - gr.height * 0.05 };
    const onGloam = (r) => {
      const x = Math.min(r.right, core.right) - Math.max(r.left, core.left), y = Math.min(r.bottom, core.bottom) - Math.max(r.top, core.top);
      return x > 0 && y > 0 && (x * y) / Math.max(1, r.width * r.height) > 0.25;
    };
    const near = (el) => el.closest("[data-near-gloam], [aria-modal=true], [data-test-panel]");
    for (const t of texts) if (!near(t.el) && onGloam(t.r)) out.push({ kind: "overlap", severity: "fail", detail: "covers Gloam: " + label(t.el) });
    for (const el of document.querySelectorAll("button, a[href], input, select, textarea")) {
      if (!visible(el) || near(el)) continue;
      if (onGloam(el.getBoundingClientRect())) out.push({ kind: "overlap", severity: "fail", detail: "covers Gloam: " + label(el) });
    }
  }
  // tap targets
  for (const el of document.querySelectorAll("button, a[href], input, select, textarea, [role=button], [role=radio], [role=switch], summary")) {
    if (!visible(el) || el.disabled) continue;
    const r = el.getBoundingClientRect();
    const inline = getComputedStyle(el).display === "inline" && el.closest("p, li");
    if (inline) continue;
    if (r.width < 24 || r.height < 24) out.push({ kind: "target", severity: "fail", detail: label(el) + " " + Math.round(r.width) + "x" + Math.round(r.height) });
    else if (r.width < 44 || r.height < 44) out.push({ kind: "small-target", severity: "warn", detail: label(el) + " " + Math.round(r.width) + "x" + Math.round(r.height) });
  }
  return out;
})()`;

async function check(page: Page, screen: string, file: string) {
  await page.waitForTimeout(350);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  // the test-mode panel is a developer tool students never see: out of the picture
  // (Playwright's own screenshot style: React and Next.js may replace the panel or the page's head at any moment)
  await page.screenshot({ path: file, style: "[data-test-panel]{display:none!important}" });
  shots++;
  const found = (await page.evaluate(CHECKS)) as Omit<Finding, "screen">[];
  const seen = new Set<string>();
  for (const f of found) {
    const key = f.kind + f.detail;
    if (seen.has(key)) continue;
    seen.add(key);
    findings.push({ screen, ...f });
  }
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .exclude("[data-test-panel]")
    .analyze()
    .catch(() => null);
  for (const v of axe?.violations ?? []) {
    findings.push({ screen, kind: "axe", severity: v.impact === "minor" ? "warn" : "fail", detail: `${v.id}: ${v.help} (${v.nodes.length}×: ${v.nodes[0]?.target.join(" ")})` });
  }
}

async function context(browser: Browser, size: SizeName, opts: { lang: string; big?: boolean }): Promise<BrowserContext> {
  const s = SIZES[size];
  const ctx = await browser.newContext({
    viewport: { width: s.width, height: s.height },
    hasTouch: s.touch,
    isMobile: size === "phone",
    reducedMotion: "reduce",
    locale: opts.lang === "fr" ? "fr-CA" : "en-CA",
  });
  if (opts.big) await ctx.addInitScript(`try{localStorage.setItem("protege.access",JSON.stringify({text:2,contrast:true,reading:"spaced"}))}catch(e){}`);
  return ctx;
}

const listen = (page: Page, screen: () => string) => {
  page.on("pageerror", (e) => findings.push({ screen: screen(), kind: "error", severity: "fail", detail: e.message.slice(0, 160) }));
  page.on("console", (m) => {
    if (m.type() === "error" && !/Failed to load resource: the server responded with a status of 4\d\d/.test(m.text())) findings.push({ screen: screen(), kind: "error", severity: "fail", detail: m.text().slice(0, 160) });
  });
};

/* ---------------- fixtures: classes and French lessons for every age ---------------- */

async function prepare() {
  const { db } = await import("@/lib/db/client");
  const schema = await import("@/lib/db/schema");
  const { eq } = await import("drizzle-orm");
  const C = await import("@/lib/teacher/classes");
  const { BUILT_IN } = await import("@/lib/lesson");
  const teacher = db.select().from(schema.teachers).where(eq(schema.teachers.email, TEACHER.email)).get();
  if (!teacher) throw new Error(`The audit needs the test teacher ${TEACHER.email} in this database.`);
  const grades: Record<string, number> = { little: 1, junior: 4, middle: 7, senior: 10 };
  const classes: Record<string, { id: string; code: string; lesson: string }> = {};
  for (const age of ["little", "junior", "middle", "senior"]) {
    for (const lang of ["en", "fr"] as const) {
      // the lesson: the seasons lesson, in this age and language (French screens for French classes)
      const lessonId = `audit-seasons-${age}-${lang}`;
      const now = new Date();
      db.insert(schema.lessons)
        .values({ id: lessonId, teacherId: teacher.id, title: lang === "fr" ? "Pourquoi avons-nous des saisons?" : "Why do we have seasons?", grade: grades[age], status: "approved", blueprint: { ...BUILT_IN.seasons, id: lessonId, ageStyle: age as "senior", grade: grades[age], language: lang, ...(lang === "fr" ? { title: "Pourquoi avons-nous des saisons?", topic: "les saisons" } : {}) }, sourceName: "Audit", createdAt: now, updatedAt: now, approvedAt: now })
        .onConflictDoNothing()
        .run();
      // names like a real teacher's classes (they show up in screenshots and on the website)
      const name = `${lang === "fr" ? "Sciences" : "Science"} ${grades[age]}${lang === "fr" ? " (fr)" : ""}, ${lang === "fr" ? "groupe" : "period"} ${["little", "junior", "middle", "senior"].indexOf(age) + 1}`;
      let c = db.select().from(schema.classes).where(eq(schema.classes.name, name)).get();
      if (!c) {
        const id = C.createClass(name, grades[age], teacher.id, lang);
        C.assignLesson(id, lessonId);
        c = db.select().from(schema.classes).where(eq(schema.classes.id, id)).get()!;
      }
      classes[`${age}-${lang}`] = { id: c.id, code: c.code!, lesson: lessonId };
    }
  }
  return classes;
}

/* ---------------- student screens ---------------- */

async function studentRun(browser: Browser, age: string, lang: "en" | "fr", size: SizeName, big: boolean, cls: { code: string; lesson: string }) {
  const { getAgeStyle } = await import("@/lib/age-styles");
  const style = getAgeStyle(age, lang);
  const t = style.copy;
  const j = t.join;
  const tag = `${age}-${lang}-${size}${big ? "-big" : ""}`;
  const dir = path.join(OUT, "student", tag);
  const ctx = await context(browser, size, { lang, big });
  const page = await ctx.newPage();
  let screen = "";
  listen(page, () => screen);
  const shot = async (name: string) => {
    screen = `${tag} ${name}`;
    await check(page, screen, path.join(dir, `${name}.png`));
  };
  const btn = (name: string | RegExp) => page.getByRole("button", { name: typeof name === "string" ? new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`) : name }).first();
  // pause-menu items are opened with the keyboard (Playwright's pointer check is fooled by the buttons' drawn layer)
  const inDialog = (name: string) => {
    const el = page.getByRole("dialog").getByRole("button", { name, exact: true });
    return { click: async () => (await el.focus(), await page.keyboard.press("Enter")), focus: () => el.focus() };
  };
  const esc = async () => {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
  };
  try {
    // joining
    await page.goto(`${BASE}/join`, { waitUntil: "load", timeout: 180_000 });
    await page.locator("#code").waitFor({ timeout: 120_000 });
    await page.waitForTimeout(2500);
    // before a class is found, the join page speaks in the default style (it can't know the age yet)
    const first = getAgeStyle("senior", lang).copy.join;
    // one wrong code per age and language (more, from one address, and Protégé rightly asks to slow down)
    if (size === "chromebook" && !big) {
      await page.locator("#code").fill("NOPE-00");
      await btn(first.codeButton).click();
      await page.waitForTimeout(1200);
      await shot("01-join-wrong-code");
    }
    await page.locator("#code").fill(cls.code);
    await btn(first.codeButton).click();
    // the class is found (slow on a busy computer): then either "which one are you?" or the nickname step
    await page.getByText(j.whoNew, { exact: true }).or(page.getByText(j.nickSurprise, { exact: true })).first().waitFor({ timeout: 60_000 });
    await page.waitForTimeout(800);
    if (await btn(j.whoNew).isVisible().catch(() => false)) {
      await shot("02-join-who");
      await btn(j.whoNew).click();
      await page.waitForTimeout(800);
    }
    await btn(j.nickSurprise).click();
    await page.waitForTimeout(700);
    await shot("03-join-nickname");
    await btn(j.nickButton).click();
    await page.waitForTimeout(1200);
    const keyLength = age === "little" ? 2 : 3;
    for (const p of ["owl", "moon", "fern"].slice(0, keyLength)) await page.getByRole("button", { name: j.pictures[p as "owl"], exact: true }).click();
    await page.waitForTimeout(600);
    await shot("04-join-key");
    await btn(j.keyRememberButton).click({ timeout: 10_000 });
    await page.waitForURL("**/me", { timeout: 30_000 });
    if (big) {
      // a signed-in student's settings come from their account (that's what protects shared Chromebooks), so save them there
      await page.evaluate(`fetch("/api/me/access", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: 2, contrast: true, reading: "spaced" }) })`);
      await page.reload({ waitUntil: "load" });
    }
    await page.waitForTimeout(3500);
    await shot("05-home");
    await btn(t.access.open).click();
    await page.waitForTimeout(900);
    await shot("06-home-ways-to-play");
    await esc();

    // the lesson (test mode reaches every moment without typing)
    await page.goto(`${BASE}/play/${cls.lesson}?test`, { waitUntil: "load" });
    await page.waitForTimeout(4000);
    await shot("07-title");
    await btn(new RegExp(`^(${[t.titleCta, t.titleContinue].map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`)).click();
    await page.waitForTimeout(1800);
    await shot("09-intro");
    const skip = btn(t.introSkip);
    if (await skip.isVisible().catch(() => false)) await skip.click();
    await page.waitForTimeout(2500);
    await shot("10-teach");
    await page.locator("#teach").fill(lang === "fr" ? "je pense que c'est parce que la Terre est penchée" : "i think it's because the earth is tilted, so our half leans toward the sun");
    await page.waitForTimeout(300);
    await shot("11-teach-typing");
    await page.locator("#teach").fill("");
    await esc(); // pause
    await shot("12-pause");
    await inDialog(t.titleHelp).click();
    await page.waitForTimeout(700);
    await shot("08-help");
    await esc();
    await esc(); // pause again
    await inDialog(t.access.open).click();
    await page.waitForTimeout(900);
    await shot("13-ways-to-play");
    await esc();
    await esc();
    await page.getByRole("button", { name: t.log }).last().click();
    await page.waitForTimeout(800);
    await shot("14-conversation");
    await esc();
    if (style.look.world) {
      await esc();
      // (keyboard: Playwright's pointer check is fooled by the button's drawn layer here; a real click works)
      await inDialog(t.trailMap).focus();
      await page.keyboard.press("Enter");
      await page.waitForTimeout(1200);
      await shot("15-trail-map");
      await esc();
    }
    await page.getByRole("button", { name: "Teach the next idea now" }).click();
    await page.waitForTimeout(2200);
    await shot("16-eureka");
    const skipMoment = btn(t.skip);
    // (the moment may end by itself between seeing the button and clicking it)
    if (await skipMoment.isVisible().catch(() => false)) await skipMoment.click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(3000);
    await shot("17-after-first-idea");
    await page.getByRole("button", { name: "Teach everything (finale)" }).click();
    await page.waitForTimeout(3000);
    if (await skipMoment.isVisible().catch(() => false)) await skipMoment.click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(9000);
    await shot("18-ending-recap");
  } catch (e) {
    const why = (e as Error).message.split("\n").filter((l) => /intercepts|not stable|not visible|resolved to/.test(l)).slice(-2).join(" | ");
    findings.push({ screen: screen || tag, kind: "error", severity: "fail", detail: `the walk-through stopped: ${(e as Error).message.split("\n")[0].slice(0, 120)} ${why.slice(0, 300)}` });
    await page.screenshot({ path: path.join(dir, "zz-stopped-here.png") }).catch(() => {});
    console.log("layers:", await page.evaluate(() => [...document.querySelectorAll(".fixed.z-40")].map((e) => (e.textContent ?? "").slice(0, 40))).catch(() => []));
  }
  await ctx.close();
}

/* ---------------- teacher screens ---------------- */

async function teacherRun(browser: Browser, size: SizeName, classId: string) {
  const tag = `teacher-${size}`;
  const dir = path.join(OUT, "teacher", size);
  const ctx = await context(browser, size, { lang: "en" });
  const page = await ctx.newPage();
  let screen = "";
  listen(page, () => screen);
  const shot = async (name: string, full = true) => {
    screen = `${tag} ${name}`;
    await page.waitForTimeout(400);
    fs.mkdirSync(dir, { recursive: true });
    await check(page, screen, path.join(dir, `${name}.png`));
    if (full) await page.screenshot({ path: path.join(dir, `${name}-full.png`), fullPage: true });
  };
  try {
    await page.goto(`${BASE}/teacher`, { waitUntil: "load", timeout: 180_000 });
    await page.waitForTimeout(2000);
    await shot("01-sign-in");
    await page.getByRole("button", { name: /Make an account/ }).click();
    await page.waitForTimeout(600);
    await shot("02-sign-up");
    await page.getByRole("button", { name: /Sign in instead|I have an account|Back to sign in/ }).first().click().catch(() => page.goto(`${BASE}/teacher`));
    await page.waitForTimeout(600);
    await page.getByRole("button", { name: /Forgot your password/ }).click();
    await page.waitForTimeout(600);
    await shot("03-recover");
    await page.goto(`${BASE}/teacher`, { waitUntil: "load" });
    await page.getByLabel("Email").fill(TEACHER.email);
    await page.getByLabel("Password").fill(TEACHER.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForTimeout(3500);
    await shot("04-home");
    await page.goto(`${BASE}/teacher/classes/${classId}`, { waitUntil: "load" });
    await page.waitForTimeout(4000);
    await shot("05-class");
    await page.getByRole("button", { name: "Show the code" }).click();
    await page.waitForTimeout(1500);
    await shot("06-show-code", false);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(600);
    const someone = page.locator("table button, [data-student] button, button:has-text('Owl'), button:has-text('Otter')").first();
    if (await someone.isVisible().catch(() => false)) {
      await someone.click();
      await page.waitForTimeout(1500);
      await shot("07-student", false);
      await page.keyboard.press("Escape");
    }
    await page.goto(`${BASE}/teacher/lessons/new`, { waitUntil: "load" });
    await page.waitForTimeout(2500);
    await shot("08-new-lesson");
    await page.goto(`${BASE}/teacher/lessons/b808780d-35ae-4530-8456-b7cf249865c1`, { waitUntil: "load" });
    await page.waitForTimeout(3000);
    await shot("09-lesson-review");
    await page.goto(`${BASE}/teacher/status`, { waitUntil: "load" });
    await page.waitForTimeout(3000);
    await shot("10-status");
    await page.goto(`${BASE}/teacher/help`, { waitUntil: "load" });
    await page.waitForTimeout(2000);
    await shot("11-help");
    await page.goto(`${BASE}/nothing-here`, { waitUntil: "load" });
    await page.waitForTimeout(1500);
    await shot("12-not-found", false);
  } catch (e) {
    const why = (e as Error).message.split("\n").filter((l) => /intercepts|not stable|not visible|resolved to/.test(l)).slice(-2).join(" | ");
    findings.push({ screen: screen || tag, kind: "error", severity: "fail", detail: `the walk-through stopped: ${(e as Error).message.split("\n")[0].slice(0, 120)} ${why.slice(0, 300)}` });
    await page.screenshot({ path: path.join(dir, "zz-stopped-here.png") }).catch(() => {});
  }
  await ctx.close();
}

/* ---------------- report ---------------- */

function report() {
  const fails = findings.filter((f) => f.severity === "fail");
  const warns = findings.filter((f) => f.severity === "warn");
  const group = (list: Finding[]) => {
    const by = new Map<string, string[]>();
    for (const f of list) {
      const k = `${f.kind}: ${f.detail}`;
      by.set(k, [...(by.get(k) ?? []), f.screen]);
    }
    return [...by].sort((a, b) => b[1].length - a[1].length).map(([k, screens]) => `- **${k}**  (${screens.length}×: ${screens.slice(0, 4).join("; ")}${screens.length > 4 ? "; …" : ""})`);
  };
  const md = `# Every-page check\n\n${new Date().toISOString()}. ${shots} screens checked. **${fails.length} problems**, ${warns.length} warnings.\n\n## Problems\n\n${group(fails).join("\n") || "None."}\n\n## Warnings\n\n${group(warns).join("\n") || "None."}\n`;
  fs.writeFileSync(path.join(OUT, "report.md"), md);
  fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(findings, null, 1));
  console.log(`\n${shots} screens checked: ${fails.length} problems, ${warns.length} warnings. See screenshots/audit/report.md`);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const classes = await prepare();
  const browser = await chromium.launch({ args: ["--enable-gpu", "--ignore-gpu-blocklist"] });
  // the walk-throughs don't use the AI (test mode skips ahead), so a few run side by side
  const jobs: (() => Promise<void>)[] = [];
  if (only !== "teacher") {
    for (const age of ages)
      for (const lang of langs)
        for (const size of sizes) {
          const cls = classes[`${age}-${lang}`];
          if (variants.includes("base")) jobs.push(() => studentRun(browser, age, lang, size, false, cls));
          // bigger text + stronger contrast + more spacing, at the two sizes most likely to break
          if (variants.includes("big") && (size === "chromebook" || size === "phone")) jobs.push(() => studentRun(browser, age, lang, size, true, cls));
        }
  }
  if (only !== "student") for (const size of sizes) jobs.push(() => teacherRun(browser, size, classes["little-en"].id));
  let next = 0;
  let done = 0;
  const worker = async () => {
    while (next < jobs.length) {
      const job = jobs[next++];
      await job();
      console.log(`${++done}/${jobs.length} walk-throughs done`);
    }
  };
  await Promise.all(Array.from({ length: Number(arg("parallel") ?? 4) }, worker));
  await browser.close();
  report();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
