import { notFound } from "next/navigation";
import { RigLab } from "./lab";

/**
 * Development only: the animated Gloam rig, with controls for every mood, reaction and moment.
 * Screenshot a state with query params, e.g. /dev/rig?mood=excited&light=0.6&talk=1&idle=80&at=1.5
 */
export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <RigLab />;
}
