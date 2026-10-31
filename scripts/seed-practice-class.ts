/**
 * Creates a PRACTICE class of 12 fake students (nicknames only) with believable progress on the
 * built-in seasons lesson, so the teacher dashboard has something to show. No AI, no real people.
 *
 *   npx tsx --conditions=react-server scripts/seed-practice-class.ts     (into the local database `npm run dev` uses)
 */
import { randomUUID } from "node:crypto";
import { eq, inArray, like } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  classLessons,
  classes,
  conceptEvents,
  lessons,
  messages,
  students,
  teachSessions,
} from "@/lib/db/schema";
import { seasons } from "@/lib/lesson/seasons";
import { migrateDatabase } from "./migrate";

const NICKNAMES = [
  "Pixel Fox",
  "Quiet Owl",
  "Comet",
  "Mango",
  "Static",
  "Bramble",
  "Nova",
  "Pebble",
  "Tango",
  "Juniper",
  "Echo",
  "Wren",
];
// How far each fake student got: understanding per concept (tilt, angle, daylight, distance, hemispheres)
const PROFILES: [number, number, number, number, number][] = [
  [3, 3, 3, 3, 3],
  [3, 2, 1, 0, 0],
  [3, 3, 2, 3, 1],
  [1, 0, 0, 0, 0],
  [3, 3, 3, 0, 2],
  [2, 1, 0, 0, 0],
  [3, 3, 3, 3, 2],
  [0, 0, 0, 0, 0],
  [3, 1, 2, 0, 0],
  [3, 3, 1, 1, 3],
  [2, 0, 1, 0, 0],
  [3, 3, 3, 3, 3],
];
// Students who argued the classic wrong idea ("summer = closer to the sun") and got stuck there
const WRONG_DISTANCE = new Set([1, 3, 4, 5, 8, 10, 7]);

async function main() {
  await migrateDatabase();
  // Start clean: remove any earlier practice classes and everything in them
  for (const old of await db
    .select()
    .from(classes)
    .where(like(classes.name, "%practice%"))
    .all()) {
    const kids = (
      await db
        .select({ id: students.id })
        .from(students)
        .where(eq(students.classId, old.id))
        .all()
    ).map((k) => k.id);
    const sess = kids.length
      ? (
          await db
            .select({ id: teachSessions.id })
            .from(teachSessions)
            .where(inArray(teachSessions.studentId, kids))
            .all()
        ).map((s) => s.id)
      : [];
    if (sess.length) {
      await db
        .delete(conceptEvents)
        .where(inArray(conceptEvents.sessionId, sess))
        .run();
      await db.delete(messages).where(inArray(messages.sessionId, sess)).run();
      await db
        .delete(teachSessions)
        .where(inArray(teachSessions.id, sess))
        .run();
    }
    if (kids.length)
      await db.delete(students).where(inArray(students.id, kids)).run();
    await db.delete(classLessons).where(eq(classLessons.classId, old.id)).run();
    await db.delete(classes).where(eq(classes.id, old.id)).run();
  }

  const now = Date.now();
  await db
    .insert(lessons)
    .values({
      id: seasons.id,
      title: seasons.title,
      grade: seasons.grade,
      status: "approved",
      blueprint: seasons,
      sourceName: "Built into Protégé",
      createdAt: new Date(now),
      updatedAt: new Date(now),
      approvedAt: new Date(now),
    })
    .onConflictDoNothing()
    .run();
  const classId = randomUUID();
  await db
    .insert(classes)
    .values({
      id: classId,
      name: "Science 9 (practice class)",
      grade: 9,
      createdAt: new Date(now),
    })
    .run();
  await db
    .insert(classLessons)
    .values({ classId, lessonId: seasons.id, assignedAt: new Date(now) })
    .run();

  for (const [i, nickname] of NICKNAMES.entries()) {
    const studentId = randomUUID();
    const sessionId = randomUUID();
    const levels = PROFILES[i];
    const understanding = Object.fromEntries(
      seasons.concepts.map((c, k) => [c.id, levels[k] as 0 | 1 | 2 | 3]),
    );
    const t = new Date(now - (12 - i) * 60_000);
    await db
      .insert(students)
      .values({ id: studentId, nickname, classId, createdAt: t })
      .run();
    await db
      .insert(teachSessions)
      .values({
        id: sessionId,
        studentId,
        lessonId: seasons.id,
        classId,
        understanding,
        createdAt: t,
        updatedAt: t,
        finishedAt: levels.every((l) => l === 3) ? t : null,
      })
      .run();
    await db
      .insert(messages)
      .values({
        sessionId,
        from: "gloam",
        text: seasons.opener,
        emotion: "proud",
        createdAt: t,
      })
      .run();
    for (const [k, c] of seasons.concepts.entries()) {
      let level = 0;
      while (level < levels[k]) {
        const next = Math.min(3, level + (level === 0 ? 2 : 1));
        await db
          .insert(conceptEvents)
          .values({
            sessionId,
            conceptId: c.id,
            quality: "clear",
            levelBefore: level,
            levelAfter: next,
            createdAt: t,
          })
          .run();
        level = next;
      }
    }
    if (WRONG_DISTANCE.has(i)) {
      for (let n = 0; n < 2; n++) {
        await db
          .insert(conceptEvents)
          .values({
            sessionId,
            conceptId: "distance",
            quality: "wrong",
            levelBefore: levels[3],
            levelAfter: levels[3],
            createdAt: t,
          })
          .run();
      }
    }
  }

  console.log(
    `Practice class created with ${NICKNAMES.length} fake students (nicknames only).`,
  );
}

void main();
