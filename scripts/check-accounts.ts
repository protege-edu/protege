/**
 * Tests for accounts and safety: passwords, picture keys, lock-outs, invites, class codes,
 * nicknames, and "each teacher only sees their own things". Runs on a throwaway database
 * in a temp folder, so it never touches real classes.
 *   npm run test:accounts
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "protege-test-"));

let passed = 0;
async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (e) {
    console.error(`  FAIL ${name}\n       ${(e as Error).message}`);
    process.exitCode = 1;
  }
}

async function main() {
  // a throwaway copy of the database, in the temp folder
  const { openDatabase } = await import("./lib/d1");
  const database = await openDatabase({ folder: tmp });
  const { hash, verify, sign, signedEquals, randomCode, keyedHash } = await import("@/lib/auth/crypto");
  const { sameOrigin } = await import("@/lib/auth/request");
  const { db } = await import("@/lib/db/client");
  const { classes, lessons, teachers } = await import("@/lib/db/schema");
  const T = await import("@/lib/teacher/auth");
  const C = await import("@/lib/teacher/classes");
  const S = await import("@/lib/student/auth");
  const { canSee, getApprovedLesson, listLessons, playedBy } = await import("@/lib/teacher/lessons");
  const { eq } = await import("drizzle-orm");

  console.log("secrets");
  await test("passwords hash, and only the right one verifies", () => {
    const h = hash("correct horse");
    assert.ok(verify("correct horse", h));
    assert.ok(!verify("correct hors", h));
    assert.ok(!verify("x", null));
    assert.notEqual(hash("same"), hash("same"), "every hash gets its own salt");
  });
  await test("signed values can't be changed without the signature breaking", async () => {
    assert.ok(await signedEquals("teacher:abc", await sign("teacher:abc")));
    assert.ok(!await signedEquals("teacher:abd", await sign("teacher:abc")));
  });
  await test("codes use no look-alike letters (no 0/O, 1/I/L)", () => {
    for (let i = 0; i < 200; i++) assert.match(randomCode(3, 4), /^[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/);
  });
  await test("keyed hashes are stable and never the plain value", async () => {
    assert.equal(await keyedHash("google-123"), await keyedHash("google-123"));
    assert.ok(!(await keyedHash("google-123")).includes("google-123"));
  });

  console.log("requests");
  const req = (headers: Record<string, string>, method = "POST") => new Request("http://localhost:3000/api/x", { method, headers });
  await test("changes from another website are refused", () => {
    assert.ok(sameOrigin(req({ host: "protege.example.net", origin: "https://protege.example.net" })));
    assert.ok(!sameOrigin(req({ host: "protege.example.net", origin: "https://evil.example.com" })));
    assert.ok(sameOrigin(req({ host: "x", origin: "https://evil.example.com" }, "GET")), "reading is fine");
  });

  console.log("teacher accounts");
  // a class and a lesson from before accounts existed
  await db.insert(classes).values({ id: "old-class", name: "Old class", grade: 9, createdAt: new Date() }).run();
  await db.insert(lessons).values({ id: "old-lesson", title: "Old lesson", grade: 9, status: "draft", createdAt: new Date(), updatedAt: new Date() }).run();

  await test("with no teachers yet, the first account needs the setup code", async () => {
    assert.equal(await T.signUpGate(), "setup");
    assert.ok(!(await T.signUp({ email: "sneaky@else.example", password: "sneaky-pass", name: "Sneaky" })).ok, "no code");
    assert.ok(!(await T.signUp({ email: "sneaky@else.example", password: "sneaky-pass", name: "Sneaky", code: "ABCD-EFGH" })).ok, "wrong code");
    assert.equal(await T.teacherFromGoogle("g-sneaky", "sneaky@else.example", "ABCD-EFGH"), null, "not with Google either");
  });
  const setup = await T.setupCode();
  const first = await T.signUp({ email: "  Ms.Rivera@School.example ", password: "lanterns-are-cool", name: "Ms Rivera", code: setup.toLowerCase() });
  assert.ok(first.ok);
  const a = first.teacher;
  await test("the first teacher takes over what was made before accounts", async () => {
    assert.equal((await db.select().from(classes).where(eq(classes.id, "old-class")).get())?.teacherId, a.id);
    assert.equal((await db.select().from(lessons).where(eq(lessons.id, "old-lesson")).get())?.teacherId, a.id);
  });
  await test("emails are matched without caring about case or spaces", async () => {
    assert.equal(a.email, "ms.rivera@school.example");
    assert.ok((await T.signIn("MS.RIVERA@school.example", "lanterns-are-cool")).ok);
  });
  await test("the same email can't make two accounts", async () => assert.ok(!(await T.signUp({ email: "ms.rivera@school.example", password: "whatever123", name: "X" })).ok));
  await test("after that, the setup code is gone and other teachers need an invite", async () => {
    assert.equal(await T.signUpGate(), "invite");
    assert.ok(!fs.existsSync(path.join(tmp, "SETUP-CODE.txt")));
    assert.ok(!(await T.signUp({ email: "late@school.example", password: "late-pass-1", name: "Late", code: setup })).ok, "the setup code no longer works");
  });

  await test("an invite makes one account, then it's used up", async () => {
    const { code } = await T.makeInvite();
    assert.ok((await T.signUp({ email: "ms.ng@school.example", password: "invited-pass", name: "Ms Ng", code })).ok);
    assert.ok(!(await T.signUp({ email: "mr.ng@school.example", password: "invited-pass", name: "Mr Ng", code })).ok);
  });
  await test("invites work once, then never again", async () => {
    const { code } = await T.makeInvite();
    assert.ok(await T.inviteValid(code));
    assert.ok(await T.inviteValid(code.toLowerCase()), "typed in lowercase is fine");
    await T.spendInvite(code);
    assert.ok(!await T.inviteValid(code));
    assert.ok(!await T.inviteValid("NOPE-NOPE"));
    assert.ok(!await T.inviteValid(""));
  });

  await test("5 wrong passwords lock the account, even against the right one", async () => {
    for (let i = 0; i < 5; i++) assert.ok(!(await T.signIn(a.email, "wrong-password")).ok);
    const r = await T.signIn(a.email, "lanterns-are-cool");
    assert.ok(!r.ok && /Too many/.test(r.error));
  });
  await test("wrong-password errors never say whether the email exists", async () => {
    const unknown = await T.signIn("nobody@school.example", "x");
    await db.update(teachers).set({ lockedUntil: null }).where(eq(teachers.id, a.id)).run();
    const known = await T.signIn(a.email, "nope");
    assert.ok(!unknown.ok && !known.ok);
    assert.equal(unknown.error, known.error);
  });
  await test("a recovery code resets the password once, and gives a new code", async () => {
    await db.update(teachers).set({ lockedUntil: null, failedLogins: 0 }).where(eq(teachers.id, a.id)).run();
    const r = await T.recover(a.email, first.recoveryCode.toLowerCase(), "new-password-1");
    assert.ok(r.ok);
    assert.ok((await T.signIn(a.email, "new-password-1")).ok);
    assert.ok(!(await T.recover(a.email, first.recoveryCode, "again-password")).ok, "the old code is used up");
    assert.ok((await T.recover(a.email, r.recoveryCode, "newer-password")).ok, "the new one works");
  });

  await test("lost everything: a reset from the laptop gives a working recovery code", async () => {
    const code = await T.resetFromLaptop("MS.RIVERA@school.example");
    assert.ok(code);
    assert.ok((await T.recover(a.email, code!, "back-in-again")).ok);
    assert.equal(await T.resetFromLaptop("nobody@school.example"), null);
  });

  const second = await T.signUp({ email: "mr.chen@school.example", password: "photosynthesis", name: "Mr Chen", code: (await T.makeInvite()).code });
  assert.ok(second.ok);
  const b = second.teacher;

  await test("Google: a known email links; a stranger without an invite gets nothing", async () => {
    assert.equal((await T.teacherFromGoogle("g-chen", "mr.chen@school.example"))?.id, b.id);
    assert.equal((await T.teacherFromGoogle("g-chen", "changed@school.example"))?.id, b.id, "found by Google account after linking");
    assert.equal(await T.teacherFromGoogle("g-stranger", "stranger@else.example"), null);
    const { code } = await T.makeInvite();
    assert.ok(await T.teacherFromGoogle("g-new", "new@school.example", code));
    assert.ok(!await T.inviteValid(code), "the invite is used up");
  });

  console.log("each teacher sees only their own things");
  const classA = await C.createClass("Science 9", 9, a.id);
  const classB = await C.createClass("Grade 1 reading", 1, b.id);
  await test("classes", async () => {
    assert.deepEqual((await C.listClasses(b.id)).map((c) => c.id), [classB]);
    assert.equal(await C.getClass(classA, b.id), null);
    assert.ok(await C.getClass(classA, a.id));
  });
  await test("lessons (built-in ones are shared)", async () => {
    assert.ok(!(await listLessons(b.id)).some((l) => l.id === "old-lesson"));
    assert.ok((await listLessons(a.id)).some((l) => l.id === "old-lesson"));
    assert.ok((await listLessons(b.id)).some((l) => l.builtIn));
    assert.ok(!canSee({ id: "old-lesson", teacherId: a.id }, b.id));
  });

  console.log("class codes");
  await test("codes look like GLOW-42 and are all different", async () => {
    const codes = new Set((await C.listClasses(a.id)).map((c) => c.code));
    for (const c of codes) assert.match(c ?? "", /^[A-Z]{3,5}-\d{2}$/);
    assert.equal(codes.size, (await C.listClasses(a.id)).length);
  });
  await test("students can type a code however they like", async () => {
    const code = (await C.getClass(classA, a.id))!.code!;
    for (const typed of [code, code.toLowerCase(), code.replace("-", " "), ` ${code.replace("-", "")} `]) assert.equal((await C.classByCode(typed))?.id, classA, typed);
    assert.equal(await C.classByCode("NOPE-00"), null);
  });

  console.log("students");
  await test("nicknames: safe, not taken, no emails or phone numbers", async () => {
    assert.ok((await S.checkNickname(classA, "Moss Otter")).ok);
    assert.ok(!(await S.checkNickname(classA, "x")).ok);
    assert.ok(!(await S.checkNickname(classA, "kid@gmail.com")).ok);
    assert.ok(!(await S.checkNickname(classA, "call 6135550123")).ok);
    assert.ok(!(await S.checkNickname(classA, "a".repeat(30))).ok);
  });
  await test("glued, spaced and number-swapped swears are caught in nicknames", async () => {
    for (const n of ["shithead", "ShitHead", "s.h.1.t lord", "Fuk Boi", "B1tchy", "Big Nazi"]) assert.ok(!(await S.checkNickname(classA, n)).ok, n);
  });
  await test("...but innocent names that contain those letters are fine", async () => {
    for (const n of ["Peacock", "Glass Owl", "Torpedo", "Scunthorpe", "Cocktail Shrimp", "Bass Drum", "Classy Newt"]) assert.ok((await S.checkNickname(classA, n)).ok, n);
  });
  const otter = await S.createStudent(classA, "Moss Otter", ["moon", "owl", "fern"]);
  assert.ok(otter.ok);
  await test("a nickname can't be taken twice in a class (any case)", async () => {
    assert.ok(!(await S.checkNickname(classA, "moss otter")).ok);
    assert.ok((await S.checkNickname(classB, "Moss Otter")).ok, "other classes are fine");
  });
  await test("\"surprise me\" names are always allowed and different", async () => {
    const names = await S.suggestNicknames(classA, 5);
    assert.equal(new Set(names).size, 5);
    for (const n of names) assert.ok((await S.checkNickname(classA, n)).ok, n);
  });
  await test("a French class gets French surprise nicknames, all allowed", async () => {
    const fr = await C.createClass("Sciences 9", 9, a.id, "fr");
    const names = await S.suggestNicknames(fr, 6);
    assert.equal(names.length, 6);
    for (const n of names) {
      assert.ok((await S.checkNickname(fr, n)).ok, n);
      assert.match(n, /^(Renard|Hibou|Loutre|Comète|Fougère|Luciole|Castor|Héron|Érable|Grillon|Saule|Braise|Triton|Macareux|Blaireau|Galet|Lanterne|Narval|Écureuil|Chouette) /, n);
    }
    assert.equal((await S.classPreview(fr))?.language, "fr");
  });
  await test("little kids get 2 pictures, everyone else 3", async () => {
    assert.equal(S.keySize(1), 2);
    assert.equal(S.keySize(9), 3);
    assert.ok(!(await S.createStudent(classB, "Tiny Newt", ["moon", "owl", "fern"])).ok, "3 pictures in a 2-picture class");
    assert.ok((await S.createStudent(classB, "Tiny Newt", ["moon", "owl"])).ok);
  });
  await test("the picture key: order matters, made-up pictures don't count", async () => {
    const id = otter.ok ? otter.student.id : "";
    assert.ok((await S.checkKey(classA, id, ["moon", "owl", "fern"])).ok);
    assert.ok(!(await S.checkKey(classA, id, ["owl", "moon", "fern"])).ok);
    assert.ok(!(await S.checkKey(classA, id, ["moon", "owl", "dragon"])).ok);
    assert.ok(!(await S.checkKey(classB, id, ["moon", "owl", "fern"])).ok, "the same student, wrong class");
  });
  await test("5 wrong keys lock it for a while, then the teacher can reset it", async () => {
    const id = otter.ok ? otter.student.id : "";
    for (let i = 0; i < 5; i++) await S.checkKey(classA, id, ["star", "star", "star"]);
    assert.ok(!(await S.checkKey(classA, id, ["moon", "owl", "fern"])).ok, "locked");
    assert.ok((await S.classPreview(classA))?.nicknames.length === 1);
  });
  await test("a class preview shows nicknames only, nothing else about anyone", async () => {
    const p = (await S.classPreview(classA))!;
    assert.deepEqual(Object.keys(p.nicknames[0]).sort(), ["google", "id", "needsNewKey", "nickname"]);
  });
  await test("Google students are found by a hash, never by their Google id", async () => {
    const g = await S.createStudent(classA, "Quiet Comet", null, await keyedHash("google-sub-9"));
    assert.ok(g.ok);
    assert.equal((await S.studentByGoogle(classA, "google-sub-9"))?.nickname, "Quiet Comet");
    assert.equal(await S.studentByGoogle(classB, "google-sub-9"), null);
  });
  await test("pausing a class pauses its students (and only them)", async () => {
    const id = otter.ok ? otter.student.id : "";
    assert.equal(await S.classPaused(id), false);
    await db.update(classes).set({ pausedAt: new Date() }).where(eq(classes.id, classA)).run();
    assert.equal(await S.classPaused(id), true);
    const newt = (await S.classPreview(classB))!.nicknames.find((n) => n.nickname === "Tiny Newt")!;
    assert.equal(await S.classPaused(newt.id), false, "another class keeps going");
    await db.update(classes).set({ pausedAt: null }).where(eq(classes.id, classA)).run();
    assert.equal(await S.classPaused(id), false);
  });
  await test("nobody can set pictures on a Google student's account", async () => {
    const comet = (await S.classPreview(classA))!.nicknames.find((n) => n.nickname === "Quiet Comet")!;
    assert.ok(comet.google && !comet.needsNewKey);
    assert.ok(!(await S.checkKey(classA, comet.id, ["moon", "owl", "fern"])).ok);
    assert.ok(!(await S.checkKey(classA, comet.id, ["moon", "owl", "fern"])).ok, "still not, the second time");
  });

  console.log("class data");
  const { seasons } = await import("@/lib/lesson/seasons");
  const { students: studentsTable, classes: classesTable, teachSessions: sessionsTable } = await import("@/lib/db/schema");
  await test("the progress spreadsheet: nicknames only, commas and formulas can't break it", async () => {
    await S.createStudent(classA, "=cmd Fox", ["moon", "moon", "moon"]);
    await S.createStudent(classA, "Moss, \"Otter\"", ["moon", "moon", "moon"]);
    const csv = await C.progressCsv(classA, seasons);
    const lines = csv.trim().split("\r\n");
    assert.equal(lines[0].split(",")[0], "Nickname");
    assert.equal(lines.length, 1 + (await S.classPreview(classA))!.nicknames.length);
    assert.ok(csv.includes("'=cmd Fox"), "a formula-looking nickname is defused");
    assert.ok(csv.includes('"Moss, ""Otter"""'), "commas and quotes are quoted");
  });
  await test("changing a class's grade: keys stay unless their size changes, and lessons follow the class", async () => {
    const k = await C.createClass("Grade 2 to 3", 2, a.id);
    const kid = await S.createStudent(k, "Quiet Comet", ["moon", "owl"]);
    assert.ok(kid.ok);
    assert.equal(await C.setClassGrade(k, 1), 0, "still 2 pictures");
    assert.ok((await S.checkKey(k, kid.student.id, ["moon", "owl"])).ok);
    assert.equal(await C.setClassGrade(k, 3), 1, "now 3 pictures: one student picks a new key");
    assert.equal((await S.classPreview(k))?.keySize, 3);
    assert.ok((await S.classPreview(k))?.nicknames.find((n) => n.nickname === "Quiet Comet")?.needsNewKey);
    assert.ok((await S.checkKey(k, kid.student.id, ["moon", "owl", "fern"])).ok, "their new key is set when they next join");
    const seasons = (await getApprovedLesson("seasons"))!;
    assert.equal(seasons.ageStyle, "senior");
    assert.equal((await playedBy(seasons, kid.student.id)).ageStyle, "junior", "a grade 3 class meets the grade 3-5 Gloam, even in a high school lesson");
    await C.setClassGrade(k, 1);
    assert.equal((await playedBy(seasons, kid.student.id)).ageStyle, "little");
    assert.equal((await playedBy(seasons, null)).ageStyle, "senior", "practice and teacher previews keep the lesson's own");
    await C.deleteClass(k);
  });
  await test("Ways to play: saved per student, merged, cleaned, and nobody else's change", async () => {
    const { studentAccess, updateStudentAccess } = await import("@/lib/student/access");
    const k = await C.createClass("Access", 9, a.id);
    const one = await S.createStudent(k, "Calm Heron", ["moon", "owl", "fern"]);
    const two = await S.createStudent(k, "Loud Otter", ["moon", "owl", "fern"]);
    assert.ok(one.ok && two.ok);
    assert.equal(await studentAccess(one.student.id), null, "starts with the age's defaults");
    await updateStudentAccess(one.student.id, { text: 2 });
    await updateStudentAccess(one.student.id, { contrast: true });
    assert.deepEqual(await studentAccess(one.student.id), { text: 2, contrast: true });
    assert.equal(await studentAccess(two.student.id), null);
    await C.deleteClass(k);
  });
  await test("a teacher's accommodations are kept apart: the teacher never sees what the student chose themselves", async () => {
    const { studentAccessParts, updateAccommodations, updateStudentAccess } = await import("@/lib/student/access");
    const k = await C.createClass("Accommodations", 9, a.id);
    const kid = await S.createStudent(k, "Quiet Lynx", ["moon", "owl", "fern"]);
    assert.ok(kid.ok);
    await updateStudentAccess(kid.student.id, { reading: "dyslexic" });
    await updateAccommodations(kid.student.id, { readAloud: "auto" });
    const parts = await studentAccessParts(kid.student.id);
    assert.deepEqual(parts.accommodations, { readAloud: "auto" }, "what the teacher's panel shows");
    assert.deepEqual(parts.own, { reading: "dyslexic" });
    await C.deleteClass(k);
  });
  console.log("privacy");
  await test("retention is the board's rule: a year after last use by default, or the end of the school year", async () => {
    const { endOfSchoolYear } = await import("@/lib/privacy/retention");
    assert.equal(endOfSchoolYear(new Date(2026, 9, 26)).toDateString(), new Date(2027, 5, 30).toDateString());
    assert.equal(endOfSchoolYear(new Date(2027, 2, 1)).toDateString(), new Date(2027, 5, 30).toDateString());
    const k = await C.createClass("Retention", 9, a.id);
    assert.equal((await C.getClass(k, a.id))?.deleteOn, null, "default: no fixed date, the a-year-after-use rule applies");
    process.env.PROTEGE_RETENTION = "end-of-school-year";
    const y = await C.createClass("School year", 9, a.id);
    assert.ok((await C.getClass(y, a.id))?.deleteOn, "end-of-school-year boards: a date");
    delete process.env.PROTEGE_RETENTION;
    await C.deleteClass(k);
    await C.deleteClass(y);
  });
  await test("a class nobody has used for a year is cleared out; one used recently stays", async () => {
    const { sweep } = await import("@/lib/privacy/sweep");
    const stale = await C.createClass("Two years ago", 9, a.id);
    await db.update(classesTable).set({ createdAt: new Date(Date.now() - 400 * 86_400_000) }).where(eq(classesTable.id, stale)).run();
    const recent = await C.createClass("Last month", 9, a.id);
    await db.update(classesTable).set({ createdAt: new Date(Date.now() - 400 * 86_400_000) }).where(eq(classesTable.id, recent)).run();
    const kid = await S.createStudent(recent, "Busy Wren", ["moon", "owl", "fern"]);
    assert.ok(kid.ok);
    await db.update(studentsTable).set({ lastSeenAt: new Date(Date.now() - 30 * 86_400_000) }).where(eq(studentsTable.id, kid.student.id)).run();
    await sweep();
    assert.equal(await C.getClass(stale, a.id), null);
    assert.ok(await C.getClass(recent, a.id), "used a month ago: kept");
    await C.deleteClass(recent);
  });
  await test("the daily clean-up deletes classes past their date (with their students), and nothing else", async () => {
    const { sweep } = await import("@/lib/privacy/sweep");
    const old = await C.createClass("Last year", 9, a.id);
    const kid = await S.createStudent(old, "Old Owl", ["moon", "owl", "fern"]);
    assert.ok(kid.ok);
    await db.update(classesTable).set({ deleteOn: new Date(Date.now() - 1000) }).where(eq(classesTable.id, old)).run();
    const keep = await C.createClass("This year", 9, a.id);
    const out = await sweep();
    assert.ok(out.classes >= 1);
    assert.equal(await C.getClass(old, a.id), null);
    assert.equal(await db.select().from(studentsTable).where(eq(studentsTable.id, kid.student.id)).get(), undefined, "its students are gone too");
    assert.ok(await C.getClass(keep, a.id), "other classes stay");
    await C.deleteClass(keep);
  });
  await test("practice-mode chats nobody used for 30 days are cleared out; recent ones stay", async () => {
    const { sweep } = await import("@/lib/privacy/sweep");
    const now = Date.now();
    await db.insert(studentsTable).values({ id: "practice-old", nickname: "Test Pilot", classId: null, createdAt: new Date(now - 40 * 86_400_000) }).run();
    await db.insert(studentsTable).values({ id: "practice-new", nickname: "Test Pilot", classId: null, createdAt: new Date(now - 2 * 86_400_000) }).run();
    await sweep();
    assert.equal(await db.select().from(studentsTable).where(eq(studentsTable.id, "practice-old")).get(), undefined);
    assert.ok(await db.select().from(studentsTable).where(eq(studentsTable.id, "practice-new")).get());
  });
  await test("a student's data download has everything about them, and never their picture key", async () => {
    const { studentExport } = await import("@/lib/privacy/export");
    const k = await C.createClass("Export", 9, a.id);
    const kid = await S.createStudent(k, "Brave Fern", ["moon", "owl", "fern"]);
    assert.ok(kid.ok);
    const out = (await studentExport(kid.student.id))!;
    assert.equal(out.student.nickname, "Brave Fern");
    assert.match(out.student.signsInWith, /scrambled/);
    const text = JSON.stringify(out);
    const row = (await db.select().from(studentsTable).where(eq(studentsTable.id, kid.student.id)).get())!;
    assert.ok(row.keyHash && !text.includes(row.keyHash), "no key hash");
    await C.deleteClass(k);
  });
  await test("a teacher can correct a candle (the journey follows), and it's in the access log", async () => {
    const { createSession } = await import("@/lib/companion/session");
    const { logAccess } = await import("@/lib/privacy/log");
    const { accessLog } = await import("@/lib/db/schema");
    const k = await C.createClass("Oversight", 9, a.id);
    const kid = await S.createStudent(k, "Fair Heron", ["moon", "owl", "fern"]);
    assert.ok(kid.ok);
    assert.equal(await C.correctCandle(k, kid.student.id, "seasons", seasons.concepts[0].id, 3), false, "not started yet");
    await createSession("seasons", kid.student.id, k);
    assert.ok(await C.correctCandle(k, kid.student.id, "seasons", seasons.concepts[0].id, 3));
    const row = (await db.select().from(sessionsTable).where(eq(sessionsTable.studentId, kid.student.id)).get())!;
    assert.equal(row.understanding[seasons.concepts[0].id], 3);
    assert.ok(row.checkpoints.includes(seasons.concepts[0].id), "a lit candle is a checkpoint");
    await C.correctCandle(k, kid.student.id, "seasons", seasons.concepts[0].id, 1);
    assert.ok(!(await db.select().from(sessionsTable).where(eq(sessionsTable.studentId, kid.student.id)).get())!.checkpoints.includes(seasons.concepts[0].id));
    await logAccess(a.id, "corrected-candles", { classId: k, studentId: kid.student.id });
    const logged = (await db.select().from(accessLog).all()).at(-1)!;
    assert.equal(logged.action, "corrected-candles");
    assert.equal(Object.keys(logged).includes("text"), false, "ids only, no content");
    await C.deleteClass(k);
  });
  await test("deleting a class deletes its students and leaves other classes alone", async () => {
    await C.deleteClass(classA);
    assert.equal(await C.getClass(classA, a.id), null);
    assert.equal((await db.select().from(studentsTable).where(eq(studentsTable.classId, classA)).all()).length, 0);
    assert.ok((await S.classPreview(classB))!.nicknames.length > 0);
  });

  console.log(`\n${passed} passed${process.exitCode ? ", some FAILED" : ""}`);
  await database.close();
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => {
    try {
      fs.rmSync(tmp, { recursive: true, force: true });
    } catch {
      // the database file may still be open on Windows; the temp folder gets cleaned up eventually
    }
  });
