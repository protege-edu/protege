import "server-only";
import { randomUUID } from "node:crypto";
import { asc, count, eq, inArray } from "drizzle-orm";
import { randomCode } from "@/lib/auth/crypto";
import { db } from "@/lib/db/client";
import { classes, lessons, schools, teachers, units } from "@/lib/db/schema";
import { deleteClass } from "./classes";
import { deleteLesson } from "./lessons";

/**
 * Schools, and how a teacher proves they work at one: the school's STAFF CODE.
 *   - The owner (whoever runs this Protégé) adds a school and gives its staff code to the school.
 *   - A new teacher signs up with it, and is part of that school.
 *   - If a student ever gets the code: any teacher there sees who signed up, removes anyone who isn't a
 *     teacher, and makes a new code (the old one stops working at once; real teachers keep their accounts).
 * A code is 12 letters and numbers (no look-alikes): far too many to guess, and wrong tries are slowed down.
 * Teachers only ever see their own classes, so even a student who got in sees nothing of anyone else's.
 */
export type SchoolRow = typeof schools.$inferSelect;

const newCode = () => randomCode(3, 4);
const tidy = (code: string) => code.trim().toUpperCase().replace(/\s+/g, "");

export async function createSchool(name: string): Promise<SchoolRow> {
  const row = { id: randomUUID(), name: name.trim().slice(0, 120), staffCode: newCode(), createdAt: new Date() };
  await db.insert(schools).values(row).run();
  return row;
}

export async function schoolByStaffCode(code: string | undefined): Promise<SchoolRow | null> {
  if (!code?.trim()) return null;
  return (await db.select().from(schools).where(eq(schools.staffCode, tidy(code))).get()) ?? null;
}

/** A new staff code for the school: the old one stops working straight away */
export async function newStaffCode(schoolId: string): Promise<string> {
  const staffCode = newCode();
  await db.update(schools).set({ staffCode }).where(eq(schools.id, schoolId)).run();
  return staffCode;
}

/** A teacher's school, its staff code, and who's signed up there (for the "Your school" panel) */
export async function schoolFor(schoolId: string | null) {
  if (!schoolId) return null;
  const school = await db.select().from(schools).where(eq(schools.id, schoolId)).get();
  if (!school) return null;
  const staff = await db
    .select({ id: teachers.id, name: teachers.name, email: teachers.email, owner: teachers.owner, createdAt: teachers.createdAt })
    .from(teachers)
    .where(eq(teachers.schoolId, schoolId))
    .orderBy(asc(teachers.createdAt))
    .all();
  return { ...school, staff };
}

/** Every school, for the owner: how many teachers and classes each has */
export async function listSchools() {
  const all = await db.select().from(schools).orderBy(asc(schools.createdAt)).all();
  const staff = await db.select({ schoolId: teachers.schoolId, n: count() }).from(teachers).groupBy(teachers.schoolId).all();
  const taught = await db.select({ schoolId: teachers.schoolId, n: count() }).from(classes).innerJoin(teachers, eq(teachers.id, classes.teacherId)).groupBy(teachers.schoolId).all();
  const of = (list: { schoolId: string | null; n: number }[], id: string) => list.find((x) => x.schoolId === id)?.n ?? 0;
  return all.map((s) => ({ ...s, teachers: of(staff, s.id), classes: of(taught, s.id) }));
}

/** The owner joins one of their schools (so they can teach there too) */
export async function joinSchool(teacherId: string, schoolId: string) {
  await db.update(teachers).set({ schoolId }).where(eq(teachers.id, teacherId)).run();
}

/**
 * Remove someone from a school, with everything they made (classes and their students, lessons, units).
 * What they did stays in the access log.
 * Only a teacher at the same school (or the owner) can, never themselves, and never the owner.
 */
export async function removeTeacher(by: { id: string; schoolId: string | null; owner: boolean }, teacherId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (teacherId === by.id) return { ok: false, error: "You can't remove yourself." };
  const t = await db.select().from(teachers).where(eq(teachers.id, teacherId)).get();
  if (!t || (!by.owner && (!by.schoolId || t.schoolId !== by.schoolId))) return { ok: false, error: "That person isn't at your school." };
  if (t.owner) return { ok: false, error: "The owner of this Protégé can't be removed." };
  for (const c of await db.select({ id: classes.id }).from(classes).where(eq(classes.teacherId, teacherId)).all()) await deleteClass(c.id);
  for (const l of await db.select({ id: lessons.id }).from(lessons).where(eq(lessons.teacherId, teacherId)).all()) await deleteLesson(l.id);
  const theirUnits = (await db.select({ id: units.id }).from(units).where(eq(units.teacherId, teacherId)).all()).map((u) => u.id);
  if (theirUnits.length) await db.delete(units).where(inArray(units.id, theirUnits)).run();
  // (their entries in the access log stay: that's how a board looks into what happened, for 2 years)
  await db.delete(teachers).where(eq(teachers.id, teacherId)).run();
  return { ok: true };
}
