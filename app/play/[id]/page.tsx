import { connection } from "next/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { GameScreen } from "@/components/game/GameScreen";
import { toClientLesson } from "@/lib/lesson";
import { studentAccessParts } from "@/lib/student/access";
import { currentStudent } from "@/lib/student/auth";
import { getApprovedLesson, playedBy } from "@/lib/teacher/lessons";

/**
 * Play any APPROVED lesson. A signed-in student plays it as themselves (their class's lesson, their own
 * session on any Chromebook); a teacher uses this to try their own lessons. Drafts 404.
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
  if (!approved) notFound();
  await connection();
  const me = await currentStudent();
  const lesson = playedBy(approved, me?.id);
  return (
    <div data-age-style={lesson.ageStyle} lang={lesson.language ?? "en"}>
      <GameScreen lesson={toClientLesson(lesson)} account={me ? "student" : "preview"} access={me ? studentAccessParts(me.id) : null} />
    </div>
  );
}
