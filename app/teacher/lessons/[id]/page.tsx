import { LessonReview } from "@/components/teacher/LessonReview";
import { TeacherGate } from "@/components/teacher/kit";

export default async function Page({ params }: PageProps<"/teacher/lessons/[id]">) {
  const { id } = await params;
  return (
    <TeacherGate>
      <LessonReview id={id} />
    </TeacherGate>
  );
}
