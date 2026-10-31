/**
 * The join page (/j): a student types the class code on the projector (like GLOW-42), and it takes them to
 * /join, which finds their class. Nothing a student types is kept.
 * A link with the code in it (/j?c=GLOW-42) goes straight there.
 */
type Words = Record<"unreadable" | "going" | "stuck", string>;

/** "glow 42", "Glow-42 ", "GLOW42" -> "GLOW-42" (and an old code with letters after it keeps just its class part) */
export function classCode(typed: string): string | null {
  const m = typed
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .match(/^([A-Z]{2,8})(\d{2})/);
  return m ? `${m[1]}-${m[2]}` : null;
}

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

  const go = (typed: string) => {
    const code = classCode(typed);
    if (!code) return tell(words.unreadable, true);
    tell(words.going);
    // (if the connection is slow, say what to check while it tries)
    setTimeout(() => (said.textContent = words.stuck), 6000);
    window.location.assign(`/join?code=${encodeURIComponent(code)}`);
  };

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    go(input.value);
  });
  input.addEventListener("input", () => tell(""));

  const given = new URLSearchParams(location.search).get("c");
  if (given) {
    input.value = given;
    go(given);
  } else {
    input.focus();
  }
}
