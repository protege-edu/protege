import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { AccessPatch, defaultAccess } from "@/lib/access/settings";
import { styleForGrade } from "@/lib/age-styles";
import { db } from "@/lib/db/client";
import { messages, students } from "@/lib/db/schema";
import { bad, notYours, requireTeacher } from "@/lib/teacher/api";
import { studentAccessParts, updateAccommodations } from "@/lib/student/access";
import { checkNickname } from "@/lib/student/auth";
import { correctCandle, getClass, removeStudent, studentSessionId } from "@/lib/teacher/classes";
import { logAccess } from "@/lib/privacy/log";

const inClass = (studentId: string, classId: string) => !!db.select({ id: students.id }).from(students).where(and(eq(students.id, studentId), eq(students.classId, classId))).get();

/** One student's conversation with Gloam (?lesson=<id>) and their Ways to play, for their own teacher */
export async function GET(request: Request, ctx: RouteContext<"/api/teacher/classes/[id]/students/[studentId]">) {
  const me = await requireTeacher(request);
  if (me instanceof Response) return me;
  const { id, studentId } = await ctx.params;
  const cls = getClass(id, me.id);
  if (!cls || !inClass(studentId, id)) return notYours();
  // only what the teacher set (an accommodation): never what the student chose for themselves
  const access = { ...defaultAccess(styleForGrade(cls.grade)), ...(studentAccessParts(studentId).accommodations ?? {}) };
  const lessonId = new URL(request.url).searchParams.get("lesson") ?? "";
  const sessionId = studentSessionId(id, studentId, lessonId);
  if (!sessionId) return Response.json({ messages: [], access });
  logAccess(me.id, "viewed-conversation", { classId: id, studentId });
  const rows = db.select({ from: messages.from, text: messages.text }).from(messages).where(eq(messages.sessionId, sessionId)).orderBy(asc(messages.id)).all();
  return Response.json({ messages: rows, access });
}

const Change = z.union([
  z.object({ resetKey: z.literal(true) }),
  z.object({ access: AccessPatch }),
  z.object({ nickname: z.string().max(40) }),
  // the teacher corrects a candle Gloam's AI judged wrong (human oversight: the teacher has the last word)
  z.object({ lessonId: z.string().max(100), conceptId: z.string().max(100), level: z.number().int().min(0).max(3) }),
]);

/**
 * A student forgot their picture key: clear it, they pick a new one next time they join.
 * Or: switch on Ways to play for a student (an accommodation), which they see next time a page loads.
 */
export async function POST(request: Request, ctx: RouteContext<"/api/teacher/classes/[id]/students/[studentId]">) {
  const me = await requireTeacher(request);
  if (me instanceof Response) return me;
  const { id, studentId } = await ctx.params;
  if (!getClass(id, me.id) || !inClass(studentId, id)) return notYours();
  const body = Change.safeParse(await request.json().catch(() => null));
  if (!body.success) return bad("That change didn't make sense.");
  if ("access" in body.data) {
    logAccess(me.id, "set-ways-to-play", { classId: id, studentId });
    return Response.json({ ok: true, access: updateAccommodations(studentId, body.data.access) });
  }
  if ("level" in body.data) {
    if (!correctCandle(id, studentId, body.data.lessonId, body.data.conceptId, body.data.level as 0 | 1 | 2 | 3)) return bad("That student hasn't started this lesson yet.");
    logAccess(me.id, "corrected-candles", { classId: id, studentId });
    return Response.json({ ok: true });
  }
  // fix a nickname (a student asks, or it isn't okay): the same safety and "not taken" checks as joining
  if ("nickname" in body.data) {
    const check = checkNickname(id, body.data.nickname);
    if (!check.ok) return bad(check.error);
    db.update(students).set({ nickname: check.nickname }).where(and(eq(students.id, studentId), eq(students.classId, id))).run();
    logAccess(me.id, "changed-nickname", { classId: id, studentId });
    return Response.json({ ok: true, nickname: check.nickname });
  }
  db.update(students).set({ keyHash: null, failedKeys: 0, lockedUntil: null }).where(and(eq(students.id, studentId), eq(students.classId, id))).run();
  logAccess(me.id, "reset-pictures", { classId: id, studentId });
  return Response.json({ ok: true });
}

/** Remove a student from the class, with everything they did */
export async function DELETE(request: Request, ctx: RouteContext<"/api/teacher/classes/[id]/students/[studentId]">) {
  const me = await requireTeacher(request);
  if (me instanceof Response) return me;
  const { id, studentId } = await ctx.params;
  if (!getClass(id, me.id)) return notYours();
  removeStudent(id, studentId);
  logAccess(me.id, "removed-student", { classId: id, studentId });
  return Response.json({ ok: true });
}
