import { notFound } from "next/navigation";
import { StyleTile } from "./tile";

/** Development only: every UI component and state on one page, for screenshot critique. */
export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <StyleTile />;
}
