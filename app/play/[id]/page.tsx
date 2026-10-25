import { notFound } from "next/navigation";
import { Suspense } from "react";
import { GameScreen } from "@/components/game/GameScreen";
import { toClientLesson } from "@/lib/lesson";
import { getApprovedLesson } from "@/lib/teacher/lessons";

/** Play any APPROVED lesson as a student (teachers use this to try their own lessons). Drafts 404. */
export default function Page({ params }: PageProps<"/play/[id]">) {
  return (
    <Suspense>
      <Lesson params={params} />
    </Suspense>
  );
}

async function Lesson({ params }: { params: PageProps<"/play/[id]">["params"] }) {
  const { id } = await params;
  const lesson = getApprovedLesson(decodeURIComponent(id));
  if (!lesson) notFound();
  return (
    <div data-age-style={lesson.ageStyle}>
      <GameScreen lesson={toClientLesson(lesson)} />
    </div>
  );
}
