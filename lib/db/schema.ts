import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { LessonBlueprint } from "@/lib/lesson/types";

/**
 * Everything is stored in Protégé's online database (Turso, lib/db/client.ts).
 * No real names, emails or birthdays, ever. Students are nicknames only.
 *
 * Designed so later ideas need no rewrite:
 *   - Gloam remembering a student all year: sessions + concept events are already per student, across lessons
 *   - "half the class thinks X" and anonymous board-wide insight: concept_events record every judged
 *     explanation by concept, without anything that identifies a person
 */

/**
 * A teacher. Their own email is their login name (it's the teacher's information, not a student's).
 * Passwords and recovery codes are stored only as scrypt hashes; a Google account only as a keyed hash.
 */
export const teachers = sqliteTable("teachers", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash"),
  recoveryHash: text("recovery_hash"),
  googleIdHash: text("google_id_hash").unique(),
  failedLogins: integer("failed_logins").notNull().default(0),
  lockedUntil: integer("locked_until", { mode: "timestamp_ms" }),
  /** the teacher finished the first-run setup */
  onboardedAt: integer("onboarded_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

/** A teacher's class. The grade picks the age style. Students join with its code. */
export const classes = sqliteTable("classes", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  /** 0 = kindergarten */
  grade: integer("grade").notNull(),
  /** whose class it is (null only for classes made before teacher accounts, until claimed) */
  teacherId: text("teacher_id").references(() => teachers.id),
  /** what students type to join, like GLOW-42 */
  code: text("code").unique(),
  /** "Continue with Google" for students: off unless the teacher's school allows it */
  googleSignIn: integer("google_sign_in", { mode: "boolean" }).notNull().default(false),
  /** the teacher paused the class (every Gloam falls asleep) */
  pausedAt: integer("paused_at", { mode: "timestamp_ms" }),
  /**
   * When this class and all its students' work are deleted by themselves (privacy by default: the end of
   * the school year, set when the class is made; the teacher can change it). null = only when the teacher deletes it.
   */
  deleteOn: integer("delete_on", { mode: "timestamp_ms" }),
  /** the language of the screens around the lessons (joining, your Gloam): "en" or "fr" */
  language: text("language").notNull().default("en"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

/**
 * A student: a nickname in a class. NO real names, emails or birthdays, ever.
 * They log back in with a secret picture key (stored only as a hash), or, if their teacher turned it on,
 * with Google, stored only as a keyed hash of Google's account id: never their email, name or photo.
 */
export const students = sqliteTable("students", {
  id: text("id").primaryKey(),
  nickname: text("nickname").notNull(),
  /** Which class they joined (null for the practice student on this computer) */
  classId: text("class_id").references(() => classes.id),
  keyHash: text("key_hash"),
  googleIdHash: text("google_id_hash"),
  failedKeys: integer("failed_keys").notNull().default(0),
  lockedUntil: integer("locked_until", { mode: "timestamp_ms" }),
  /** they've met Gloam (first-time intro done) */
  metGloamAt: integer("met_gloam_at", { mode: "timestamp_ms" }),
  /**
   * Their "Ways to play" (lib/access/settings.ts): only what they or their teacher changed; null = their age's defaults.
   * It can hint at a disability, so it's only ever shown to the student and their own teacher, never in summaries or exports.
   */
  access: text("access", { mode: "json" }).$type<Record<string, unknown>>(),
  /**
   * Ways to play their TEACHER switched on (an accommodation). Kept apart from `access` so a teacher only
   * ever sees what they set, never what the student chose for themselves. The student's own choices win.
   */
  accommodations: text("accommodations", { mode: "json" }).$type<Record<string, unknown>>(),
  lastSeenAt: integer("last_seen_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

/**
 * A lesson the teacher brought. The AI drafts a blueprint once; the teacher edits and approves it.
 * STUDENTS ONLY EVER SEE APPROVED LESSONS.
 */
/**
 * A unit: one upload of a teacher's notes (any length), split into lessons that each fit what Gloam can
 * read at once (lib/teacher/plan.ts). Its lessons are drafted one at a time, in order (lib/teacher/units.ts).
 */
export const units = sqliteTable("units", {
  id: text("id").primaryKey(),
  teacherId: text("teacher_id")
    .notNull()
    .references(() => teachers.id),
  title: text("title").notNull(),
  /** Where it came from, e.g. "Unit 3 - Ecology.pptx" */
  sourceName: text("source_name"),
  grade: integer("grade").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const lessons = sqliteTable("lessons", {
  id: text("id").primaryKey(),
  /** whose lesson it is (null = built into Protégé, or made before teacher accounts until claimed) */
  teacherId: text("teacher_id").references(() => teachers.id),
  title: text("title").notNull(),
  grade: integer("grade").notNull(),
  /** queued: in a unit, waiting for its turn to be drafted */
  status: text("status", { enum: ["queued", "drafting", "draft", "approved", "failed"] }).notNull(),
  /** the unit it's part of (null: a lesson on its own), and its place in it (0 first) */
  unitId: text("unit_id").references(() => units.id),
  position: integer("position"),
  /** the teacher typed this title themselves: drafting keeps it (otherwise Gloam suggests one) */
  ownTitle: integer("own_title", { mode: "boolean" }),
  blueprint: text("blueprint", { mode: "json" }).$type<LessonBlueprint>(),
  /** Where it came from, e.g. "Seasons notes.pdf" */
  sourceName: text("source_name"),
  /** The part of the teacher's material that was used, kept so the blueprint can be regenerated */
  sourceText: text("source_text"),
  /** Plain-language note if drafting failed, for the teacher */
  problem: text("problem"),
  /** While drafting: the step it's on, for the teacher ("Writing Gloam's lines for idea 2 of 4") */
  progress: text("progress"),
  /** The teacher asked for this one sooner: queued lessons are drafted newest-asked first */
  soonerAt: integer("sooner_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  approvedAt: integer("approved_at", { mode: "timestamp_ms" }),
});

/** Which lessons a class can teach Gloam */
export const classLessons = sqliteTable(
  "class_lessons",
  {
    classId: text("class_id")
      .notNull()
      .references(() => classes.id),
    lessonId: text("lesson_id")
      .notNull()
      .references(() => lessons.id),
    assignedAt: integer("assigned_at", { mode: "timestamp_ms" }).notNull(),
    /** the order students see the class's lessons in (0 first; the teacher can move them) */
    position: integer("position"),
  },
  (t) => [primaryKey({ columns: [t.classId, t.lessonId] })],
);

/** One student teaching one lesson */
export const teachSessions = sqliteTable("teach_sessions", {
  id: text("id").primaryKey(),
  studentId: text("student_id")
    .notNull()
    .references(() => students.id),
  lessonId: text("lesson_id").notNull(),
  classId: text("class_id").references(() => classes.id),
  /** JSON: { conceptId: 0-3 } */
  understanding: text("understanding", { mode: "json" }).$type<Record<string, 0 | 1 | 2 | 3>>().notNull(),
  /** JSON: the ideas fully understood, in the order they were lit (the journey's checkpoints) */
  checkpoints: text("checkpoints", { mode: "json" }).$type<string[]>().notNull().default([]),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  finishedAt: integer("finished_at", { mode: "timestamp_ms" }),
});

/**
 * Each student's own Gloam, across every lesson: it grows with everything they teach it.
 * This is the start of "Gloam grows all year". The level comes from `light` (lib/companion/level.ts).
 */
export const gloams = sqliteTable("gloams", {
  studentId: text("student_id")
    .primaryKey()
    .references(() => students.id),
  /** every idea this student has fully taught Gloam, across all lessons */
  light: integer("light").notNull().default(0),
  /** lessons taught all the way to the end */
  lessons: integer("lessons").notNull().default(0),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: text("session_id")
    .notNull()
    .references(() => teachSessions.id),
  from: text("from", { enum: ["student", "gloam"] }).notNull(),
  text: text("text").notNull(),
  emotion: text("emotion"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

/**
 * Every time the judge looks at an explanation. This is what the teacher dashboard uses
 * to show what each student explained well and where they got stuck.
 */
export const conceptEvents = sqliteTable("concept_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: text("session_id")
    .notNull()
    .references(() => teachSessions.id),
  conceptId: text("concept_id").notNull(),
  quality: text("quality", { enum: ["wrong", "vague", "partial", "clear"] }).notNull(),
  levelBefore: integer("level_before").notNull(),
  levelAfter: integer("level_after").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

/**
 * Who looked at or changed a student's information, and when (for the school board's privacy officer:
 * MFIPPA safeguards, breach investigations). Ids and the kind of action only, never what anyone wrote.
 * Read it with `npm run access-log`. Kept for two years (lib/privacy/sweep.ts).
 */
export const accessLog = sqliteTable("access_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  at: integer("at", { mode: "timestamp_ms" }).notNull(),
  teacherId: text("teacher_id").notNull(),
  action: text("action").notNull(),
  classId: text("class_id"),
  studentId: text("student_id"),
});

/** Small settings, like the teacher passcode (stored as a hash, never plain text) */
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
