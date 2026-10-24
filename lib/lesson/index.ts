import { seasons } from "./seasons";
import type { ClientLesson, LessonBlueprint, RecapItem } from "./types";

const LESSONS: Record<string, LessonBlueprint> = { [seasons.id]: seasons };

export const DEFAULT_LESSON_ID = seasons.id;

export function getLesson(id: string): LessonBlueprint {
  return LESSONS[id] ?? seasons;
}

/** The end-of-lesson recap. Only sent to the browser once the student has finished. */
export function lessonRecap(lesson: LessonBlueprint): RecapItem[] {
  return lesson.concepts.map((c) => ({ id: c.id, name: c.name, text: c.recap }));
}

export function toClientLesson(lesson: LessonBlueprint): ClientLesson {
  return {
    id: lesson.id,
    ageStyle: lesson.ageStyle,
    topic: lesson.topic,
    subject: lesson.subject,
    title: lesson.title,
    opener: lesson.opener,
    storyBeats: lesson.storyBeats,
    concepts: lesson.concepts.map(({ id, name, beliefs }) => ({ id, name, beliefs })),
  };
}
