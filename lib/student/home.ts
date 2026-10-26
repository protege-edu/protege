import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { styleForGrade } from "@/lib/age-styles";
import { levelFor, type GloamLevel } from "@/lib/companion/level";
import { db } from "@/lib/db/client";
import { classLessons, classes, gloams, students, teachSessions } from "@/lib/db/schema";
import { TRICKS, type TrickName } from "@/lib/gloam-rig/brain";
import { getApprovedLesson } from "@/lib/teacher/lessons";

export interface StudentHome {
  nickname: string;
  className: string;
  ageStyle: string;
  metGloam: boolean;
  paused: boolean;
  gloam: GloamLevel & { tricks: TrickName[]; lessonsFinished: number };
  lessons: { id: string; title: string; ideas: number; lit: number; finished: boolean; started: boolean }[];
  /** every idea this student has taught Gloam, newest lesson first (Gloam's journal across the year) */
  journal: { lesson: string; ideas: { name: string; recap: string }[] }[];
}

/** Everything on a student's home page ("your Gloam") */
export function studentHome(studentId: string): StudentHome | null {
  const s = db.select().from(students).where(eq(students.id, studentId)).get();
  if (!s?.classId) return null;
  const c = db.select().from(classes).where(eq(classes.id, s.classId)).get();
  if (!c) return null;
  const g = db.select().from(gloams).where(eq(gloams.studentId, studentId)).get();
  const level = levelFor(g?.light ?? 0);
  const assigned = db.select().from(classLessons).where(eq(classLessons.classId, c.id)).orderBy(desc(classLessons.assignedAt)).all();
  const sessions = db.select().from(teachSessions).where(eq(teachSessions.studentId, studentId)).orderBy(desc(teachSessions.updatedAt)).all();

  const lessons = assigned.flatMap((a) => {
    const lesson = getApprovedLesson(a.lessonId);
    if (!lesson) return [];
    const mine = sessions.find((x) => x.lessonId === a.lessonId);
    const u = mine?.understanding ?? {};
    return [{ id: lesson.id, title: lesson.title, ideas: lesson.concepts.length, lit: lesson.concepts.filter((x) => u[x.id] === 3).length, finished: !!mine?.finishedAt, started: !!mine }];
  });

  const journal = sessions.flatMap((x) => {
    const lesson = getApprovedLesson(x.lessonId);
    if (!lesson) return [];
    const ideas = lesson.concepts.filter((cc) => x.understanding[cc.id] === 3).map((cc) => ({ name: cc.name, recap: cc.recap }));
    return ideas.length ? [{ lesson: lesson.title, ideas }] : [];
  });

  return {
    nickname: s.nickname,
    className: c.name,
    ageStyle: styleForGrade(c.grade).id,
    metGloam: !!s.metGloamAt,
    paused: !!c.pausedAt,
    gloam: { ...level, tricks: TRICKS.filter((t) => level.level >= t.level).map((t) => t.name), lessonsFinished: g?.lessons ?? 0 },
    lessons,
    journal,
  };
}

/** Is this lesson one the student's class was given? */
export function lessonAssigned(studentId: string, lessonId: string): boolean {
  const s = db.select({ classId: students.classId }).from(students).where(eq(students.id, studentId)).get();
  if (!s?.classId) return false;
  return !!db.select().from(classLessons).where(and(eq(classLessons.classId, s.classId), eq(classLessons.lessonId, lessonId))).get();
}
