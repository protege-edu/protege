import { z } from "zod";
import { bad } from "@/lib/teacher/api";
import { checkPasscode, hasPasscode, isTeacher, setPasscode, signIn, signOut } from "@/lib/teacher/auth";

/** Is a passcode set up yet, and is this browser signed in? */
export async function GET() {
  return Response.json({ hasPasscode: hasPasscode(), signedIn: await isTeacher() });
}

const Body = z.object({ passcode: z.string().min(4, "Use at least 4 characters.").max(64) });

/** First time: sets the passcode. After that: checks it. */
export async function POST(request: Request) {
  const body = Body.safeParse(await request.json().catch(() => null));
  if (!body.success) return bad(body.error.issues[0]?.message ?? "Type a passcode.");
  if (!hasPasscode()) {
    setPasscode(body.data.passcode);
  } else if (!checkPasscode(body.data.passcode)) {
    return bad("That passcode isn't right. Try again.", 401);
  }
  await signIn();
  return Response.json({ ok: true });
}

export async function DELETE() {
  await signOut();
  return Response.json({ ok: true });
}
