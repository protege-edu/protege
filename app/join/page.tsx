import { connection } from "next/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { readSigned } from "@/lib/auth/cookies";
import { JoinScreen } from "@/components/join/JoinScreen";
import { classPreview, currentStudent } from "@/lib/student/auth";

/**
 * Students join their class here. The teacher's QR code opens /join?code=GLOW-42 (straight in).
 * Coming back from "Continue with Google" as a new student: /join?class=<id>&google=1 (pick a nickname).
 */
export default function Page({ searchParams }: PageProps<"/join">) {
  return (
    <Suspense fallback={<div className="h-dvh bg-[#0d1613]" />}>
      <Join searchParams={searchParams} />
    </Suspense>
  );
}

async function Join({ searchParams }: { searchParams: PageProps<"/join">["searchParams"] }) {
  await connection();
  const q = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  // already signed in on this device: straight to their Gloam (?switch lets someone else sign in)
  if ((await currentStudent()) && one(q.switch) === undefined) redirect("/me");
  let googleFor = undefined;
  if (one(q.google) === "1") {
    const pending = await readSigned("protege_google_pending");
    const classId = pending?.split("~")[0];
    if (classId && classId === one(q.class)) googleFor = await classPreview(classId) ?? undefined;
  }
  // before a class is found: the browser's language, if it's one Gloam speaks
  const guess = (await headers()).get("accept-language")?.toLowerCase().startsWith("fr") ? "fr" : "en";
  return <JoinScreen initialCode={one(q.code)} googleFor={googleFor} guess={guess} />;
}
