/**
 * Typing, the way Gloam talks in the app: letters appear one by one. Screen readers get the whole line at once
 * (an invisible copy), never letter by letter. With reduced motion, the line just appears.
 */
import { calm } from "./stage";

/** Put a line in `el`, typed out over time. Returns a promise for when it's all there. */
export function typeInto(el: HTMLElement, text: string, { speed = 26, onKey }: { speed?: number; onKey?: () => void } = {}): Promise<void> {
  const shown = setup(el, text);
  if (calm) {
    shown.textContent = text;
    return Promise.resolve();
  }
  const token = String(Math.random());
  el.dataset.typing = token;
  return new Promise((resolve) => {
    let i = 0;
    const tick = () => {
      if (el.dataset.typing !== token) return resolve();
      i++;
      shown.textContent = text.slice(0, i);
      if (onKey && text[i - 1] !== " ") onKey();
      if (i >= text.length) return resolve();
      setTimeout(tick, speed + (/[.,?!]/.test(text[i - 1]) ? speed * 6 : 0));
    };
    tick();
  });
}

/** Show the first `share` (0..1) of a line (for typing that follows the scroll) */
export function typeTo(el: HTMLElement, text: string, share: number) {
  const shown = el.dataset.text === text ? el.querySelector<HTMLElement>("[data-shown]")! : setup(el, text);
  shown.textContent = calm ? text : text.slice(0, Math.round(Math.max(0, Math.min(1, share)) * text.length));
}

function setup(el: HTMLElement, text: string): HTMLElement {
  el.dataset.text = text;
  el.innerHTML = "";
  const sr = document.createElement("span");
  sr.className = "sr-only";
  sr.textContent = text;
  const shown = document.createElement("span");
  shown.setAttribute("aria-hidden", "true");
  shown.dataset.shown = "";
  el.append(sr, shown);
  return shown;
}
