import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { messages, students } from "@/lib/db/schema";
import { bad, notYours, requireTeacher } from "@/lib/teacher/api";
import { getClass, removeStudent, studentSessionId } from "@/lib/teacher/classes";

/** One student's conversation with Gloam, for the teacher: ?lesson=<id> */
export async function GET(request: Request, ctx: RouteContext<"/api/teacher/classes/[id]/students/[studentId]">) {
  const me = await requireTeacher(request);
  if (me instanceof Response) return me;
  const { id, studentId } = await ctx.params;
  if (!getClass(id, me.id)) return notYours();
  const lessonId = new URL(request.url).searchParams.get("lesson") ?? "";
  const sessionId = studentSessionId(id, studentId, lessonId);
  if (!sessionId) return Response.json({ messages: [] });
  const rows = db.select({ from: messages.from, text: messages.text }).from(messages).where(eq(messages.sessionId, sessionId)).orderBy(asc(messages.id)).all();
  return Response.json({ messages: rows });
}

const Change = z.object({ resetKey: z.literal(true) });

/** A student forgot their picture key: clear it, they pick a new one next time they join */
export async function POST(request: Request, ctx: RouteContext<"/api/teacher/classes/[id]/students/[studentId]">) {
  const me = await requireTeacher(request);
  if (me instanceof Response) return me;
  const { id, studentId } = await ctx.params;
  if (!getClass(id, me.id)) return notYours();
  if (!Change.safeParse(await request.json().catch(() => null)).success) return bad("That change didn't make sense.");
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
