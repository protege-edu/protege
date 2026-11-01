"use client";

import { useSearchParams } from "next/navigation";
import { ClassJar } from "@/components/teacher/ClassJar";

export function JarPreview() {
  const q = useSearchParams();
  const total = Number(q.get("total") ?? 312);
  const now = 1_700_000_000_000;
  const moments = ["boss", "rival", "notebook", "recital"].map((kind, i) => ({ id: 10 - i, kind, at: now - i * 60_000 }));
  return <ClassJar total={total} moments={moments} className="Science 9, period 2" onClose={() => {}} />;
}
