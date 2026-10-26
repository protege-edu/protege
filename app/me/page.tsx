import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { StudentHome } from "@/components/home/StudentHome";
import { currentStudent } from "@/lib/student/auth";
import { studentHome } from "@/lib/student/home";

/** "Your Gloam": a signed-in student's home in their class */
export default function Page() {
  return (
    <Suspense fallback={<div className="h-dvh bg-[#0d1613]" />}>
      <Me />
    </Suspense>
  );
}

async function Me() {
  // always per student, never built ahead of time
  await connection();
  const me = await currentStudent();
  const home = me && studentHome(me.id);
  if (!home) redirect("/join");
  return <StudentHome home={home} />;
}
