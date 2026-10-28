import { connection } from "next/server";
import { Suspense } from "react";
import { GameScreen } from "@/components/game/GameScreen";
import { LostScreen } from "@/components/lost/LostScreen";
import { lostFor } from "@/components/lost/who";
import { toClientLesson } from "@/lib/lesson";
import { studentAccessParts } from "@/lib/student/access";
import { currentStudent } from "@/lib/student/auth";
import { getApprovedLesson, playedBy } from "@/lib/teacher/lessons";

/**
 * Play any APPROVED lesson. A signed-in student plays it as themselves (their class's lesson, their own
 * session on any Chromebook); a teacher uses this to try their own lessons. A draft, or a lesson that was
 * taken down, gets the lost page ("this lesson isn't here anymore").
 */
export default function Page({ params }: PageProps<"/play/[id]">) {
  return (
    <Suspense>
      <Lesson params={params} />
    </Suspense>
  );
}

async function Lesson({ params }: { params: PageProps<"/play/[id]">["params"] }) {
  const { id } = await params;
  const approved = getApprovedLesson(decodeURIComponent(id));
  await connection();
  if (!approved) return <LostScreen kind="gone" {...await lostFor()} />;
  const me = await currentStudent();
  const lesson = playedBy(approved, me?.id);
  return (
    <div data-age-style={lesson.ageStyle} lang={lesson.language ?? "en"}>
      <GameScreen lesson={toClientLesson(lesson)} account={me ? "student" : "preview"} access={me ? studentAccessParts(me.id) : null} />
    </div>
  );
}
