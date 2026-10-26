import "server-only";
import { db } from "@/lib/db/client";
import { accessLog } from "@/lib/db/schema";

/** What a teacher did with a student's information (the access log: ids and the kind of action, never content) */
export type LoggedAction =
  | "viewed-conversation"
  | "downloaded-student-data"
  | "changed-nickname"
  | "set-ways-to-play"
  | "corrected-candles"
  | "reset-pictures"
  | "removed-student"
  | "deleted-class"
  | "downloaded-class-progress";

export function logAccess(teacherId: string, action: LoggedAction, ids: { classId?: string; studentId?: string } = {}) {
  db.insert(accessLog).values({ at: new Date(), teacherId, action, classId: ids.classId ?? null, studentId: ids.studentId ?? null }).run();
}
