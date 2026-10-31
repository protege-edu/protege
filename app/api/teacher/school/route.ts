import { z } from "zod";
import { limit, tooMany } from "@/lib/auth/request";
import { bad, requireTeacher } from "@/lib/teacher/api";
import { newStaffCode, removeTeacher, schoolFor } from "@/lib/teacher/schools";

/** "Your school": its name, staff code, and the teachers who signed up with it */
export async function GET(request: Request) {
  const me = await requireTeacher(request);
  if (me instanceof Response) return me;
  return Response.json({ school: await schoolFor(me.schoolId), owner: me.owner });
}

const Change = z.discriminatedUnion("action", [z.object({ action: z.literal("new-code") }), z.object({ action: z.literal("remove"), teacherId: z.string().min(1) })]);

/** Make a new staff code (the old one stops working), or remove someone who isn't a teacher here */
export async function POST(request: Request) {
  const me = await requireTeacher(request);
  if (me instanceof Response) return me;
  if (!limit(`school:${me.id}`, 30, 60 * 60 * 1000)) return tooMany();
  const body = Change.safeParse(await request.json().catch(() => null));
  if (!body.success) return bad("That change didn't make sense.");
  if (!me.schoolId) return bad("You're not part of a school yet.");
  if (body.data.action === "new-code") return Response.json({ staffCode: await newStaffCode(me.schoolId) });
  const done = await removeTeacher(me, body.data.teacherId);
  return done.ok ? Response.json({ ok: true }) : bad(done.error);
}
