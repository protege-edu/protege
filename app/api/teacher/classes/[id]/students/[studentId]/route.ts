import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { messages } from "@/lib/db/schema";
import { requireTeacher } from "@/lib/teacher/api";
import { studentSessionId } from "@/lib/teacher/classes";

/** One student's conversation with Gloam, for the teacher: ?lesson=<id> */
export async function GET(request: Request, ctx: RouteContext<"/api/teacher/classes/[id]/students/[studentId]">) {
  const denied = await requireTeacher();
  if (denied) return denied;
  const { id, studentId } = await ctx.params;
  const lessonId = new URL(request.url).searchParams.get("lesson") ?? "";
  const sessionId = studentSessionId(id, studentId, lessonId);
  if (!sessionId) return Response.json({ messages: [] });
  const rows = db.select({ from: messages.from, text: messages.text }).from(messages).where(eq(messages.sessionId, sessionId)).orderBy(asc(messages.id)).all();
  return Response.json({ messages: rows });
}
