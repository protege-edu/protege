import { z } from "zod";
import { DAILY, usageToday } from "@/lib/ai/allowance";
import { limit, tooMany } from "@/lib/auth/request";
import { bad, requireTeacher } from "@/lib/teacher/api";
import { resetByOwner } from "@/lib/teacher/auth";
import { createSchool, joinSchool, listSchools, newStaffCode } from "@/lib/teacher/schools";

/**
 * The owner page (whoever runs this Protégé): its schools and their staff codes, today's use of Gloam's
 * brain, and the reset for a teacher locked out of their account. Nobody else gets in.
 */
async function requireOwner(request: Request) {
  const me = await requireTeacher(request);
  if (me instanceof Response) return me;
  return me.owner ? me : bad("Only the owner of this Protégé can do that.", 403);
}

export async function GET(request: Request) {
  const me = await requireOwner(request);
  if (me instanceof Response) return me;
  return Response.json({ schools: await listSchools(), usage: await usageToday(), limits: DAILY, mySchool: me.schoolId });
}

const Change = z.discriminatedUnion("action", [
  z.object({ action: z.literal("add-school"), name: z.string().trim().min(2, "Type the school's name.").max(120), join: z.boolean().optional() }),
  z.object({ action: z.literal("new-code"), schoolId: z.string().min(1) }),
  z.object({ action: z.literal("join"), schoolId: z.string().min(1) }),
  z.object({ action: z.literal("reset-teacher"), email: z.string().trim().email("Type their email address.") }),
]);

export async function POST(request: Request) {
  const me = await requireOwner(request);
  if (me instanceof Response) return me;
  if (!limit(`owner:${me.id}`, 60, 60 * 60 * 1000)) return tooMany();
  const body = Change.safeParse(await request.json().catch(() => null));
  if (!body.success) return bad(body.error.issues[0]?.message ?? "That change didn't make sense.");
  const c = body.data;
  if (c.action === "add-school") {
    const school = await createSchool(c.name);
    if (c.join) await joinSchool(me.id, school.id);
    return Response.json({ school });
  }
  if (c.action === "new-code") return Response.json({ staffCode: await newStaffCode(c.schoolId) });
  if (c.action === "join") {
    await joinSchool(me.id, c.schoolId);
    return Response.json({ ok: true });
  }
  const code = await resetByOwner(c.email);
  return code ? Response.json({ recoveryCode: code }) : bad(`No teacher account uses ${c.email}. Check the spelling.`);
}
