import { notFound } from "next/navigation";
import { CharacterSheet } from "./sheet";

/** Development only: every Gloam mood at different lantern levels, for design review. */
export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <CharacterSheet />;
}
