import { seasons } from "./seasons";
import type { ClientLesson, LessonBlueprint } from "./types";

const LESSONS: Record<string, LessonBlueprint> = { [seasons.id]: seasons };

export const DEFAULT_LESSON_ID = seasons.id;

export function getLesson(id: string): LessonBlueprint {
  return LESSONS[id] ?? seasons;
}

export function toClientLesson(lesson: LessonBlueprint): ClientLesson {
  return {
    id: lesson.id,
    title: lesson.title,
    storyBeats: lesson.storyBeats,
    concepts: lesson.concepts.map(({ id, name, beliefs }) => ({ id, name, beliefs })),
  };
}
