import { TeacherHome } from "@/components/teacher/TeacherHome";
import { TeacherGate } from "@/components/teacher/kit";

export default function Page() {
  return (
    <TeacherGate>
      <TeacherHome />
    </TeacherGate>
  );
}
