import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { classLessons, classes, students } from "@/lib/db/schema";
import { googleEnabled } from "@/lib/auth/google";
import { studentAddress } from "@/lib/hosting/address";
import { queueStats } from "@/lib/ai/queue";
import { bad, notYours, requireTeacher } from "@/lib/teacher/api";
import { assignLesson, dashboard, deleteClass, getClass, setClassGrade } from "@/lib/teacher/classes";
import { canSee, getApprovedLesson, getLessonRow } from "@/lib/teacher/lessons";

/** The live dashboard for one class and one lesson: ?lesson=<id> (no lesson: just the class) */
export async function GET(request: Request, ctx: RouteContext<"/api/teacher/classes/[id]">) {
  const me = await requireTeacher(request);
  if (me instanceof Response) return me;
  const { id } = await ctx.params;
  const cls = getClass(id, me.id);
  if (!cls) return notYours();
  const lessonId = new URL(request.url).searchParams.get("lesson");
  // the class itself: its lessons (newest first), its code and where students go
  if (!lessonId) {
    const lessons = db
      .select({ id: classLessons.lessonId })
      .from(classLessons)
      .where(eq(classLessons.classId, id))
      .orderBy(desc(classLessons.assignedAt))
      .all()
      .flatMap(({ id: lid }) => {
        const l = getApprovedLesson(lid);
        return l ? [{ id: l.id, title: l.title }] : [];
      });
    // who's in the class, in the order they joined (the code screen shows them arriving)
    const roster = db
      .select({ id: students.id, nickname: students.nickname, google: students.googleIdHash, key: students.keyHash })
      .from(students)
      .where(eq(students.classId, id))
      .orderBy(students.createdAt)
      .all()
      .map((r) => ({ id: r.id, nickname: r.nickname, google: !!r.google, hasKey: !!r.key }));
    return Response.json({ class: cls, lessons, roster, google: googleEnabled(), address: studentAddress(request) });
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
  z.object({ googleSignIn: z.boolean() }),
  z.object({ paused: z.boolean() }),
  z.object({ name: z.string().trim().min(1).max(60) }),
  z.object({ language: z.enum(["en", "fr"]) }),
  z.object({ grade: z.number().int().min(0).max(12) }),
]);

/** Give a class an approved lesson, or change a class setting (Google sign-in, pause, name, language, grade) */
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
  } else if ("googleSignIn" in c) {
    db.update(classes).set({ googleSignIn: c.googleSignIn }).where(eq(classes.id, id)).run();
  } else if ("paused" in c) {
    db.update(classes).set({ pausedAt: c.paused ? new Date() : null }).where(eq(classes.id, id)).run();
  } else if ("language" in c) {
    db.update(classes).set({ language: c.language }).where(eq(classes.id, id)).run();
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
  return Response.json({ ok: true });
}
