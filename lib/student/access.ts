import "server-only";
import { eq } from "drizzle-orm";
import { type AccessPatch, cleanAccess } from "@/lib/access/settings";
import { db } from "@/lib/db/client";
import { students } from "@/lib/db/schema";

/**
 * A student's Ways to play, in two parts:
 *   own:            what they chose themselves (only they, and a download of their own data, ever see it)
 *   accommodations: what their teacher switched on for them (the teacher sees only this part)
 * In force: their age's defaults, then the accommodations, then their own choices on top.
 */
export function studentAccessParts(studentId: string): { own: AccessPatch | null; accommodations: AccessPatch | null } {
  const s = db.select({ access: students.access, acc: students.accommodations }).from(students).where(eq(students.id, studentId)).get();
  return { own: s?.access ? cleanAccess(s.access) : null, accommodations: s?.acc ? cleanAccess(s.acc) : null };
}

/** What the student chose themselves, or null for none */
export const studentAccess = (studentId: string) => studentAccessParts(studentId).own;

/** The student changed some of their own Ways to play (the rest stay as they were) */
export function updateStudentAccess(studentId: string, patch: AccessPatch): AccessPatch {
  const next = cleanAccess({ ...(studentAccess(studentId) ?? {}), ...patch });
  db.update(students).set({ access: next }).where(eq(students.id, studentId)).run();
  return next;
}

/** Their teacher switched some Ways to play on or off for them (an accommodation) */
export function updateAccommodations(studentId: string, patch: AccessPatch): AccessPatch {
  const next = cleanAccess({ ...(studentAccessParts(studentId).accommodations ?? {}), ...patch });
  db.update(students).set({ accommodations: next }).where(eq(students.id, studentId)).run();
  return next;
}
