import "server-only";
import { eq } from "drizzle-orm";
import { type AccessPatch, cleanAccess } from "@/lib/access/settings";
import { db } from "@/lib/db/client";
import { students } from "@/lib/db/schema";

/** A student's Ways to play: what they (or their teacher) changed, or null for their age's defaults */
export function studentAccess(studentId: string): AccessPatch | null {
  const s = db.select({ access: students.access }).from(students).where(eq(students.id, studentId)).get();
  return s?.access ? cleanAccess(s.access) : null;
}

/** Change some of a student's Ways to play (the rest stay as they were) */
export function updateStudentAccess(studentId: string, patch: AccessPatch): AccessPatch {
  const next = cleanAccess({ ...(studentAccess(studentId) ?? {}), ...patch });
  db.update(students).set({ access: next }).where(eq(students.id, studentId)).run();
  return next;
}
