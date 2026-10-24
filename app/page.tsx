import { GameScreen } from "@/components/game/GameScreen";
import { DEFAULT_LESSON_ID, getLesson, toClientLesson } from "@/lib/lesson";

export default function Home() {
  const lesson = getLesson(DEFAULT_LESSON_ID);
  return (
    // The age style is on the page from the very first paint, so there's no flash of the wrong theme
    <div data-age-style={lesson.ageStyle}>
      <GameScreen lesson={toClientLesson(lesson)} />
    </div>
  );
}
