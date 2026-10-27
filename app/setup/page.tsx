import type { Metadata } from "next";
import { SetupScene } from "@/components/setup/SetupScene";

export const metadata: Metadata = {
  title: "Setting up Protégé",
  description: "Gloam wakes up while Protégé gets ready on this computer.",
};

/** Opened by the launcher every time Protégé starts (scripts/launch.ts): the first-run setup, or a quick hello */
export default function Page() {
  return <SetupScene />;
}
