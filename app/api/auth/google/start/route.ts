import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { classes } from "@/lib/db/schema";
import { googleEnabled, googleStartUrl } from "@/lib/auth/google";

/** Start "Continue with Google": ?who=teacher (&invite=<code> for a new teacher), or ?who=student&class=<classId> (only if that class allows it) */
export async function GET(request: Request) {
  if (!googleEnabled()) return Response.json({ error: "Google sign-in isn't set up on this Protégé." }, { status: 404 });
  const q = new URL(request.url).searchParams;
  if (q.get("who") === "student") {
    const c = await db.select().from(classes).where(eq(classes.id, q.get("class") ?? "")).get();
    if (!c?.googleSignIn) return Response.json({ error: "This class uses secret pictures, not Google." }, { status: 403 });
    return Response.redirect(await googleStartUrl({ who: "student", classId: c.id }));
  }
  // a new teacher brings their invite code along (checked when Google sends them back)
  const invite = (q.get("invite") ?? "").replace(/[^A-Za-z0-9-]/g, "").slice(0, 20);
  return Response.redirect(await googleStartUrl({ who: "teacher", invite }));
}
