import { connection } from "next/server";
import { Suspense } from "react";
import { GameScreen } from "@/components/game/GameScreen";
import { BUILT_IN, DEFAULT_LESSON_ID, toClientLesson } from "@/lib/lesson";
import { studentAccessParts } from "@/lib/student/access";
import { currentStudent } from "@/lib/student/auth";

/** The front door: the practice lesson, and the way into a class */
export default function Home() {
  const lesson = toClientLesson(BUILT_IN[DEFAULT_LESSON_ID]);
  return (
    // The age style is on the page from the very first paint, so there's no flash of the wrong theme
    <div data-age-style={lesson.ageStyle} lang={lesson.language ?? "en"}>
      <Suspense fallback={<GameScreen lesson={lesson} account="guest" />}>
        <Front lesson={lesson} />
      </Suspense>
    </div>
  );
}

async function Front({ lesson }: { lesson: ReturnType<typeof toClientLesson> }) {
  await connection();
  const me = await currentStudent();
  return <GameScreen lesson={lesson} account={me ? "student" : "guest"} access={me ? studentAccessParts(me.id) : null} />;
}
