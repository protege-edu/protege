import { OwnerPage } from "@/components/teacher/OwnerPage";
import { TeacherGate } from "@/components/teacher/kit";

export default function Page() {
  return (
    <TeacherGate>
      <OwnerPage />
    </TeacherGate>
  );
}
