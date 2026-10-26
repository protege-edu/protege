import { seasons } from "./seasons";
import type { ClientLesson, LessonBlueprint, RecapItem } from "./types";

/** Lessons that ship with Protégé (always approved). Teachers' own lessons live in the database. */
export const BUILT_IN: Record<string, LessonBlueprint> = { [seasons.id]: seasons };

export const DEFAULT_LESSON_ID = seasons.id;

/** The end-of-lesson recap. Only sent to the browser once the student has finished. */
export function lessonRecap(lesson: LessonBlueprint): RecapItem[] {
  return lesson.concepts.map((c) => ({ id: c.id, name: c.name, text: c.recap }));
}

export function toClientLesson(lesson: LessonBlueprint): ClientLesson {
  return {
    id: lesson.id,
    ageStyle: lesson.ageStyle,
    language: lesson.language ?? "en",
    topic: lesson.topic,
    subject: lesson.subject,
    title: lesson.title,
    opener: lesson.opener,
    storyBeats: lesson.storyBeats,
    concepts: lesson.concepts.map(({ id, name, beliefs }) => ({ id, name, beliefs })),
  };
}
