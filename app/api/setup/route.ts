import { z } from "zod";
import { clientIp, forbidden, limit, sameOrigin, tooMany } from "@/lib/auth/request";
import { launcher, setupAvailable, setupKeyOk } from "@/lib/setup/control";
import { bad } from "@/lib/teacher/api";
import { anyTeachers, currentTeacher, setupCode, signInAs, signUp } from "@/lib/teacher/auth";

/**
 * The first-run setup page's line to the launcher (see lib/setup/control.ts). Every request must carry the
 * secret from the address the launcher opened, so only the person at this computer can see or steer setup.
 */
export async function GET(request: Request) {
  if (!setupAvailable()) return Response.json({ available: false });
  if (!setupKeyOk(request)) return forbidden();
  const state = await launcher("/state");
  return Response.json({ available: true, state, firstTeacher: !await anyTeachers(), signedIn: !!(await currentTeacher()) });
}

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("voices"), yes: z.boolean() }),
  z.object({ action: z.literal("retry") }),
  z.object({
    action: z.literal("account"),
    email: z.string().trim().email("That doesn't look like an email address.").max(120),
    password: z.string().min(8, "Use at least 8 characters for your password.").max(200),
    name: z.string().trim().min(1, "Add your name (what students call you is fine).").max(60),
  }),
]);

export async function POST(request: Request) {
  if (!setupAvailable()) return bad("Setup only runs from the Protégé download.", 404);
  if (!sameOrigin(request) || !setupKeyOk(request)) return forbidden();
  if (!limit(`setup:${clientIp(request)}`, 30, 10 * 60 * 1000)) return tooMany();
  const body = Body.safeParse(await request.json().catch(() => null));
  if (!body.success) return bad(body.error.issues[0]?.message ?? "Something's missing.");
  const b = body.data;
  if (b.action === "voices") return Response.json({ state: await launcher("/voices", { yes: b.yes }) });
  if (b.action === "retry") return Response.json({ state: await launcher("/retry", {}) });
  // the first teacher account: the setup page proves it's this computer, so it uses the setup code itself
  if (await anyTeachers()) return bad("There's already a teacher account here. Sign in instead.", 409);
  const r = await signUp({ email: b.email, password: b.password, name: b.name, code: await setupCode() });
  if (!r.ok) return bad(r.error);
  await signInAs(r.teacher.id, request);
  return Response.json({ teacher: r.teacher, recoveryCode: r.recoveryCode });
}
