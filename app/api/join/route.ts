import { z } from "zod";
import { clear, readSigned } from "@/lib/auth/cookies";
import { clientIp, forbidden, limit, sameOrigin, strike, struckOut, tooMany } from "@/lib/auth/request";
import { checkKey, classPreview, createStudent, signInStudent, suggestNicknames } from "@/lib/student/auth";
import { classByCode } from "@/lib/teacher/classes";

/**
 * Students joining a class, in steps:
 *   code     → which class (its age style, its nicknames for coming back)
 *   suggest  → "Surprise me" nicknames
 *   new      → a new student: nickname + secret pictures (or Google, if the teacher allowed it)
 *   back     → a returning student: tap your nickname, then your pictures
 */
const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("code"), code: z.string().trim().min(3).max(20) }),
  z.object({ action: z.literal("suggest"), classId: z.string() }),
  z.object({ action: z.literal("new"), classId: z.string(), nickname: z.string().max(40), key: z.array(z.string()).max(3).nullable(), google: z.boolean().optional() }),
  z.object({ action: z.literal("back"), classId: z.string(), studentId: z.string(), key: z.array(z.string()).max(3) }),
]);

// `code` lets the screen say it in the class's language (the English `error` is the fallback)
const bad = (error: string, status = 400, code?: string) => Response.json({ error, code }, { status });

export async function POST(request: Request) {
  if (!sameOrigin(request)) return forbidden();
  const ip = clientIp(request);
  // a whole class can share one school address, so this is generous; wrong codes are limited separately
  if (!limit(`join:${ip}`, 600, 5 * 60 * 1000)) return tooMany();
  const body = Body.safeParse(await request.json().catch(() => null));
  if (!body.success) return bad("Something went wrong. Try again.");
  const b = body.data;

  if (b.action === "code") {
    // guessing codes is slowed down hard: 20 wrong codes from one place, then wait 10 minutes
    if (struckOut(`join-wrong:${ip}`, 20)) return tooMany();
    const c = classByCode(b.code);
    if (!c) strike(`join-wrong:${ip}`, 10 * 60 * 1000);
    if (!c) return bad("That code isn't a class. Check it with your teacher (it looks like GLOW-42).", 404, "code_wrong");
    return Response.json(classPreview(c.id));
  }
  if (b.action === "suggest") return Response.json({ nicknames: suggestNicknames(b.classId) });

  if (b.action === "new") {
    let googleIdHash: string | undefined;
    if (b.google) {
      // finishing "Continue with Google": the hashed id waits in a signed cookie from the callback
      const pending = await readSigned("protege_google_pending");
      const [classId, idHash] = pending?.split("~") ?? [];
      if (classId !== b.classId || !idHash) return bad("Your Google sign-in timed out. Try \"Continue with Google\" again.", 400, "google_timeout");
      googleIdHash = idHash;
      await clear("protege_google_pending");
    }
    const r = createStudent(b.classId, b.nickname, b.key, googleIdHash);
    if (!r.ok) return bad(r.error, 400, r.code);
    await signInStudent(r.student.id, request);
    return Response.json({ student: r.student });
  }

  if (!limit(`join-key:${b.studentId}`, 12, 5 * 60 * 1000)) return tooMany();
  const r = checkKey(b.classId, b.studentId, b.key);
  if (!r.ok) return bad(r.error, 401, r.code);
  await signInStudent(r.student.id, request);
  return Response.json({ student: r.student });
}
