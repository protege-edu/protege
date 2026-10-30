/**
 * The join page (/j): a student types the code on the projector, and it sends them to their class.
 *   - On the school network, the code's last letters hold the teacher's laptop's address (lib/hosting/locator.ts).
 *   - Online (Protégé online), they're the laptop's room on this website, looked up here (functions/api/room).
 * Nothing a student types is kept. A link with the code in it (/j?c=GLOW-42-K7Q2) goes straight there.
 */
import { joinTarget, normalizeLetters, readJoinCode } from "@/lib/hosting/locator";

type Words = Record<"unreadable" | "short" | "typo" | "going" | "stuck" | "checking" | "closed" | "offline", string>;

export function join() {
  const form = document.querySelector<HTMLFormElement>(".join-card");
  const input = document.querySelector<HTMLInputElement>("#join-code");
  const said = document.querySelector<HTMLElement>("#join-said");
  if (!form || !input || !said) return;
  const words = JSON.parse(input.dataset.problems ?? "{}") as Words;

  const tell = (text: string, problem = false) => {
    said.textContent = text;
    said.classList.toggle("is-problem", problem);
    if (problem) {
      input.setAttribute("aria-invalid", "true");
      input.focus();
    } else input.removeAttribute("aria-invalid");
  };
  const send = (url: string) => {
    tell(words.going);
    // (if the class can't be reached, the browser shows its own page; while it tries, say what to check)
    setTimeout(() => (said.textContent = words.stuck), 6000);
    window.location.assign(url);
  };

  const go = async (typed: string) => {
    const read = readJoinCode(typed);
    if (!read) return tell(words.unreadable, true);
    if (!read.locator) return tell(words.short, true);
    // the school network: the laptop's address is in the code itself
    const here = joinTarget(typed);
    if ("url" in here) return send(here.url);
    // online: the laptop's room on this website
    const room = normalizeLetters(read.locator);
    if (room.length !== 4) return tell(words.typo, true);
    tell(words.checking);
    try {
      const res = await fetch(`/api/room/${encodeURIComponent(room)}`, { cache: "no-store" });
      if (res.status === 404) return tell(words.typo, true);
      const found = (await res.json()) as { url?: string; closed?: boolean };
      if (found.url) return send(`${found.url}/join?code=${encodeURIComponent(read.classCode)}`);
      tell(found.closed ? words.closed : words.offline, true);
    } catch {
      tell(words.offline, true);
    }
  };

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    void go(input.value);
  });
  input.addEventListener("input", () => tell(""));

  const given = new URLSearchParams(location.search).get("c");
  if (given) {
    input.value = given;
    void go(given);
  } else {
    input.focus();
  }
}
