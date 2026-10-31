import { z } from "zod";
import { googleEnabled } from "@/lib/auth/google";
import { clientIp, forbidden, limit, sameOrigin, tooMany } from "@/lib/auth/request";
import { bad } from "@/lib/teacher/api";
import { anyTeachers, currentTeacher, markOnboarded, recover, signIn, signInAs, signOut, signUp, signUpGate } from "@/lib/teacher/auth";

/** Who's signed in, and what sign-in options exist */
export async function GET() {
  const teacher = await currentTeacher();
  return Response.json({ teacher, firstTeacher: !await anyTeachers(), signUp: await signUpGate(), google: googleEnabled() });
}

const email = z.string().trim().email("That doesn't look like an email address.").max(120);
const password = z.string().min(8, "Use at least 8 characters for your password.").max(200);
const Body = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("signup"),
    email,
    password,
    name: z.string().trim().min(1, "Add your name (what students call you is fine).").max(60),
    code: z.string().trim().max(20).optional(),
  }),
  z.object({ action: z.literal("signin"), email, password: z.string().min(1, "Type your password.").max(200) }),
  z.object({ action: z.literal("recover"), email, code: z.string().trim().min(6, "Type your recovery code.").max(40), password }),
  z.object({ action: z.literal("onboarded") }),
]);

export async function POST(request: Request) {
  if (!sameOrigin(request)) return forbidden();
  if (!limit(`teacher-auth:${clientIp(request)}`, 20, 10 * 60 * 1000)) return tooMany();
  const body = Body.safeParse(await request.json().catch(() => null));
  if (!body.success) return bad(body.error.issues[0]?.message ?? "Something's missing.");
  const b = body.data;
  if (b.action === "onboarded") {
    const me = await currentTeacher();
    if (!me) return bad("Sign in first.", 401);
    await markOnboarded(me.id);
    return Response.json({ ok: true });
  }
  if (b.action === "signup") {
    const r = await signUp(b);
    if (!r.ok) return bad(r.error);
    await signInAs(r.teacher.id, request);
    return Response.json({ teacher: r.teacher, recoveryCode: r.recoveryCode });
  }
  if (b.action === "signin") {
    const r = await signIn(b.email, b.password);
    if (!r.ok) return bad(r.error, 401);
    await signInAs(r.teacher.id, request);
    return Response.json({ teacher: r.teacher });
  }
  const r = await recover(b.email, b.code, b.password);
  if (!r.ok) return bad(r.error, 401);
  await signInAs(r.teacher.id, request);
  return Response.json({ teacher: r.teacher, recoveryCode: r.recoveryCode });
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return forbidden();
  await signOut();
  return Response.json({ ok: true });
}
