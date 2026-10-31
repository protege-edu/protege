import { z } from "zod";
import { forbidden, sameOrigin } from "@/lib/auth/request";
import { currentStudent, markMetGloam, signOutStudent } from "@/lib/student/auth";
import { studentHome } from "@/lib/student/home";

/** The signed-in student's home: their Gloam, their lessons, their journal. ?ping: just "still here" (the teacher's live view) */
export async function GET(request: Request) {
  const me = await currentStudent();
  // "still here": counted for a student in a class; anyone else's ping (practice, a teacher's preview) is simply ignored
  if (new URL(request.url).searchParams.has("ping")) return new Response(null, { status: 204 });
  const home = me && await studentHome(me.id);
  if (!home) return Response.json({ error: "You're not signed in to a class on this device." }, { status: 401 });
  return Response.json(home);
}

const Body = z.object({ metGloam: z.literal(true) });

/** The student met Gloam (the first-time intro is done) */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return forbidden();
  const me = await currentStudent();
  if (!me) return Response.json({ error: "Not signed in." }, { status: 401 });
  if (Body.safeParse(await request.json().catch(() => null)).success) await markMetGloam(me.id);
  return Response.json({ ok: true });
}

/** Sign out (a shared Chromebook: the next student signs in with their own pictures) */
export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return forbidden();
  await signOutStudent();
  return Response.json({ ok: true });
}
