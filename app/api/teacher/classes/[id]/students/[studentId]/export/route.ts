import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { students } from "@/lib/db/schema";
import { studentExport } from "@/lib/privacy/export";
import { logAccess } from "@/lib/privacy/log";
import { notYours, requireTeacher } from "@/lib/teacher/api";
import { getClass } from "@/lib/teacher/classes";

/** Everything stored about one student, as a file their teacher can hand over (a request to see their information) */
export async function GET(request: Request, ctx: RouteContext<"/api/teacher/classes/[id]/students/[studentId]/export">) {
  const me = await requireTeacher(request);
  if (me instanceof Response) return me;
  const { id, studentId } = await ctx.params;
  if (!getClass(id, me.id) || !db.select({ id: students.id }).from(students).where(and(eq(students.id, studentId), eq(students.classId, id))).get()) return notYours();
  const data = studentExport(studentId);
  if (!data) return notYours();
  logAccess(me.id, "downloaded-student-data", { classId: id, studentId });
  const file = `protege-${data.student.nickname.replace(/[^\p{L}\p{N}]+/gu, "-").toLowerCase()}.json`;
  return new Response(JSON.stringify(data, null, 2), {
    headers: { "content-type": "application/json; charset=utf-8", "content-disposition": `attachment; filename="${file}"`, "cache-control": "no-store" },
  });
}
