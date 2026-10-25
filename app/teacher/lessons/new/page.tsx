import { NewLesson } from "@/components/teacher/NewLesson";
import { TeacherGate } from "@/components/teacher/kit";

export default function Page() {
  return (
    <TeacherGate>
      <NewLesson />
    </TeacherGate>
  );
}
