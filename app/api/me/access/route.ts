import { forbidden, limit, sameOrigin, tooMany } from "@/lib/auth/request";
import { AccessPatch } from "@/lib/access/settings";
import { updateStudentAccess } from "@/lib/student/access";
import { currentStudent } from "@/lib/student/auth";

/** A signed-in student changed their Ways to play: keep it on their account, so it follows them to any Chromebook */
export async function PUT(request: Request) {
  if (!sameOrigin(request)) return forbidden();
  const me = await currentStudent();
  if (!me) return Response.json({ error: "Join your class first." }, { status: 401 });
  if (!limit(`access:${me.id}`, 60, 60 * 1000)) return tooMany();
  const body = AccessPatch.safeParse(await request.json().catch(() => null));
  if (!body.success) return Response.json({ error: "That setting didn't make sense. Reload the page and try again." }, { status: 400 });
  return Response.json({ access: updateStudentAccess(me.id, body.data) });
}
