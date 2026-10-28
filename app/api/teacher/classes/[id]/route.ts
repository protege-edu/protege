import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { classes, lessons as lessonRows, students } from "@/lib/db/schema";
import { googleEnabled } from "@/lib/auth/google";
import { logAccess } from "@/lib/privacy/log";
import { retentionRule } from "@/lib/privacy/retention";
import { studentAddress } from "@/lib/hosting/address";
import { queueStats } from "@/lib/ai/queue";
import { bad, notYours, requireTeacher } from "@/lib/teacher/api";
import { assignLesson, classLessonList, dashboard, deleteClass, getClass, moveLesson, setClassGrade, unassignLesson } from "@/lib/teacher/classes";
import { getUnit } from "@/lib/teacher/units";
import { canSee, getApprovedLesson, getLessonRow } from "@/lib/teacher/lessons";

/** The live dashboard for one class and one lesson: ?lesson=<id> (no lesson: just the class) */
export async function GET(request: Request, ctx: RouteContext<"/api/teacher/classes/[id]">) {
  const me = await requireTeacher(request);
  if (me instanceof Response) return me;
  const { id } = await ctx.params;
  const cls = getClass(id, me.id);
  if (!cls) return notYours();
  const lessonId = new URL(request.url).searchParams.get("lesson");
  // the class itself: its lessons (in the order students see them), its code and where students go
  if (!lessonId) {
    const lessons = classLessonList(id);
    // who's in the class, in the order they joined (the code screen shows them arriving)
    const roster = db
      .select({ id: students.id, nickname: students.nickname, google: students.googleIdHash, key: students.keyHash })
      .from(students)
      .where(eq(students.classId, id))
      .orderBy(students.createdAt)
      .all()
      .map((r) => ({ id: r.id, nickname: r.nickname, google: !!r.google, hasKey: !!r.key }));
    return Response.json({ class: cls, lessons, roster, google: googleEnabled(), address: studentAddress(request), retention: retentionRule() });
  }
  const row = getLessonRow(lessonId);
  const lesson = row && canSee(row, me.id) ? getApprovedLesson(lessonId) : null;
  if (!lesson) return bad("Pick an approved lesson to see the dashboard.", 404);
  return Response.json({
    line: queueStats(),
    class: cls,
    lesson: { id: lesson.id, title: lesson.title, concepts: lesson.concepts.map((c) => ({ id: c.id, name: c.name, misconception: c.misconception })) },
    ...dashboard(id, lesson),
  });
}

const Change = z.union([
  z.object({ lessonId: z.string() }),
  // every approved lesson of a unit, in the unit's order
  z.object({ unitId: z.string() }),
  z.object({ removeLessonId: z.string() }),
  z.object({ moveLessonId: z.string(), by: z.union([z.literal(-1), z.literal(1)]) }),
  z.object({ googleSignIn: z.boolean() }),
  z.object({ paused: z.boolean() }),
  z.object({ name: z.string().trim().min(1).max(60) }),
  z.object({ language: z.enum(["en", "fr"]) }),
  z.object({ grade: z.number().int().min(0).max(12) }),
  // when the class and its students' work are deleted by themselves (a time in ms), or null: only when the teacher deletes it
  z.object({ deleteOn: z.number().int().positive().nullable() }),
]);

/** Give a class an approved lesson (or a unit's), take one away or move it, or change a class setting */
export async function POST(request: Request, ctx: RouteContext<"/api/teacher/classes/[id]">) {
  const me = await requireTeacher(request);
  if (me instanceof Response) return me;
  const { id } = await ctx.params;
  if (!getClass(id, me.id)) return notYours();
  const body = Change.safeParse(await request.json().catch(() => null));
  if (!body.success) return bad("That change didn't make sense. Reload the page and try again.");
  const c = body.data;
  if ("lessonId" in c) {
    const row = getLessonRow(c.lessonId);
    if (!row || !canSee(row, me.id) || !getApprovedLesson(c.lessonId)) return bad("Only your approved lessons can be given to a class.");
    assignLesson(id, c.lessonId);
  } else if ("unitId" in c) {
    if (!getUnit(c.unitId, me.id)) return notYours();
    const ready = db
      .select({ id: lessonRows.id })
      .from(lessonRows)
      .where(and(eq(lessonRows.unitId, c.unitId), eq(lessonRows.status, "approved")))
      .orderBy(asc(lessonRows.position))
      .all();
    if (!ready.length) return bad("None of this unit's lessons are approved yet. Review and approve one first.");
    for (const r of ready) assignLesson(id, r.id);
    return Response.json({ ok: true, given: ready.length });
  } else if ("removeLessonId" in c) {
    unassignLesson(id, c.removeLessonId);
  } else if ("moveLessonId" in c) {
    moveLesson(id, c.moveLessonId, c.by);
  } else if ("googleSignIn" in c) {
    db.update(classes).set({ googleSignIn: c.googleSignIn }).where(eq(classes.id, id)).run();
  } else if ("paused" in c) {
    db.update(classes).set({ pausedAt: c.paused ? new Date() : null }).where(eq(classes.id, id)).run();
  } else if ("language" in c) {
    db.update(classes).set({ language: c.language }).where(eq(classes.id, id)).run();
  } else if ("deleteOn" in c) {
    const when = c.deleteOn === null ? null : new Date(c.deleteOn);
    if (when && (when.getTime() < Date.now() || when.getTime() > Date.now() + 3 * 366 * 86_400_000)) return bad("Pick a date between tomorrow and three years from now.");
    db.update(classes).set({ deleteOn: when }).where(eq(classes.id, id)).run();
  } else if ("grade" in c) {
    return Response.json({ ok: true, newKeys: setClassGrade(id, c.grade) });
  } else {
    db.update(classes).set({ name: c.name }).where(eq(classes.id, id)).run();
  }
  return Response.json({ ok: true });
}

/** Delete the class and everything in it (the page asks the teacher to type the class name first) */
export async function DELETE(request: Request, ctx: RouteContext<"/api/teacher/classes/[id]">) {
  const me = await requireTeacher(request);
  if (me instanceof Response) return me;
  const { id } = await ctx.params;
  if (!getClass(id, me.id)) return notYours();
  deleteClass(id);
  logAccess(me.id, "deleted-class", { classId: id });
  return Response.json({ ok: true });
}
