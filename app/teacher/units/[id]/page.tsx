import { Suspense } from "react";
import { UnitPage } from "@/components/teacher/UnitPage";
import { TeacherGate } from "@/components/teacher/kit";

// Reading the URL's [id] is runtime data, so it has to happen inside a Suspense boundary (Next 16)
export default function Page({ params }: PageProps<"/teacher/units/[id]">) {
  return (
    <TeacherGate>
      <Suspense>
        <Unit params={params} />
      </Suspense>
    </TeacherGate>
  );
}

async function Unit({ params }: { params: PageProps<"/teacher/units/[id]">["params"] }) {
  const { id } = await params;
  return <UnitPage id={id} />;
}
