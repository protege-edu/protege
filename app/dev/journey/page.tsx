import { notFound } from "next/navigation";
import { JourneyLab } from "./lab";

/**
 * Development only: the adventure world at any point of the journey, for screenshot critique.
 * e.g. /dev/journey?levels=3,3,1,0,0&stop=2&light=0.5&mood=curious
 */
export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <JourneyLab />;
}
