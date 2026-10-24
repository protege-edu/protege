import { notFound } from "next/navigation";
import { StagePreview } from "./preview";

/** Development only: the stage at any lantern brightness, e.g. /dev/stage?b=0.6&mood=excited */
export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <StagePreview />;
}
