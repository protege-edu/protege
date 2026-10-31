/**
 * Every page of the website: the reading pages' contents rail, and the footer's sleeping Gloam.
 * The homepage's chapters load on top (site/js/home.ts). No trackers, cookies or third-party anything:
 * this file and its pieces are all that runs.
 */

import { COPY } from "../i18n";
import { footer } from "./footer";

// the page's language (the French pages say lang="fr-CA")
const t = COPY[document.documentElement.lang.startsWith("fr") ? "fr" : "en"];

/** Long documents: a contents rail that follows where you are */
function contents() {
  const article = document.querySelector<HTMLElement>(".doc article");
  const rail = document.querySelector<HTMLElement>(".doc .rail");
  if (!article || !rail) return;
  // (the board pack's list of documents isn't part of the page's own contents)
  const heads = [...article.querySelectorAll<HTMLHeadingElement>("h2:not(.pack-name)")];
  if (heads.length < 3) return;
  const list = document.createElement("ol");
  const items = heads.map((h, i) => {
    if (!h.id) h.id = h.textContent!.toLowerCase().replace(/[^a-z0-9à-ÿ]+/gi, "-").replace(/^-|-$/g, "") || `part-${i + 1}`;
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = `#${h.id}`;
    a.textContent = h.textContent;
    li.append(a);
    list.append(li);
    return a;
  });
  const nav = document.createElement("nav");
  nav.setAttribute("aria-label", t.docs.onThisPage);
  const title = document.createElement("p");
  title.className = "rail-title";
  title.textContent = t.docs.onThisPage;
  nav.append(title, list);
  rail.prepend(nav);
  // the heading you're reading is the one nearest the top
  const seen = new Set<Element>();
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) seen.add(e.target);
        else seen.delete(e.target);
      }
      const top = heads.find((h) => seen.has(h)) ?? heads.filter((h) => h.getBoundingClientRect().top < 0).pop();
      items.forEach((a, i) => (heads[i] === top ? a.setAttribute("aria-current", "true") : a.removeAttribute("aria-current")));
    },
    { rootMargin: "0px 0px -70% 0px" },
  );
  heads.forEach((h) => io.observe(h));
}

document.documentElement.classList.add("js");
contents();
footer();
if (document.body.dataset.page === "home") void import("./home").then((m) => m.home());
if (document.body.dataset.page === "join") void import("./join").then((m) => m.join());
