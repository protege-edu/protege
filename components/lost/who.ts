import "server-only";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { styleForGrade, type AgeStyleId, type Language } from "@/lib/age-styles";

/**
 * Whose lost page this is: a signed-in student gets their class's look and language; anyone else gets
 * the high school look in their browser's language.
 *
 * The database is only loaded here, when someone is actually lost, never when the page file is read:
 * building the app reads every page at once, and opening the database from several of them at the same
 * moment fails ("database is locked"), which broke the 0.2.0 Mac build.
 */
export async function lostFor(): Promise<{ style: AgeStyleId; language: Language; student: boolean }> {
  try {
    const [{ currentStudent }, { db }, { classes }] = await Promise.all([import("@/lib/student/auth"), import("@/lib/db/client"), import("@/lib/db/schema")]);
    const me = await currentStudent();
    const c = me ? await db.select({ grade: classes.grade, language: classes.language }).from(classes).where(eq(classes.id, me.classId)).get() : null;
    if (c) return { style: styleForGrade(c.grade).id, language: c.language === "fr" ? "fr" : "en", student: true };
  } catch {
    // (no database or no cookie: fall through to the browser's language)
  }
  const accept = (await headers()).get("accept-language") ?? "";
  return { style: "senior", language: /^fr\b/i.test(accept.trim()) ? "fr" : "en", student: false };
}
