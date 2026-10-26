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
process.env.PROTEGE_DATA_DIR = tmp;

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
  // imported after PROTEGE_DATA_DIR is set, so the database opens in the temp folder
  const { hash, verify, sign, signedEquals, randomCode, keyedHash } = await import("@/lib/auth/crypto");
  const { sameOrigin } = await import("@/lib/auth/request");
  const { db } = await import("@/lib/db/client");
  const { classes, lessons, teachers } = await import("@/lib/db/schema");
  const T = await import("@/lib/teacher/auth");
  const C = await import("@/lib/teacher/classes");
  const S = await import("@/lib/student/auth");
  const { canSee, listLessons } = await import("@/lib/teacher/lessons");
  const { eq } = await import("drizzle-orm");

  console.log("secrets");
  await test("passwords hash, and only the right one verifies", () => {
    const h = hash("correct horse");
    assert.ok(verify("correct horse", h));
    assert.ok(!verify("correct hors", h));
    assert.ok(!verify("x", null));
    assert.notEqual(hash("same"), hash("same"), "every hash gets its own salt");
  });
  await test("signed values can't be changed without the signature breaking", () => {
    assert.ok(signedEquals("teacher:abc", sign("teacher:abc")));
    assert.ok(!signedEquals("teacher:abd", sign("teacher:abc")));
  });
  await test("codes use no look-alike letters (no 0/O, 1/I/L)", () => {
    for (let i = 0; i < 200; i++) assert.match(randomCode(3, 4), /^[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/);
  });
  await test("keyed hashes are stable and never the plain value", () => {
    assert.equal(keyedHash("google-123"), keyedHash("google-123"));
    assert.ok(!keyedHash("google-123").includes("google-123"));
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
  db.insert(classes).values({ id: "old-class", name: "Old class", grade: 9, createdAt: new Date() }).run();
  db.insert(lessons).values({ id: "old-lesson", title: "Old lesson", grade: 9, status: "draft", createdAt: new Date(), updatedAt: new Date() }).run();

  await test("with no teachers yet, the first account needs the setup code", () => {
    assert.equal(T.signUpGate(), "setup");
    assert.ok(fs.existsSync(path.join(tmp, "SETUP-CODE.txt")), "saved next to the database");
    assert.ok(!T.signUp({ email: "sneaky@else.example", password: "sneaky-pass", name: "Sneaky" }).ok, "no code");
    assert.ok(!T.signUp({ email: "sneaky@else.example", password: "sneaky-pass", name: "Sneaky", code: "ABCD-EFGH" }).ok, "wrong code");
    assert.equal(T.teacherFromGoogle("g-sneaky", "sneaky@else.example", "ABCD-EFGH"), null, "not with Google either");
  });
  const setup = T.setupCode();
  const first = T.signUp({ email: "  Ms.Rivera@School.example ", password: "lanterns-are-cool", name: "Ms Rivera", code: setup.toLowerCase() });
  assert.ok(first.ok);
  const a = first.teacher;
  await test("the first teacher takes over what was made before accounts", () => {
    assert.equal(db.select().from(classes).where(eq(classes.id, "old-class")).get()?.teacherId, a.id);
    assert.equal(db.select().from(lessons).where(eq(lessons.id, "old-lesson")).get()?.teacherId, a.id);
  });
  await test("emails are matched without caring about case or spaces", () => {
    assert.equal(a.email, "ms.rivera@school.example");
    assert.ok(T.signIn("MS.RIVERA@school.example", "lanterns-are-cool").ok);
  });
  await test("the same email can't make two accounts", () => assert.ok(!T.signUp({ email: "ms.rivera@school.example", password: "whatever123", name: "X" }).ok));
  await test("after that, the setup code is gone and other teachers need an invite", () => {
    assert.equal(T.signUpGate(), "invite");
    assert.ok(!fs.existsSync(path.join(tmp, "SETUP-CODE.txt")));
    assert.ok(!T.signUp({ email: "late@school.example", password: "late-pass-1", name: "Late", code: setup }).ok, "the setup code no longer works");
  });

  await test("an invite makes one account, then it's used up", () => {
    const { code } = T.makeInvite();
    assert.ok(T.signUp({ email: "ms.ng@school.example", password: "invited-pass", name: "Ms Ng", code }).ok);
    assert.ok(!T.signUp({ email: "mr.ng@school.example", password: "invited-pass", name: "Mr Ng", code }).ok);
  });
  await test("invites work once, then never again", () => {
    const { code } = T.makeInvite();
    assert.ok(T.inviteValid(code));
    assert.ok(T.inviteValid(code.toLowerCase()), "typed in lowercase is fine");
    T.spendInvite(code);
    assert.ok(!T.inviteValid(code));
    assert.ok(!T.inviteValid("NOPE-NOPE"));
    assert.ok(!T.inviteValid(""));
  });

  await test("5 wrong passwords lock the account, even against the right one", () => {
    for (let i = 0; i < 5; i++) assert.ok(!T.signIn(a.email, "wrong-password").ok);
    const r = T.signIn(a.email, "lanterns-are-cool");
    assert.ok(!r.ok && /Too many/.test(r.error));
  });
  await test("wrong-password errors never say whether the email exists", () => {
    const unknown = T.signIn("nobody@school.example", "x");
    db.update(teachers).set({ lockedUntil: null }).where(eq(teachers.id, a.id)).run();
    const known = T.signIn(a.email, "nope");
    assert.ok(!unknown.ok && !known.ok);
    assert.equal(unknown.error, known.error);
  });
  await test("a recovery code resets the password once, and gives a new code", () => {
    db.update(teachers).set({ lockedUntil: null, failedLogins: 0 }).where(eq(teachers.id, a.id)).run();
    const r = T.recover(a.email, first.recoveryCode.toLowerCase(), "new-password-1");
    assert.ok(r.ok);
    assert.ok(T.signIn(a.email, "new-password-1").ok);
    assert.ok(!T.recover(a.email, first.recoveryCode, "again-password").ok, "the old code is used up");
    assert.ok(T.recover(a.email, r.recoveryCode, "newer-password").ok, "the new one works");
  });

  await test("lost everything: a reset from the laptop gives a working recovery code", () => {
    const code = T.resetFromLaptop("MS.RIVERA@school.example");
    assert.ok(code);
    assert.ok(T.recover(a.email, code!, "back-in-again").ok);
    assert.equal(T.resetFromLaptop("nobody@school.example"), null);
  });

  const second = T.signUp({ email: "mr.chen@school.example", password: "photosynthesis", name: "Mr Chen", code: T.makeInvite().code });
  assert.ok(second.ok);
  const b = second.teacher;

  await test("Google: a known email links; a stranger without an invite gets nothing", () => {
    assert.equal(T.teacherFromGoogle("g-chen", "mr.chen@school.example")?.id, b.id);
    assert.equal(T.teacherFromGoogle("g-chen", "changed@school.example")?.id, b.id, "found by Google account after linking");
    assert.equal(T.teacherFromGoogle("g-stranger", "stranger@else.example"), null);
    const { code } = T.makeInvite();
    assert.ok(T.teacherFromGoogle("g-new", "new@school.example", code));
    assert.ok(!T.inviteValid(code), "the invite is used up");
  });

  console.log("each teacher sees only their own things");
  const classA = C.createClass("Science 9", 9, a.id);
  const classB = C.createClass("Grade 1 reading", 1, b.id);
  await test("classes", () => {
    assert.deepEqual(C.listClasses(b.id).map((c) => c.id), [classB]);
    assert.equal(C.getClass(classA, b.id), null);
    assert.ok(C.getClass(classA, a.id));
  });
  await test("lessons (built-in ones are shared)", () => {
    assert.ok(!listLessons(b.id).some((l) => l.id === "old-lesson"));
    assert.ok(listLessons(a.id).some((l) => l.id === "old-lesson"));
    assert.ok(listLessons(b.id).some((l) => l.builtIn));
    assert.ok(!canSee({ id: "old-lesson", teacherId: a.id }, b.id));
  });

  console.log("class codes");
  await test("codes look like GLOW-42 and are all different", () => {
    const codes = new Set(C.listClasses(a.id).map((c) => c.code));
    for (const c of codes) assert.match(c ?? "", /^[A-Z]{3,5}-\d{2}$/);
    assert.equal(codes.size, C.listClasses(a.id).length);
  });
  await test("students can type a code however they like", () => {
    const code = C.getClass(classA, a.id)!.code!;
    for (const typed of [code, code.toLowerCase(), code.replace("-", " "), ` ${code.replace("-", "")} `]) assert.equal(C.classByCode(typed)?.id, classA, typed);
    assert.equal(C.classByCode("NOPE-00"), null);
  });

  console.log("students");
  await test("nicknames: safe, not taken, no emails or phone numbers", () => {
    assert.ok(S.checkNickname(classA, "Moss Otter").ok);
    assert.ok(!S.checkNickname(classA, "x").ok);
    assert.ok(!S.checkNickname(classA, "kid@gmail.com").ok);
    assert.ok(!S.checkNickname(classA, "call 6135550123").ok);
    assert.ok(!S.checkNickname(classA, "a".repeat(30)).ok);
  });
  await test("glued, spaced and number-swapped swears are caught in nicknames", () => {
    for (const n of ["shithead", "ShitHead", "s.h.1.t lord", "Fuk Boi", "B1tchy", "Big Nazi"]) assert.ok(!S.checkNickname(classA, n).ok, n);
  });
  await test("...but innocent names that contain those letters are fine", () => {
    for (const n of ["Peacock", "Glass Owl", "Torpedo", "Scunthorpe", "Cocktail Shrimp", "Bass Drum", "Classy Newt"]) assert.ok(S.checkNickname(classA, n).ok, n);
  });
  const otter = S.createStudent(classA, "Moss Otter", ["moon", "owl", "fern"]);
  assert.ok(otter.ok);
  await test("a nickname can't be taken twice in a class (any case)", () => {
    assert.ok(!S.checkNickname(classA, "moss otter").ok);
    assert.ok(S.checkNickname(classB, "Moss Otter").ok, "other classes are fine");
  });
  await test("\"surprise me\" names are always allowed and different", () => {
    const names = S.suggestNicknames(classA, 5);
    assert.equal(new Set(names).size, 5);
    for (const n of names) assert.ok(S.checkNickname(classA, n).ok, n);
  });
  await test("a French class gets French surprise nicknames, all allowed", () => {
    const fr = C.createClass("Sciences 9", 9, a.id, "fr");
    const names = S.suggestNicknames(fr, 6);
    assert.equal(names.length, 6);
    for (const n of names) {
      assert.ok(S.checkNickname(fr, n).ok, n);
      assert.match(n, /^(Renard|Hibou|Loutre|Comète|Fougère|Luciole|Castor|Héron|Érable|Grillon|Saule|Braise|Triton|Macareux|Blaireau|Galet|Lanterne|Narval|Écureuil|Chouette) /, n);
    }
    assert.equal(S.classPreview(fr)?.language, "fr");
  });
  await test("little kids get 2 pictures, everyone else 3", () => {
    assert.equal(S.keySize(1), 2);
    assert.equal(S.keySize(9), 3);
    assert.ok(!S.createStudent(classB, "Tiny Newt", ["moon", "owl", "fern"]).ok, "3 pictures in a 2-picture class");
    assert.ok(S.createStudent(classB, "Tiny Newt", ["moon", "owl"]).ok);
  });
  await test("the picture key: order matters, made-up pictures don't count", () => {
    const id = otter.ok ? otter.student.id : "";
    assert.ok(S.checkKey(classA, id, ["moon", "owl", "fern"]).ok);
    assert.ok(!S.checkKey(classA, id, ["owl", "moon", "fern"]).ok);
    assert.ok(!S.checkKey(classA, id, ["moon", "owl", "dragon"]).ok);
    assert.ok(!S.checkKey(classB, id, ["moon", "owl", "fern"]).ok, "the same student, wrong class");
  });
  await test("5 wrong keys lock it for a while, then the teacher can reset it", () => {
    const id = otter.ok ? otter.student.id : "";
    for (let i = 0; i < 5; i++) S.checkKey(classA, id, ["star", "star", "star"]);
    assert.ok(!S.checkKey(classA, id, ["moon", "owl", "fern"]).ok, "locked");
    assert.ok(S.classPreview(classA)?.nicknames.length === 1);
  });
  await test("a class preview shows nicknames only, nothing else about anyone", () => {
    const p = S.classPreview(classA)!;
    assert.deepEqual(Object.keys(p.nicknames[0]).sort(), ["google", "id", "needsNewKey", "nickname"]);
  });
  await test("Google students are found by a hash, never by their Google id", () => {
    const g = S.createStudent(classA, "Quiet Comet", null, keyedHash("google-sub-9"));
    assert.ok(g.ok);
    assert.equal(S.studentByGoogle(classA, "google-sub-9")?.nickname, "Quiet Comet");
    assert.equal(S.studentByGoogle(classB, "google-sub-9"), null);
  });
  await test("pausing a class pauses its students (and only them)", () => {
    const id = otter.ok ? otter.student.id : "";
    assert.equal(S.classPaused(id), false);
    db.update(classes).set({ pausedAt: new Date() }).where(eq(classes.id, classA)).run();
    assert.equal(S.classPaused(id), true);
    const newt = S.classPreview(classB)!.nicknames.find((n) => n.nickname === "Tiny Newt")!;
    assert.equal(S.classPaused(newt.id), false, "another class keeps going");
    db.update(classes).set({ pausedAt: null }).where(eq(classes.id, classA)).run();
    assert.equal(S.classPaused(id), false);
  });
  await test("nobody can set pictures on a Google student's account", () => {
    const comet = S.classPreview(classA)!.nicknames.find((n) => n.nickname === "Quiet Comet")!;
    assert.ok(comet.google && !comet.needsNewKey);
    assert.ok(!S.checkKey(classA, comet.id, ["moon", "owl", "fern"]).ok);
    assert.ok(!S.checkKey(classA, comet.id, ["moon", "owl", "fern"]).ok, "still not, the second time");
  });

  console.log("class data");
  const { seasons } = await import("@/lib/lesson/seasons");
  const { students: studentsTable } = await import("@/lib/db/schema");
  await test("the progress spreadsheet: nicknames only, commas and formulas can't break it", () => {
    S.createStudent(classA, "=cmd Fox", ["moon", "moon", "moon"]);
    S.createStudent(classA, "Moss, \"Otter\"", ["moon", "moon", "moon"]);
    const csv = C.progressCsv(classA, seasons);
    const lines = csv.trim().split("\r\n");
    assert.equal(lines[0].split(",")[0], "Nickname");
    assert.equal(lines.length, 1 + S.classPreview(classA)!.nicknames.length);
    assert.ok(csv.includes("'=cmd Fox"), "a formula-looking nickname is defused");
    assert.ok(csv.includes('"Moss, ""Otter"""'), "commas and quotes are quoted");
  });
  await test("deleting a class deletes its students and leaves other classes alone", () => {
    C.deleteClass(classA);
    assert.equal(C.getClass(classA, a.id), null);
    assert.equal(db.select().from(studentsTable).where(eq(studentsTable.classId, classA)).all().length, 0);
    assert.ok(S.classPreview(classB)!.nicknames.length > 0);
  });

  console.log(`\n${passed} passed${process.exitCode ? ", some FAILED" : ""}`);
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
