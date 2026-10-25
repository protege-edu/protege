import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { LessonBlueprint } from "@/lib/lesson/types";

/**
 * Everything is stored on this machine in data/protege.db.
 * No real names, emails or birthdays, ever. Students are nicknames only.
 *
 * Designed so later ideas need no rewrite:
 *   - Gloam remembering a student all year: sessions + concept events are already per student, across lessons
 *   - "half the class thinks X" and anonymous board-wide insight: concept_events record every judged
 *     explanation by concept, without anything that identifies a person
 */

/** A teacher's class. The grade picks the age style. */
export const classes = sqliteTable("classes", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  /** 0 = kindergarten */
  grade: integer("grade").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const students = sqliteTable("students", {
  id: text("id").primaryKey(),
  nickname: text("nickname").notNull(),
  /** Which class they joined (null for the Phase 1 practice student) */
  classId: text("class_id").references(() => classes.id),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

/**
 * A lesson the teacher brought. The AI drafts a blueprint once; the teacher edits and approves it.
 * STUDENTS ONLY EVER SEE APPROVED LESSONS.
 */
export const lessons = sqliteTable("lessons", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  grade: integer("grade").notNull(),
  status: text("status", { enum: ["drafting", "draft", "approved", "failed"] }).notNull(),
  blueprint: text("blueprint", { mode: "json" }).$type<LessonBlueprint>(),
  /** Where it came from, e.g. "Seasons notes.pdf" */
  sourceName: text("source_name"),
  /** The part of the teacher's material that was used, kept so the blueprint can be regenerated */
  sourceText: text("source_text"),
  /** Plain-language note if drafting failed, for the teacher */
  problem: text("problem"),
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
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  finishedAt: integer("finished_at", { mode: "timestamp_ms" }),
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

/** Small settings, like the teacher passcode (stored as a hash, never plain text) */
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
