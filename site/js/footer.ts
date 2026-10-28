/**
 * The end of every page: the night valley's horizon, stars, fireflies, and Gloam asleep on the hill. Wake it
 * (click, tap or keyboard) and it opens its eyes, mumbles something, and dozes off again. Its animations pause
 * whenever the footer isn't on screen.
 */
export function footer() {
  const foot = document.querySelector<HTMLElement>(".night-foot");
  const sleeper = foot?.querySelector<HTMLButtonElement>(".sleeper");
  const mumble = foot?.querySelector<HTMLElement>(".mumble");
  if (!foot || !sleeper || !mumble) return;
  new IntersectionObserver(([e]) => foot.classList.toggle("is-off", !e.isIntersecting)).observe(foot);
  let lines: string[] = [];
  try {
    lines = JSON.parse(sleeper.dataset.mumbles ?? "[]") as string[];
  } catch {}
  let n = 0;
  let timer = 0;
  sleeper.addEventListener("click", () => {
    foot.classList.add("is-awake");
    mumble.textContent = lines[n++ % lines.length] ?? "";
    clearTimeout(timer);
    timer = window.setTimeout(() => {
      foot.classList.remove("is-awake");
      mumble.textContent = "";
    }, 3200);
  });
}
