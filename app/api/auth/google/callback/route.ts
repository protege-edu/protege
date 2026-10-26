import { setSigned } from "@/lib/auth/cookies";
import { keyedHash } from "@/lib/auth/crypto";
import { googleFinish } from "@/lib/auth/google";
import { signInStudent, studentByGoogle } from "@/lib/student/auth";
import { signInAs, teacherFromGoogle } from "@/lib/teacher/auth";

/** Google sends the browser back here. Sign in, or (new students) go pick a nickname. */
export async function GET(request: Request) {
  const base = process.env.PUBLIC_URL ?? new URL(request.url).origin;
  const result = await googleFinish(new URL(request.url));
  if (!result) return Response.redirect(`${base}/?signin=failed`);
  if (result.forWho.who === "teacher") {
    const t = teacherFromGoogle(result.sub, result.email!, result.forWho.invite);
    if (!t) return Response.redirect(`${base}/teacher?google=noaccount`);
    await signInAs(t.id, request);
    return Response.redirect(`${base}/teacher`);
  }
  const { classId } = result.forWho;
  const known = studentByGoogle(classId, result.sub);
  if (known) {
    await signInStudent(known.id, request);
    return Response.redirect(`${base}/me`);
  }
  // new student: they still pick a nickname. Only the hashed Google id waits here, for 15 minutes.
  await setSigned("protege_google_pending", `${classId}~${keyedHash(result.sub)}`, 0.01, request);
  return Response.redirect(`${base}/join?class=${classId}&google=1`);
}
