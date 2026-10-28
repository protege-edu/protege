import { Suspense } from "react";
import { LostScreen } from "@/components/lost/LostScreen";
import { lostFor } from "@/components/lost/who";

/** A link that leads nowhere: Gloam searches the dark valley with you, and the way back is right there */
export default function NotFound() {
  return (
    // (whose page it is comes from their cookie, so it waits for the request; the night comes first)
    <Suspense fallback={<main className="min-h-dvh bg-[#070d0b]" />}>
      <Lost />
    </Suspense>
  );
}

async function Lost() {
  return <LostScreen kind="missing" {...await lostFor()} />;
}
