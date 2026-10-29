/**
 * The join page (/j): a student types the code on the projector, and it sends them to their teacher's laptop
 * (the code holds its address on the school network: lib/hosting/locator.ts). Nothing is stored or sent.
 * A link with the code in it (/j?c=GLOW-42-26RK) goes straight there.
 */
import { joinTarget } from "@/lib/hosting/locator";

export function join() {
  const form = document.querySelector<HTMLFormElement>(".join-card");
  const input = document.querySelector<HTMLInputElement>("#join-code");
  const said = document.querySelector<HTMLElement>("#join-said");
  if (!form || !input || !said) return;
  const words = JSON.parse(input.dataset.problems ?? "{}") as Record<"unreadable" | "short" | "typo" | "going" | "stuck", string>;

  const go = (typed: string) => {
    const where = joinTarget(typed);
    if ("problem" in where) {
      said.textContent = words[where.problem];
      said.classList.add("is-problem");
      input.setAttribute("aria-invalid", "true");
      input.focus();
      return;
    }
    said.textContent = words.going;
    said.classList.remove("is-problem");
    input.removeAttribute("aria-invalid");
    // (if the laptop can't be reached, the browser shows its own page; while it tries, say what to check)
    setTimeout(() => (said.textContent = words.stuck), 6000);
    window.location.assign(where.url);
  };

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    go(input.value);
  });
  input.addEventListener("input", () => {
    said.textContent = "";
    said.classList.remove("is-problem");
    input.removeAttribute("aria-invalid");
  });

  const given = new URLSearchParams(location.search).get("c");
  if (given) {
    input.value = given;
    go(given);
  } else {
    input.focus();
  }
}
