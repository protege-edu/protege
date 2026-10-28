/**
 * The website's lost page (404.html): the same dark valley and searching Gloam as the app's
 * (components/lost/mount.ts), in the high school style.
 */
import { mountLost } from "@/components/lost/mount";
import { lostCopy } from "@/lib/age-styles/lost-copy";
import { seniorGloam } from "@/lib/age-styles/rigs/senior-gloam";

export function lost() {
  const root = document.querySelector<HTMLElement>(".lost");
  if (!root) return;
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const copy = lostCopy(document.documentElement.lang.startsWith("fr") ? "fr" : "en", "senior");
  mountLost(root, { copy, kind: "missing", rig: seniorGloam, calm });
}
