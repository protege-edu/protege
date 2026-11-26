"use client";

import { useState } from "react";
import { KindnessFlags, SafetyBanner } from "@/components/teacher/ClassDashboard";

/** Development only: the teacher's safety alert banner and the quiet kindness flag, /dev/alert */
export function AlertPreview() {
  const [concerns, setConcerns] = useState([
    { id: 1, nickname: "Quiet Robin", message: "someone at home hits me and im scared to go home", at: "" },
    { id: 2, nickname: "Brave Fern", message: "i dont think i can keep going anymore", at: "" },
  ]);
  const [flags, setFlags] = useState([{ id: 3, nickname: "Loud Otter", message: "jordan is so dumb lol", at: "" }]);
  return (
    <main data-age-style="senior" className="mx-auto max-w-[1100px] px-6 pb-20">
      <SafetyBanner alerts={concerns} onAck={(id) => setConcerns((a) => a.filter((x) => x.id !== id))} />
      <KindnessFlags flags={flags} onAck={(id) => setFlags((a) => a.filter((x) => x.id !== id))} />
    </main>
  );
}
