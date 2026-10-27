/**
 * Every page of the website: the right download for this computer, and the reading pages' contents rail.
 * The homepage's chapters load on top (site/js/home.ts). No trackers, cookies or third-party anything:
 * this file and its pieces are all that runs.
 */

type OS = "windows" | "mac" | "chromeos" | "mobile" | "other";

function detectOS(): OS {
  const ua = navigator.userAgent;
  const platform = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ?? navigator.platform ?? "";
  if (/CrOS/.test(ua) || /chrome os/i.test(platform)) return "chromeos";
  if (/Android|iPhone|iPod/.test(ua) || (/iPad|Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "mobile";
  if (/Win/i.test(platform)) return "windows";
  if (/Mac/i.test(platform)) return "mac";
  return "other";
}

/** Download buttons say (and get) the right thing for this computer */
function downloads(os: OS) {
  document.documentElement.dataset.os = os;
  const links = document.body.dataset;
  for (const a of document.querySelectorAll<HTMLAnchorElement>("[data-download]")) {
    if (os === "windows") {
      a.href = links.windows!;
      a.textContent = "Download for Windows";
    } else if (os === "mac") {
      a.href = links.mac!;
      a.textContent = "Download for Mac";
    } else {
      // a Chromebook or phone can't run Protégé (the teacher's laptop does): say so, kindly
      a.href = `${links.root ?? ""}guide.html#get-it`;
      a.textContent = "Get Protégé for your laptop";
    }
  }
  for (const p of document.querySelectorAll<HTMLElement>("[data-download-note]")) {
    if (os === "chromeos" || os === "mobile") {
      p.textContent = "Protégé installs on the teacher's laptop (Windows or Mac). Students don't install anything: they join from their Chromebook's browser with a class code.";
    }
  }
  for (const el of document.querySelectorAll<HTMLElement>("[data-os-only]")) {
    const only = el.dataset.osOnly;
    el.hidden = os === "mac" ? only !== "mac" : only === "mac";
  }
}

/** Long documents: a contents rail that follows where you are */
function contents() {
  const article = document.querySelector<HTMLElement>(".doc article");
  const rail = document.querySelector<HTMLElement>(".doc .rail");
  if (!article || !rail) return;
  const heads = [...article.querySelectorAll<HTMLHeadingElement>("h2")];
  if (heads.length < 3) return rail.remove();
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
  nav.setAttribute("aria-label", "On this page");
  const title = document.createElement("p");
  title.className = "rail-title";
  title.textContent = "On this page";
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
const os = detectOS();
downloads(os);
contents();
if (document.body.dataset.page === "home") void import("./home").then((m) => m.home());
