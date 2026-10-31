import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { styleForGrade } from "@/lib/age-styles";
import { levelFor, type GloamLevel } from "@/lib/companion/level";
import { db } from "@/lib/db/client";
import { classLessons, classes, gloams, students, teachSessions } from "@/lib/db/schema";
import type { AccessPatch } from "@/lib/access/settings";
import { TRICKS, type TrickName } from "@/lib/gloam-rig/brain";
import { classLessonList } from "@/lib/teacher/classes";
import { getApprovedLesson } from "@/lib/teacher/lessons";
import { studentAccessParts } from "./access";

export interface StudentHome {
  nickname: string;
  className: string;
  ageStyle: string;
  language: "en" | "fr";
  metGloam: boolean;
  paused: boolean;
  gloam: GloamLevel & { tricks: TrickName[]; lessonsFinished: number };
  lessons: { id: string; title: string; ideas: number; lit: number; finished: boolean; started: boolean }[];
  /** their Ways to play: their own choices and their teacher's accommodations (null: none) */
  access: { own: AccessPatch | null; accommodations: AccessPatch | null };
  /** every idea this student has taught Gloam, newest lesson first (Gloam's journal across the year) */
  journal: { lesson: string; ideas: { name: string; recap: string }[] }[];
}

/** Everything on a student's home page ("your Gloam") */
export async function studentHome(studentId: string): Promise<StudentHome | null> {
  const s = await db.select().from(students).where(eq(students.id, studentId)).get();
  if (!s?.classId) return null;
  const c = await db.select().from(classes).where(eq(classes.id, s.classId)).get();
  if (!c) return null;
  const g = await db.select().from(gloams).where(eq(gloams.studentId, studentId)).get();
  const level = levelFor(g?.light ?? 0);
  // in the order the teacher set (a unit's lessons in order)
  const assigned = await classLessonList(c.id);
  const sessions = await db.select().from(teachSessions).where(eq(teachSessions.studentId, studentId)).orderBy(desc(teachSessions.updatedAt)).all();

  const ids = [...new Set([...assigned.map((a) => a.id), ...sessions.map((x) => x.lessonId)])];
  const found = new Map(await Promise.all(ids.map(async (id) => [id, await getApprovedLesson(id)] as const)));

  const lessons = assigned.flatMap((a) => {
    const lesson = found.get(a.id);
    if (!lesson) return [];
    const mine = sessions.find((x) => x.lessonId === a.id);
    const u = mine?.understanding ?? {};
    return [{ id: lesson.id, title: lesson.title, ideas: lesson.concepts.length, lit: lesson.concepts.filter((x) => u[x.id] === 3).length, finished: !!mine?.finishedAt, started: !!mine }];
  });

  const journal = sessions.flatMap((x) => {
    const lesson = found.get(x.lessonId);
    if (!lesson) return [];
    const ideas = lesson.concepts.filter((cc) => x.understanding[cc.id] === 3).map((cc) => ({ name: cc.name, recap: cc.recap }));
    return ideas.length ? [{ lesson: lesson.title, ideas }] : [];
  });

  return {
    nickname: s.nickname,
    className: c.name,
    ageStyle: styleForGrade(c.grade).id,
    language: c.language === "fr" ? "fr" : "en",
    metGloam: !!s.metGloamAt,
    paused: !!c.pausedAt,
    gloam: { ...level, tricks: TRICKS.filter((t) => level.level >= t.level).map((t) => t.name), lessonsFinished: g?.lessons ?? 0 },
    lessons,
    journal,
    access: await studentAccessParts(studentId),
  };
}

/** Is this lesson one the student's class was given? */
export async function lessonAssigned(studentId: string, lessonId: string): Promise<boolean> {
  const s = await db.select({ classId: students.classId }).from(students).where(eq(students.id, studentId)).get();
  if (!s?.classId) return false;
  return !!await db.select().from(classLessons).where(and(eq(classLessons.classId, s.classId), eq(classLessons.lessonId, lessonId))).get();
}
