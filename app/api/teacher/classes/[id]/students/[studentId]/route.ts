import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { AccessPatch, defaultAccess } from "@/lib/access/settings";
import { styleForGrade } from "@/lib/age-styles";
import { db } from "@/lib/db/client";
import { messages, students } from "@/lib/db/schema";
import { bad, notYours, requireTeacher } from "@/lib/teacher/api";
import { studentAccess, updateStudentAccess } from "@/lib/student/access";
import { getClass, removeStudent, studentSessionId } from "@/lib/teacher/classes";

const inClass = (studentId: string, classId: string) => !!db.select({ id: students.id }).from(students).where(and(eq(students.id, studentId), eq(students.classId, classId))).get();

/** One student's conversation with Gloam (?lesson=<id>) and their Ways to play, for their own teacher */
export async function GET(request: Request, ctx: RouteContext<"/api/teacher/classes/[id]/students/[studentId]">) {
  const me = await requireTeacher(request);
  if (me instanceof Response) return me;
  const { id, studentId } = await ctx.params;
  const cls = getClass(id, me.id);
  if (!cls || !inClass(studentId, id)) return notYours();
  const access = { ...defaultAccess(styleForGrade(cls.grade)), ...(studentAccess(studentId) ?? {}) };
  const lessonId = new URL(request.url).searchParams.get("lesson") ?? "";
  const sessionId = studentSessionId(id, studentId, lessonId);
  if (!sessionId) return Response.json({ messages: [], access });
  const rows = db.select({ from: messages.from, text: messages.text }).from(messages).where(eq(messages.sessionId, sessionId)).orderBy(asc(messages.id)).all();
  return Response.json({ messages: rows, access });
}

const Change = z.union([z.object({ resetKey: z.literal(true) }), z.object({ access: AccessPatch })]);

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
  if ("access" in body.data) return Response.json({ ok: true, access: updateStudentAccess(studentId, body.data.access) });
  db.update(students).set({ keyHash: null, failedKeys: 0, lockedUntil: null }).where(and(eq(students.id, studentId), eq(students.classId, id))).run();
  return Response.json({ ok: true });
}

/** Remove a student from the class, with everything they did */
export async function DELETE(request: Request, ctx: RouteContext<"/api/teacher/classes/[id]/students/[studentId]">) {
  const me = await requireTeacher(request);
  if (me instanceof Response) return me;
  const { id, studentId } = await ctx.params;
  if (!getClass(id, me.id)) return notYours();
  removeStudent(id, studentId);
  return Response.json({ ok: true });
}
