import { Suspense } from "react";
import { LessonReview } from "@/components/teacher/LessonReview";
import { TeacherGate } from "@/components/teacher/kit";

// Reading the URL's [id] is runtime data, so it has to happen inside a Suspense boundary (Next 16)
export default function Page({ params }: PageProps<"/teacher/lessons/[id]">) {
  return (
    <TeacherGate>
      <Suspense>
        <Review params={params} />
      </Suspense>
    </TeacherGate>
  );
}

async function Review({ params }: { params: PageProps<"/teacher/lessons/[id]">["params"] }) {
  const { id } = await params;
  return <LessonReview id={id} />;
}
