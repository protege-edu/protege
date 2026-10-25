import { Suspense } from "react";
import { ClassDashboard } from "@/components/teacher/ClassDashboard";
import { TeacherGate } from "@/components/teacher/kit";

export default function Page() {
  return (
    <TeacherGate>
      <Suspense>
        <ClassDashboard />
      </Suspense>
    </TeacherGate>
  );
}
