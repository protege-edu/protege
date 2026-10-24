import { notFound } from "next/navigation";
import { ValleyFrame } from "./frame";

/** Development only: renders the vector valley full screen, used to make stand-in art for the cinematic engine. */
export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <ValleyFrame />;
}
