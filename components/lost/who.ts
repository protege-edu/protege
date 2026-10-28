import "server-only";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { styleForGrade, type AgeStyleId, type Language } from "@/lib/age-styles";
import { db } from "@/lib/db/client";
import { classes } from "@/lib/db/schema";
import { currentStudent } from "@/lib/student/auth";

/**
 * Whose lost page this is: a signed-in student gets their class's look and language; anyone else gets
 * the high school look in their browser's language.
 */
export async function lostFor(): Promise<{ style: AgeStyleId; language: Language; student: boolean }> {
  try {
    const me = await currentStudent();
    const c = me ? db.select({ grade: classes.grade, language: classes.language }).from(classes).where(eq(classes.id, me.classId)).get() : null;
    if (c) return { style: styleForGrade(c.grade).id, language: c.language === "fr" ? "fr" : "en", student: true };
  } catch {
    // (no database or no cookie: fall through to the browser's language)
  }
  const accept = (await headers()).get("accept-language") ?? "";
  return { style: "senior", language: /^fr\b/i.test(accept.trim()) ? "fr" : "en", student: false };
}
