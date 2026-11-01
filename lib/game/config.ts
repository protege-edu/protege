import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { classes } from "@/lib/db/schema";

/**
 * Is the game layer (challenges, the rival, the boss fight, fireflies) on for this session?
 * On, unless the teacher switched it off for the class (or PROTEGE_GAME=off switches it off everywhere).
 * Practice, outside a class, always has it.
 */
export async function gameOn(classId: string | null): Promise<boolean> {
  if (process.env.PROTEGE_GAME === "off") return false;
  if (!classId) return true;
  const c = await db.select({ game: classes.game }).from(classes).where(eq(classes.id, classId)).get();
  return c?.game ?? true;
}
