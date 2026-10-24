import { TeachScreen } from "@/components/TeachScreen";
import { DEFAULT_LESSON_ID, getLesson, toClientLesson } from "@/lib/lesson";

export default function Home() {
  return <TeachScreen lesson={toClientLesson(getLesson(DEFAULT_LESSON_ID))} />;
}
