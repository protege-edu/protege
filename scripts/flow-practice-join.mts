// The bug a play-tester hit: practise a lesson as a guest, then join the class and teach it. Their teacher must
// see the conversation (it used to carry on in the guest's practice session, invisible to the teacher).
// Local database only; everything it adds is removed again. One real AI turn (a fraction of a cent).
//   npx tsx scripts/flow-practice-join.mts        (with the dev server on port 3100)
import { chromium } from "playwright";
import { createClient } from "@libsql/client";
import { createHmac } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { getAgeStyle } from "../lib/age-styles";
const BASE = "http://localhost:3100";
const db = createClient({ url: `file:${path.join(process.env.LOCALAPPDATA!, "Protege", "protege.db")}` });
const teacher = String((await db.execute("select id from teachers limit 1")).rows[0].id);
const lesson = { ...JSON.parse(fs.readFileSync("data/replay/canada-grade-9.json", "utf8")), id: "practice-join-check", ageStyle: "senior", grade: 9, language: "en" };
const CLS = "practice-join-class";
async function cleanup() {
  const kids = (await db.execute({ sql: "select id from students where class_id = ?", args: [CLS] })).rows.map((r) => String(r.id));
  const sess = (await db.execute({ sql: "select id from teach_sessions where lesson_id = ?", args: [lesson.id] })).rows.map((r) => String(r.id));
  for (const s of sess) for (const t of ["concept_events", "encounters", "messages"]) await db.execute({ sql: `delete from ${t} where session_id = ?`, args: [s] });
  await db.execute({ sql: "delete from teach_sessions where lesson_id = ?", args: [lesson.id] });
  for (const k of kids) for (const t of ["gloams", "students"]) await db.execute({ sql: `delete from ${t} where ${t === "students" ? "id" : "student_id"} = ?`, args: [k] });
  await db.execute({ sql: "delete from class_lessons where class_id = ?", args: [CLS] });
  await db.execute({ sql: "delete from classes where id = ?", args: [CLS] });
  await db.execute({ sql: "delete from lessons where id = ?", args: [lesson.id] });
}
await cleanup();
const now = Date.now();
await db.execute({ sql: "insert into lessons (id, title, grade, status, blueprint, teacher_id, created_at, updated_at, approved_at) values (?, ?, 9, 'approved', ?, ?, ?, ?, ?)", args: [lesson.id, lesson.title, JSON.stringify(lesson), teacher, now, now, now] });
await db.execute({ sql: "insert into classes (id, name, grade, teacher_id, code, game, language, created_at) values (?, 'Practice then join', 9, ?, 'PJCK-55', 0, 'en', ?)", args: [CLS, teacher, now] });
await db.execute({ sql: "insert into class_lessons (class_id, lesson_id, assigned_at, position) values (?, ?, ?, 0)", args: [CLS, lesson.id, now] });
const st = getAgeStyle("senior", "en");
const b = await chromium.launch();
let ok = false;
try {
  const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
  // 1. a guest practises the lesson first
  await p.goto(`${BASE}/play/${lesson.id}`, { waitUntil: "load", timeout: 180_000 });
  await p.getByRole("button", { name: /Start teaching|Practice first/ }).first().click({ timeout: 90_000 });
  await p.waitForTimeout(3000);
  const practice = await p.evaluate((id) => localStorage.getItem(`protege.session.${id}`), lesson.id);
  console.log("1. practised as a guest, session saved on the device:", !!practice);
  // 2. then joins the class with the short link
  const j = st.copy.join;
  await p.goto(`${BASE}/j/pjck-55`, { waitUntil: "load", timeout: 180_000 });
  await p.getByRole("button", { name: j.nickSurprise }).click({ timeout: 90_000 });
  await p.getByRole("button", { name: j.nickButton }).click();
  await p.waitForTimeout(1200);
  for (const pic of ["owl", "moon", "fern"] as const) await p.getByRole("button", { name: j.pictures[pic], exact: true }).click();
  await p.getByRole("button", { name: j.keyRememberButton }).click();
  await p.waitForURL("**/me", { timeout: 90_000 });
  const kid = String((await db.execute({ sql: "select id from students where class_id = ?", args: [CLS] })).rows[0].id);
  console.log("2. joined the class");
  // 3. opens the lesson and teaches Gloam
  await p.goto(`${BASE}/play/${lesson.id}`, { waitUntil: "load", timeout: 180_000 });
  await p.getByRole("button", { name: /Start teaching|Continue|Keep teaching/ }).first().click({ timeout: 90_000 });
  await p.getByRole("button", { name: /skip/i }).first().click({ timeout: 15_000 }).catch(() => {});
  await p.locator("#teach").waitFor({ timeout: 60_000 });
  await p.locator("textarea").first().fill("Most Canadians live near the US border because it's warmer down south, so it's easier to farm and live there.");
  await p.keyboard.press("Enter");
  await p.waitForFunction(() => document.body.innerText.length > 0, null, { timeout: 5000 });
  await p.waitForTimeout(15000);
  // 4. the teacher opens that student
  const secret = String((await db.execute("select value from settings where key = 'cookie_secret'")).rows[0].value);
  const exp = String(Date.now() + 864e5);
  const cookie = `protege_teacher=${teacher}.${exp}.${createHmac("sha256", secret).update(`protege_teacher:${teacher}.${exp}`).digest("hex")}`;
  const r = await fetch(`${BASE}/api/teacher/classes/${CLS}/students/${kid}?lesson=${lesson.id}`, { headers: { cookie } });
  const data = (await r.json()) as { messages: { from: string; text: string }[] };
  const said = data.messages.filter((m) => m.from === "student").length;
  console.log(`3+4. the teacher sees ${data.messages.length} lines (${said} from the student)`);
  ok = said >= 1;
} finally {
  await cleanup();
  await b.close();
}
console.log(ok ? "PASS: the teacher sees what the student taught" : "FAIL: the teacher can't see it");
process.exitCode = ok ? 0 : 1;
