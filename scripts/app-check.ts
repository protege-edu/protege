/**
 * The app's quality gate (like site-check.ts for the website): every student screen, in every age style, at the
 * screen shapes people really use (with real scrollbars), and it fails on:
 *   - sideways scrolling
 *   - words cut off: by the edge of the screen, or by a box that hides what overflows it
 *   - words on top of other words
 *   - errors in the page
 * Writes a report and a screenshot of every screen to screenshots/app-check/.
 *
 * Uses the dev server (npm run dev -- --port 3100) and its local database: it adds a test class and lesson per
 * age style (and test students), and removes them all again at the end. The teacher's screens are checked signed
 * in as the database's first teacher (a cookie signed with this database's own secret: local only).
 *
 *   npx tsx scripts/app-check.ts                         everything
 *   npx tsx scripts/app-check.ts --only 1920x850 --age senior
 */
import { createClient } from "@libsql/client";
import { createHmac } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { chromium, type Page } from "playwright";
import { getAgeStyle } from "../lib/age-styles";
import { newPlay, openBoss, openChallenge } from "../lib/game/engine";
import type { LessonBlueprint } from "../lib/lesson/types";

const BASE = process.env.APP_URL ?? "http://localhost:3100";
const args = process.argv.slice(2);
const arg = (k: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : null);
const OUT = path.join(process.cwd(), "screenshots", process.argv.includes("fr") ? "app-check-fr" : "app-check");
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

// the user's own laptop (1920x850 and 1270x547 at 150%), a school Chromebook, a tablet held up, a phone
const SIZES: [number, number][] = [
  [1920, 850],
  [1366, 768],
  [1270, 547],
  [768, 1024],
  [390, 844],
];
const AGES = ["little", "junior", "middle", "senior"] as const;
type Age = (typeof AGES)[number];
const GRADE: Record<Age, number> = { little: 1, junior: 4, middle: 7, senior: 10 };
const sizes = arg("--only") ? SIZES.filter(([w, h]) => `${w}x${h}` === arg("--only")) : SIZES;
const ages = arg("--age") ? AGES.filter((a) => a === arg("--age")) : AGES;
// --lang fr: every screen in French (longer words: the layouts have to hold them too)
const LANG = arg("--lang") === "fr" ? "fr" : "en";

const db = createClient({ url: `file:${path.join(process.env.PROTEGE_DATA_DIR ?? path.join(process.env.LOCALAPPDATA!, "Protege"), "protege.db").split(path.sep).join("/")}` });
const base = JSON.parse(fs.readFileSync("data/replay/canada-grade-4.json", "utf8")) as LessonBlueprint;

// ---------- fixtures: a class and an approved lesson per age style ----------
const made = { students: new Set<string>(), sessions: new Set<string>() };
async function fixtures() {
  const teacher = (await db.execute("select id from teachers limit 1")).rows[0]?.id as string | undefined;
  const now = Date.now();
  for (const [i, age] of AGES.entries()) {
    const lesson = { ...base, id: `check-${age}`, ageStyle: age, grade: GRADE[age], language: LANG };
    await db.execute({ sql: "delete from class_lessons where lesson_id = ?", args: [lesson.id] });
    await db.execute({ sql: "delete from lessons where id = ?", args: [lesson.id] });
    // (the teacher's own lesson, so their dashboard can show it)
    await db.execute({ sql: "insert into lessons (id, title, grade, status, blueprint, teacher_id, created_at, updated_at, approved_at) values (?, ?, ?, 'approved', ?, ?, ?, ?, ?)", args: [lesson.id, lesson.title, lesson.grade, JSON.stringify(lesson), teacher ?? null, now, now, now] });
    await db.execute({ sql: "delete from classes where id = ?", args: [`check-class-${age}`] });
    await db.execute({ sql: "insert into classes (id, name, grade, teacher_id, code, game, language, created_at) values (?, ?, ?, ?, ?, 1, ?, ?)", args: [`check-class-${age}`, `Check ${age}`, GRADE[age], teacher ?? null, `CHECK-${10 + i}`, LANG, now] });
    await db.execute({ sql: "insert into class_lessons (class_id, lesson_id, assigned_at, position) values (?, ?, ?, 0)", args: [`check-class-${age}`, lesson.id, now] });
  }
}
async function cleanup() {
  const sess = [...made.sessions];
  for (const id of sess) {
    for (const t of ["concept_events", "encounters", "messages"]) await db.execute({ sql: `delete from ${t} where session_id = ?`, args: [id] });
    await db.execute({ sql: "delete from teach_sessions where id = ?", args: [id] });
  }
  const kids = (await db.execute("select id from students where class_id like 'check-class-%'")).rows.map((r) => r.id as string);
  for (const id of [...kids, ...made.students]) {
    for (const s of (await db.execute({ sql: "select id from teach_sessions where student_id = ?", args: [id] })).rows) {
      for (const t of ["concept_events", "encounters", "messages"]) await db.execute({ sql: `delete from ${t} where session_id = ?`, args: [s.id as string] });
    }
    await db.execute({ sql: "delete from teach_sessions where student_id = ?", args: [id] });
    await db.execute({ sql: "delete from gloams where student_id = ?", args: [id] });
    await db.execute({ sql: "delete from students where id = ?", args: [id] });
  }
  for (const age of AGES) {
    const bosses = (await db.execute({ sql: "select id from class_bosses where class_id = ?", args: [`check-class-${age}`] })).rows.map((r) => r.id);
    for (const b of bosses) await db.execute({ sql: "delete from class_boss_hits where boss_id = ?", args: [b] });
    await db.execute({ sql: "delete from class_bosses where class_id = ?", args: [`check-class-${age}`] });
    await db.execute({ sql: "delete from class_lessons where class_id = ?", args: [`check-class-${age}`] });
    await db.execute({ sql: "delete from classes where id = ?", args: [`check-class-${age}`] });
    await db.execute({ sql: "delete from lessons where id = ?", args: [`check-${age}`] });
  }
}

// ---------- the checks, run in the page ----------
interface Problem {
  where: string;
  what: string;
}
const problems: Problem[] = [];
async function check(p: Page, where: string, errors: string[]) {
  await p.waitForTimeout(700);
  const file = `${problems.length}-${where.replace(/[^a-z0-9]+/gi, "-")}.png`;
  await p.screenshot({ path: path.join(OUT, file) });
  const found = await p.evaluate(() => {
    const out: string[] = [];
    const vw = innerWidth;
    const vh = innerHeight;
    if (document.documentElement.scrollWidth > vw + 1) out.push(`scrolls sideways (${document.documentElement.scrollWidth}px wide on a ${vw}px screen)`);
    const visible = (el: Element) => {
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) < 0.05) return false;
      for (let a: Element | null = el; a; a = a.parentElement) {
        const s = getComputedStyle(a);
        if (Number(s.opacity) < 0.05 || a.getAttribute("aria-hidden") === "true" || s.display === "none") return false;
      }
      return true;
    };
    // the elements whose own text is on screen
    const texts = [...document.querySelectorAll("body *")].filter((el) => {
      if (["SCRIPT", "STYLE", "svg", "path", "TEXTAREA", "INPUT", "OPTION"].includes(el.tagName)) return false;
      const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim().length > 1);
      return own && visible(el);
    });
    const rectOf = (el: Element) => {
      const r = document.createRange();
      r.selectNodeContents(el);
      return r.getBoundingClientRect();
    };
    // screen-reader-only text isn't on screen (a 1px clipped box), whatever its text measures
    const srOnly = (el: Element) => {
      for (let a: Element | null = el; a; a = a.parentElement) {
        const b = a.getBoundingClientRect();
        const s = getComputedStyle(a);
        if ((b.width <= 2 && b.height <= 2) || s.clip === "rect(0px, 0px, 0px, 0px)" || s.clipPath === "inset(50%)") return true;
      }
      return false;
    };
    const scrolls = (a: Element) => {
      const s = getComputedStyle(a);
      return (/(auto|scroll)/.test(s.overflowY) && a.scrollHeight > a.clientHeight + 1) || (/(auto|scroll)/.test(s.overflowX) && a.scrollWidth > a.clientWidth + 1);
    };
    // what of it is actually visible: cut by its own box and every box above it that doesn't let things overflow
    // (so a title shortened on purpose with "…" counts as what's showing, not as running off the screen)
    const seen = (el: Element, r: DOMRect) => {
      let [l, t, rr, bb] = [r.left, r.top, r.right, r.bottom];
      for (let a: Element | null = el; a && a !== document.documentElement; a = a.parentElement) {
        const s = getComputedStyle(a);
        if (s.overflowX !== "visible" || s.overflowY !== "visible") {
          const c = a.getBoundingClientRect();
          [l, t, rr, bb] = [Math.max(l, c.left), Math.max(t, c.top), Math.min(rr, c.right), Math.min(bb, c.bottom)];
        }
      }
      return { left: l, top: t, right: rr, bottom: bb, width: Math.max(0, rr - l), height: Math.max(0, bb - t) };
    };
    const pageScrolls = document.documentElement.scrollHeight > vh + 2;
    const label = (el: Element) => `"${(el.textContent ?? "").trim().slice(0, 40)}"`;
    // text in a closed <details> isn't shown (only its summary is), though Chrome still gives it boxes
    const folded = (el: Element) => {
      const d = el.closest("details:not([open])");
      return !!d && !el.closest("summary");
    };
    const boxes = texts
      .filter((el) => !srOnly(el) && !folded(el))
      .map((el) => {
        const r = rectOf(el);
        return { el, r, v: seen(el, r) };
      })
      .filter((x) => x.r.width > 1 && x.r.height > 1);
    for (const { el, r, v } of boxes) {
      // in a box that scrolls: it can be scrolled to, so it isn't cut off
      let inScroll = false;
      let cut = false;
      for (let a: Element | null = el; a && a !== document.body; a = a.parentElement) {
        if (scrolls(a)) {
          inScroll = true;
          break;
        }
        const s = getComputedStyle(a);
        if (/(hidden|clip)/.test(s.overflowX + s.overflowY)) {
          const b = a.getBoundingClientRect();
          if (b.width > 4 && b.height > 4 && (r.left < b.left - 2 || r.right > b.right + 2 || r.top < b.top - 2 || r.bottom > b.bottom + 2) && !s.textOverflow.includes("ellipsis") && !/line-clamp|truncate/.test(String(a.className) + " " + String(el.className))) cut = true;
        }
      }
      if (inScroll) continue;
      if (cut) out.push(`cut off by its box: ${label(el)}`);
      else if (v.left < -2 || v.right > vw + 2 || (!pageScrolls && (v.top < -2 || v.bottom > vh + 2))) out.push(`cut off by the screen: ${label(el)}`);
    }
    // the thick grey system scrollbar, anywhere (scrolling is fine; that bar isn't)
    for (const a of [document.documentElement, ...document.querySelectorAll("body *")]) {
      if (!scrolls(a)) continue;
      const bar = (a as HTMLElement).offsetWidth - a.clientWidth - parseFloat(getComputedStyle(a).borderLeftWidth) - parseFloat(getComputedStyle(a).borderRightWidth);
      if (bar > 12) out.push(`a thick scrollbar (${bar}px) on ${a.tagName.toLowerCase()}.${String(a.className).split(" ").slice(0, 2).join(".")}`);
    }
        // words on words (not inside each other; dialogs cover what's under them on purpose)
    const inDialog = (el: Element) => !!el.closest("[role=dialog]");
    const anyDialog = !!document.querySelector("[role=dialog]");
    const shown = boxes.filter((b) => (!anyDialog || inDialog(b.el)) && b.v.width > 2 && b.v.height > 2);
    for (let i = 0; i < shown.length; i++)
      for (let j = i + 1; j < shown.length; j++) {
        const a = shown[i];
        const b = shown[j];
        if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
        const x = Math.min(a.v.right, b.v.right) - Math.max(a.v.left, b.v.left);
        const y = Math.min(a.v.bottom, b.v.bottom) - Math.max(a.v.top, b.v.top);
        if (x > 4 && y > 4 && x * y > 0.2 * Math.min(a.v.width * a.v.height, b.v.width * b.v.height)) out.push(`words on words: ${label(a.el)} / ${label(b.el)}`);
      }
    return [...new Set(out)].slice(0, 12);
  });
  for (const e of errors.splice(0)) found.push(`page error: ${e.slice(0, 160)}`);
  for (const what of found) problems.push({ where: `${where} [${file}]`, what });
  console.log(`${found.length ? "  ✗" : "  ok"} ${where}${found.length ? `: ${found.length}` : ""}`);
}

// ---------- the screens ----------
async function session(lessonId: string): Promise<{ id: string; studentId: string }> {
  const r = await fetch(`${BASE}/api/session`, { method: "POST", headers: { "Content-Type": "application/json", Origin: BASE }, body: JSON.stringify({ lessonId, fresh: true }) });
  const s = (await r.json()) as { id: string; studentId: string };
  made.sessions.add(s.id);
  made.students.add(s.studentId);
  return s;
}
const START = /Start teaching|Keep teaching|Keep playing|Let's play|Let's go|Start|Continue|Practice first|Commencer|Continuer|On joue|Juste jouer|M'entraîner/;
const SKIP = /skip|passer/i;

async function playScreens(p: Page, age: Age, size: string, errors: string[]) {
  const lesson = { ...base, id: `check-${age}`, ageStyle: age, grade: GRADE[age] };
  const tag = `${size} ${age}`;
  const s = await session(lesson.id);
  await p.context().addInitScript(([lid, sid, st]) => {
    try {
      localStorage.setItem(`protege.session.${lid}`, sid);
      localStorage.setItem("protege.student", st);
    } catch {}
  }, [lesson.id, s.id, s.studentId]);
  await p.goto(`${BASE}/play/${lesson.id}`, { waitUntil: "load", timeout: 180_000 });
  await p.getByRole("button", { name: START }).first().waitFor({ timeout: 90_000 });
  await p.waitForTimeout(2500);
  await check(p, `${tag} title`, errors);
  await p.getByRole("button", { name: START }).first().click();
  await p.waitForTimeout(1500);
  await check(p, `${tag} intro`, errors);
  await p.getByRole("button", { name: SKIP }).first().click({ timeout: 15_000 }).catch(() => {});
  await p.locator("#teach").waitFor({ timeout: 60_000 });
  await p.waitForTimeout(3000);
  await check(p, `${tag} teach`, errors);
  // each challenge, and the boss, opened on the session (as the game would), then the page reloaded
  const g = (await import("../lib/age-styles/game-lines")).gameLines(age, LANG);
  const first = lesson.concepts[0].id;
  const kinds = ["rival", "notebook", "whatif", "recital", "order", "boss"] as const;
  for (const kind of kinds) {
    if (kind === "order" && !lesson.sequence) continue;
    const open = kind === "boss" ? openBoss(lesson) : openChallenge(lesson, kind, kind === "order" ? lesson.sequence!.conceptId : first);
    const u = Object.fromEntries(lesson.concepts.map((c) => [c.id, kind === "boss" ? 3 : c.id === first ? 2 : 0]));
    await db.execute({ sql: "update teach_sessions set understanding = ?, play = ? where id = ?", args: [JSON.stringify(u), JSON.stringify({ ...newPlay(lesson), open }), s.id] });
    if (kind === "rival" || kind === "boss") {
      const line = (kind === "boss" ? g.bossSays.arrive[0] : g.rivalSays.arrive[0]).replace("{claim}", lesson.concepts[0].misconception);
      await db.execute({ sql: "insert into messages (session_id, \"from\", text, created_at) values (?, ?, ?, ?)", args: [s.id, kind === "boss" ? "muddle" : "rival", line, Date.now()] });
    }
    await p.reload({ waitUntil: "load" });
    await p.getByRole("button", { name: START }).first().click({ timeout: 90_000 });
    await p.locator("#teach").waitFor({ timeout: 60_000 });
    await p.waitForTimeout(3500);
    await check(p, `${tag} ${kind}`, errors);
  }
  // the ending: everything lit and the lesson finished
  await db.execute({ sql: "update teach_sessions set understanding = ?, play = null, finished_at = ? where id = ?", args: [JSON.stringify(Object.fromEntries(lesson.concepts.map((c) => [c.id, 3]))), Date.now(), s.id] });
  await p.reload({ waitUntil: "load" });
  await p.getByRole("button", { name: START }).first().click({ timeout: 90_000 }).catch(() => {});
  await p.waitForTimeout(4000);
  await check(p, `${tag} ending`, errors);
}

async function homeScreens(p: Page, age: Age, size: string, errors: string[]) {
  const tag = `${size} ${age}`;
  const j = getAgeStyle(age, LANG).copy.join;
  await p.goto(`${BASE}/join?code=CHECK-${10 + AGES.indexOf(age)}&switch=1`, { waitUntil: "load", timeout: 180_000 });
  await p.getByRole("button", { name: j.whoNew }).or(p.getByRole("button", { name: j.nickSurprise })).first().waitFor({ timeout: 90_000 });
  await p.waitForTimeout(1200);
  await check(p, `${tag} join`, errors);
  if (await p.getByRole("button", { name: j.whoNew }).isVisible().catch(() => false)) await p.getByRole("button", { name: j.whoNew }).click();
  await p.getByRole("button", { name: j.nickSurprise }).click();
  await p.getByRole("button", { name: j.nickButton }).click();
  await p.waitForTimeout(1500);
  await check(p, `${tag} pictures`, errors);
  const pics = age === "little" ? (["owl", "moon"] as const) : (["owl", "moon", "fern"] as const);
  for (const pic of pics) await p.getByRole("button", { name: j.pictures[pic], exact: true }).click();
  await p.getByRole("button", { name: j.keyRememberButton }).click();
  await p.waitForURL("**/me", { timeout: 90_000 });
  const kid = (await db.execute("select id from students order by created_at desc limit 1")).rows[0].id as string;
  made.students.add(kid);
  // some fireflies and two things out, so the stash and the props are checked too
  await db.execute({ sql: "insert into gloams (student_id, fireflies, spent, owned, wearing, updated_at) values (?, 300, 0, ?, ?, ?) on conflict(student_id) do update set fireflies = 300, owned = excluded.owned, wearing = excluded.wearing", args: [kid, JSON.stringify(["books", "tent"]), JSON.stringify(["books", "tent"]), Date.now()] });
  await p.reload({ waitUntil: "load" });
  await p.waitForTimeout(3500);
  await check(p, `${tag} home`, errors);
  const ui = (await import("../lib/age-styles/game-ui")).gameUi(age, LANG);
  await p.getByRole("button", { name: ui.stashTitle }).click();
  await p.waitForTimeout(1200);
  await check(p, `${tag} stash`, errors);
  await p.keyboard.press("Escape");
  await p.waitForTimeout(600);
  await p.getByRole("button", { name: getAgeStyle(age, LANG).copy.home.journalTitle }).click();
  await p.waitForTimeout(1200);
  await check(p, `${tag} journal`, errors);
  await p.keyboard.press("Escape");
  // the whole-class boss, as a student in the class sees it while teaching (the teacher started one)
  const cls = `check-class-${age}`;
  await db.execute({ sql: "insert into class_bosses (class_id, need, hits, started_at, beaten) values (?, 10, 4, ?, 0)", args: [cls, Date.now()] });
  await p.goto(`${BASE}/play/check-${age}`, { waitUntil: "load", timeout: 180_000 });
  await p.getByRole("button", { name: START }).first().click({ timeout: 90_000 });
  await p.waitForTimeout(1200);
  await p.getByRole("button", { name: SKIP }).first().click({ timeout: 15_000 }).catch(() => {});
  await p.locator("#teach").waitFor({ timeout: 60_000 });
  await p.waitForTimeout(3000);
  await check(p, `${tag} classboss`, errors);
  await db.execute({ sql: "delete from class_bosses where class_id = ?", args: [cls] });
}

/** The teacher's side, signed in as the database's first teacher: their classes, a class, the code, the jar, a boss fight */
async function teacherScreens(p: Page, _age: Age, size: string, errors: string[]) {
  const teacher = (await db.execute("select id from teachers limit 1")).rows[0]?.id as string | undefined;
  const secret = (await db.execute("select value from settings where key = 'cookie_secret'")).rows[0]?.value as string | undefined;
  if (!teacher || !secret) return console.log("  (no teacher account in this database: teacher screens skipped)");
  const expires = String(Date.now() + 864e5);
  const sig = createHmac("sha256", secret).update(`protege_teacher:${teacher}.${expires}`).digest("hex");
  await p.context().addCookies([{ name: "protege_teacher", value: `${teacher}.${expires}.${sig}`, url: BASE }]);
  const tag = `${size} teacher`;
  await p.goto(`${BASE}/teacher`, { waitUntil: "load", timeout: 180_000 });
  await p.waitForTimeout(2500);
  await check(p, `${tag} classes`, errors);
  await p.goto(`${BASE}/teacher/classes/check-class-senior?lesson=check-senior`, { waitUntil: "load", timeout: 180_000 });
  await p.getByRole("button", { name: "Show the code" }).waitFor({ timeout: 90_000 });
  await p.waitForTimeout(2500);
  await check(p, `${tag} class`, errors);
  await p.getByRole("button", { name: "Show the code" }).click();
  await p.waitForTimeout(1500);
  await check(p, `${tag} code`, errors);
  await p.keyboard.press("Escape");
  await p.waitForTimeout(600);
  await p.getByRole("button", { name: "Show the class jar" }).click();
  await p.waitForTimeout(1500);
  await check(p, `${tag} jar`, errors);
  // a class boss fight, started from the projector, then beaten by the class
  await p.getByRole("button", { name: "Start a class boss fight" }).click();
  await p.getByRole("button", { name: "End the fight for today" }).waitFor({ timeout: 30_000 });
  await p.waitForTimeout(1500);
  await check(p, `${tag} boss`, errors);
  await db.execute({ sql: "update class_bosses set hits = need, ended_at = ?, beaten = 1 where class_id = 'check-class-senior' and ended_at is null", args: [Date.now()] });
  await p.getByRole("button", { name: "Back to the class jar" }).waitFor({ timeout: 30_000 });
  await p.waitForTimeout(2500);
  await check(p, `${tag} boss beaten`, errors);
  // the rest of the teacher's pages: reviewing a lesson, new lessons from notes, help, the owner's page
  for (const [name, url] of [
    ["review", "/teacher/lessons/check-senior"],
    ["new lessons", "/teacher/lessons/new"],
    ["help", "/teacher/help"],
    ["owner", "/teacher/owner"],
  ] as const) {
    await p.goto(`${BASE}${url}`, { waitUntil: "load", timeout: 180_000 });
    await p.waitForTimeout(3500);
    await check(p, `${tag} ${name}`, errors);
    // and with every folded section opened (what a teacher reads when they check a draft)
    if (await p.locator("details:not([open])").count()) {
      await p.evaluate(() => document.querySelectorAll("details").forEach((d) => (d.open = true)));
      await p.waitForTimeout(600);
      await check(p, `${tag} ${name} opened`, errors);
    }
  }
  // signed out: the sign-in page
  await p.context().clearCookies();
  await p.goto(`${BASE}/teacher`, { waitUntil: "load", timeout: 180_000 });
  await p.waitForTimeout(2500);
  await check(p, `${tag} sign in`, errors);
}

async function main() {
  await fixtures();
  // real scrollbars, like Windows Chrome (headless Chrome hides them)
  const browser = await chromium.launch({ ignoreDefaultArgs: ["--hide-scrollbars"] });
  try {
    for (const [w, h] of sizes) {
      for (const age of ages) {
        const size = `${w}x${h}`;
        // (the teacher's screens look the same for every age: once per screen size)
        for (const part of age === ages[0] ? [playScreens, homeScreens, teacherScreens] : [playScreens, homeScreens]) {
          const ctx = await browser.newContext({ viewport: { width: w, height: h } });
          // (the script runner names functions with a helper the page doesn't have: give it one)
          await ctx.addInitScript("window.__name = (f) => f");
          const p = await ctx.newPage();
          const errors: string[] = [];
          p.on("pageerror", (e) => errors.push(e.message));
          p.on("console", (m) => m.type() === "error" && !/Failed to load resource|favicon/.test(m.text()) && errors.push(m.text()));
          try {
            await part(p, age, size, errors);
          } catch (e) {
            problems.push({ where: `${size} ${age} ${part.name}`, what: `stopped: ${(e as Error).message.split("\n")[0]}` });
            await p.screenshot({ path: path.join(OUT, `stopped-${size}-${age}-${part.name}.png`) }).catch(() => {});
            console.log(`  ✗ ${size} ${age} ${part.name} stopped`);
          }
          await ctx.close();
        }
      }
    }
  } finally {
    await browser.close();
    await cleanup();
  }
  const report = problems.map((p) => `- ${p.where}: ${p.what}`).join("\n");
  fs.writeFileSync(path.join(OUT, "report.md"), `# App check: ${problems.length} problems\n\n${report}\n`);
  console.log(`\n# App check: ${problems.length} problems\n${report}`);
  if (problems.length) process.exitCode = 1;
}

void main();
