import "server-only";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { safetyAlerts, students } from "@/lib/db/schema";

/**
 * A student's message tripped the safety check (danger, abuse, bullying, or self/other harm). Record it so the
 * teacher is told right away. Never throws — a failure here must not stop the student from getting Gloam's reply.
 */
export async function recordConcern(classId: string, studentId: string, sessionId: string | null, message: string) {
  try {
    await db.insert(safetyAlerts).values({ classId, studentId, sessionId, message: message.slice(0, 1000), createdAt: new Date() }).run();
  } catch {
    // logging must never break the turn
  }
}

export interface SafetyAlert {
  id: number;
  nickname: string;
  message: string;
  at: string;
}

/** The class's alerts that still need a teacher's attention (newest first), with the student's nickname */
export async function openAlerts(classId: string): Promise<SafetyAlert[]> {
  const rows = await db
    .select({ id: safetyAlerts.id, nickname: students.nickname, message: safetyAlerts.message, at: safetyAlerts.createdAt })
    .from(safetyAlerts)
    .innerJoin(students, eq(students.id, safetyAlerts.studentId))
    .where(and(eq(safetyAlerts.classId, classId), isNull(safetyAlerts.acknowledgedAt)))
    .orderBy(desc(safetyAlerts.id))
    .all();
  return rows.map((r) => ({ id: r.id, nickname: r.nickname, message: r.message, at: r.at.toISOString() }));
}

/** A teacher marks an alert seen (it stays in the data for the record, just off the "needs attention" list) */
export async function acknowledgeAlert(classId: string, alertId: number) {
  await db
    .update(safetyAlerts)
    .set({ acknowledgedAt: new Date() })
    .where(and(eq(safetyAlerts.id, alertId), eq(safetyAlerts.classId, classId)))
    .run();
}
