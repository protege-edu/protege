"use client";

import { useState } from "react";
import { SafetyBanner } from "@/components/teacher/ClassDashboard";

/** Development only: the teacher's safety alert banner, /dev/alert */
export function AlertPreview() {
  const [alerts, setAlerts] = useState([
    { id: 1, nickname: "Quiet Robin", message: "someone at home hits me and im scared to go home", at: "" },
    { id: 2, nickname: "Brave Fern", message: "i dont think i can keep going anymore", at: "" },
  ]);
  return (
    <main className="mx-auto max-w-[1100px] px-6 pb-20">
      <SafetyBanner alerts={alerts} onAck={(id) => setAlerts((a) => a.filter((x) => x.id !== id))} />
    </main>
  );
}
