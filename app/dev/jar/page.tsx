import { notFound } from "next/navigation";
import { Suspense } from "react";
import { JarPreview } from "./preview";

/** Development only: the class jar as a projector shows it, e.g. /dev/jar?total=312 */
export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <Suspense>
      <JarPreview />
    </Suspense>
  );
}
