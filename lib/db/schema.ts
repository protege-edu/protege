import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Everything is stored on this machine in data/protege.db.
 * No real names, emails or birthdays, ever. Students are nicknames only.
 */

export const students = sqliteTable("students", {
  id: text("id").primaryKey(),
  nickname: text("nickname").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

/** One student teaching one lesson */
export const teachSessions = sqliteTable("teach_sessions", {
  id: text("id").primaryKey(),
  studentId: text("student_id")
    .notNull()
    .references(() => students.id),
  lessonId: text("lesson_id").notNull(),
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
 * Every time the judge looks at an explanation. This is what the teacher
 * dashboard (Phase 2) uses to show what each student explained well and where they got stuck.
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
