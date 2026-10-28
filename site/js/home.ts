/**
 * The homepage, played like a film (GSAP's ScrollTrigger, free). The rules that keep it clean:
 *   - in every scene the words stay on one side and Gloam on the other, and Gloam is sized to fit between its
 *     speech bubble and whatever is under it, so nothing ever crosses it, on any screen shape
 *   - every scene fits between the top of the screen and the bottom (type scales with the screen's height too)
 * With reduced motion nothing is pinned or scrubbed: every beat simply shows, in order.
 */
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { GloamMood } from "@/components/gloam/poses";
import { COPY } from "../i18n";
import { linesFor, POKES, type LineId } from "./lines";
import { calm, createMini, createStage, type Stage } from "./stage";
import { typeInto, typeTo } from "./type";
import { createVoice, type Voice } from "./voice";

gsap.registerPlugin(ScrollTrigger);

const $ = <T extends Element = HTMLElement>(s: string, el: ParentNode = document) => el.querySelector<T>(s)!;
const $$ = <T extends Element = HTMLElement>(s: string, el: ParentNode = document) => [...el.querySelectorAll<T>(s)];
const wide = () => innerWidth >= 900;
const lang = document.documentElement.lang.startsWith("fr") ? "fr" : "en";
const t = COPY[lang];
const LINES = linesFor(lang);
/** the first two seconds (Gloam is asleep: the story doesn't make it talk yet) */
let asleepAtStart = false;
/** room kept above Gloam's head for its speech bubble (px) */
const BUBBLE_ROOM = 118;

type Speak = (id: LineId | null, mood?: GloamMood) => void;
interface Scene {
  name: string;
  /** the words' column: the bubble stays to its right */
  words: () => HTMLElement | null;
  /** phones: is there room for the bubble here? */
  bubble: boolean;
  /** no bubble at all (Gloam's line is in the words instead), only its voice */
  quiet?: boolean;
}

export function home() {
  if (calm) document.documentElement.classList.add("calm");
  const stage = createStage($("#stage"));
  const bubble = $("#bubble");
  const say = $("#say");
  const poke = $<HTMLButtonElement>("#poke");
  bubble.hidden = false;
  poke.hidden = false;

  // ---- Gloam's voice and lines ----
  let typing = false;
  let reading = false;
  const voice = createVoice(lang, document.body.dataset.root ?? "", (talking) => stage.set({ talking: talking || typing }));
  let line: LineId | null = null;
  let scene: Scene = { name: "hero", words: () => $<HTMLElement>(".beats"), bubble: false };
  const bubbleOK = () => !scene.quiet && (wide() || scene.bubble);
  const speak: Speak = (id, mood) => {
    if (mood) stage.set({ mood });
    if (id === line) return;
    line = id;
    voice.stop();
    if (!id) {
      bubble.classList.add("is-empty");
      say.textContent = "";
      return;
    }
    bubble.classList.toggle("is-empty", !bubbleOK());
    typing = true;
    stage.set({ talking: true });
    void voice.play(id);
    void typeInto(say, LINES[id], { speed: 24 }).then(() => {
      typing = false;
      if (line === id && !voice.on) stage.set({ talking: false });
    });
  };
  const setScene = (s: Scene) => {
    scene = s;
    bubble.classList.toggle("is-empty", !bubbleOK() || !line);
  };
  addEventListener("resize", () => bubble.classList.toggle("is-empty", !bubbleOK() || !line));

  // the bubble sits above Gloam's head, to the right of the words (never over them)
  stage.onBox((b) => {
    const half = say.offsetWidth / 2;
    const words = wide() ? scene.words()?.getBoundingClientRect() : null;
    const minX = Math.max(12 + half, words ? words.right + 20 + half : 0);
    // (clientWidth leaves out the scrollbar; the chapter trail takes the last ~56px on wide screens)
    const edge = document.documentElement.clientWidth - (innerWidth >= 1100 ? 60 : 16);
    const x = Math.min(edge - half, Math.max(minX, b.x));
    const y = Math.max(say.offsetHeight + 22, b.top - 2);
    bubble.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    bubble.style.setProperty("--tail", `${Math.round(Math.max(-half + 24, Math.min(half - 24, b.x - x)))}px`);
    poke.style.cssText = `left:${b.x - b.h * 0.4}px;top:${b.feet - b.h * 0.95}px;width:${b.h * 0.8}px;height:${b.h * 0.95}px`;
    // a paper section scrolled over Gloam: its bubble goes too
    const hx = Math.min(innerWidth - 1, Math.max(0, b.x));
    const hy = Math.min(innerHeight - 1, Math.max(0, b.top + b.h * 0.3));
    bubble.classList.toggle("is-covered", document.elementFromPoint(hx, hy) !== poke);
  });

  // poking
  let pokes = 0;
  let pokedAt = 0;
  poke.addEventListener("click", () => {
    const before = stage.state.mood;
    const was = line;
    const at = (pokedAt = performance.now());
    line = null;
    bubble.classList.remove("is-empty");
    speak(POKES[pokes++ % POKES.length], "skeptical");
    stage.swing(pokes % 2 ? 18 : -18);
    setTimeout(() => {
      if (pokedAt !== at) return;
      stage.set({ mood: before === "skeptical" ? "confused" : before });
      line = null;
      speak(was);
      setScene(scene);
    }, 2800);
  });

  // the sound switch (in the top bar)
  const sound = document.querySelector<HTMLButtonElement>("#sound");
  if (sound) {
    const show = () => {
      sound.setAttribute("aria-pressed", String(voice.on));
      sound.querySelector("span")!.textContent = voice.on ? t.sound.on : t.sound.off;
    };
    show();
    sound.addEventListener("click", () => {
      voice.set(!voice.on);
      show();
      if (!voice.on) return;
      const was = line;
      line = null;
      speak("soundOn");
      setTimeout(() => {
        if (line !== "soundOn") return;
        line = null;
        speak(was);
      }, 3200);
    });
  }

  const storyST = story(stage, speak, setScene);
  desk();
  worlds();
  privacy(stage, speak, setScene);
  ways(voice, (r) => (reading = r), () => reading);
  finale(stage, speak, setScene);
  trail(storyST);

  // the stage is only drawn where it's seen: the story, privacy and the finale. (Made after the pinned scenes,
  // so it measures the page with their scrolling room in it.)
  const seen = { story: true, private: false, get: false };
  const visible = () => stage.set({ hidden: !(seen.story || seen.private || seen.get) });
  const watch = (key: keyof typeof seen, trigger: string, end?: { endTrigger: string; end: string }) =>
    ScrollTrigger.create({
      trigger,
      start: "top bottom",
      ...(end ?? { end: "bottom top" }),
      onToggle: (st) => {
        seen[key] = st.isActive;
        visible();
      },
    });
  watch("story", ".story", { endTrigger: ".desk", end: "top top" });
  watch("private", ".private");
  watch("get", ".get");
  ScrollTrigger.refresh();
  opening(stage, speak);
}

/** The first two seconds: the valley rises out of the dark, Gloam wakes up with a start, the headline inks in */
function opening(stage: Stage, speak: Speak) {
  if (calm) return;
  if (scrollY > 10) {
    speak("theory", "confused");
    return;
  }
  const html = document.documentElement;
  html.classList.add("is-opening");
  asleepAtStart = true;
  speak(null, "asleep");
  const wake = setTimeout(() => {
    asleepAtStart = false;
    speak("theory", "confused");
  }, 1150);
  const end = () => {
    html.classList.remove("is-opening");
    removeEventListener("scroll", skip);
  };
  // scrolling skips it
  const skip = () => {
    clearTimeout(wake);
    asleepAtStart = false;
    speak("theory", "confused");
    end();
  };
  addEventListener("scroll", skip, { passive: true, once: true });
  setTimeout(end, 2000);
}

/**
 * Act I. One scene, pinned while you scroll: the words change on the left, Gloam stays on the right.
 *   hero → it starts out wrong → students set it straight (the teach box types) → it thinks → it asks →
 *   it clicks (the lantern ignites and its light rolls across the valley) → your turn
 */
function story(stage: Stage, speak: Speak, setScene: (s: Scene) => void): ScrollTrigger | null {
  const pin = $(".story-pin");
  const beats = $(".beats", pin);
  const beatEls = $$(".beat", pin);
  const tb = $(".teachbox", pin);
  const explain = $("#explain");
  const text = explain.textContent ?? "";
  const turnEl = $('.beat[data-beat="turn"]');
  const reply = $(".reply", turnEl);
  const note = $(".note", turnEl);
  let lastShare = -1;
  let lit = false;
  let beat = "";

  /** Gloam's place for a beat, measured from where the words really are (so it never stands on them) */
  const bar = document.querySelector<HTMLElement>(".bar");
  const spot = (b: string) => {
    const vh = innerHeight;
    const barH = bar?.offsetHeight ?? 0;
    if (wide()) {
      // one place for the whole story, standing just above where the teach box appears (so it never moves as the
      // box comes and goes), with room above for its bubble and the top bar; "your turn" steps a little right
      const teachTop = tb.offsetTop - 16;
      const ground = Math.min(0.88, teachTop / vh);
      const height = Math.max(0.2, Math.min(0.52, (ground * vh - BUBBLE_ROOM - barH * 0.6) / 1.02 / vh));
      return { focus: b === "turn" ? 0.82 : 0.74, height, ground };
    }
    // narrow screens: where are this beat's words? (measured without its little entrance offset)
    const el = beatEls.find((e) => e.dataset.beat === b)!;
    const top = beats.getBoundingClientRect().top + el.offsetTop;
    const bottom = top + el.offsetHeight;
    if (b === "hero" || b === "turn") {
      // words at the top: Gloam stands under them if there's room, otherwise peeks up from the corner
      const free = vh * 0.97 - bottom - 20;
      if (free > vh * 0.15) return { focus: 0.5, height: Math.min(0.32, free / 1.02 / vh), ground: 0.97 };
      // no room at all: Gloam steps out of the way (its answer is in the words, under the choices)
      return { focus: 0.5, height: 0.15, ground: 1.45 };
    }
    // words at the bottom: Gloam above them, its bubble above it
    const ground = (top - 12) / vh;
    const height = Math.max(0.12, Math.min(0.3, (top - 12 - BUBBLE_ROOM) / 1.02 / vh));
    return { focus: 0.5, height, ground };
  };
  /** the top bar's and the teach box's real heights (they wrap differently on every screen) */
  const measure = () => {
    document.documentElement.style.setProperty("--bar-h", `${(bar?.offsetHeight ?? 84) + 8}px`);
    pin.style.setProperty("--tb-h", `${tb.offsetHeight}px`);
  };
  measure();
  addEventListener("resize", measure);
  // (and whenever either changes size: the real fonts arriving, or a longer line in French)
  const sized = new ResizeObserver(measure);
  sized.observe(tb);
  if (bar) sized.observe(bar);
  const show = (b: string) => {
    if (b === beat) return;
    beat = b;
    pin.dataset.beat = b;
    for (const el of beatEls) el.classList.toggle("is-on", el.dataset.beat === b);
    // (narrow screens: Gloam's place changes a lot between scenes; it moves there at once, never across the words)
    if (!wide()) stage.jump();
    stage.set(spot(b));
    setScene({ name: b, words: () => beats, bubble: ["wrong", "teach", "eureka"].includes(b) });
  };
  addEventListener("resize", () => {
    const b = beat;
    beat = "";
    show(b || "hero");
  });

  const at = (p: number) => {
    stage.drift(p);
    const b = p < 0.08 ? "hero" : p < 0.2 ? "wrong" : p < 0.54 ? "teach" : p < 0.74 ? "eureka" : "turn";
    show(b);
    const share = Math.max(0, Math.min(1, (p - 0.23) / 0.19));
    if (Math.abs(share - lastShare) > 0.002) {
      typeTo(explain, text, share);
      if (share > lastShare && share > 0 && share < 1) stage.typed();
      lastShare = share;
    }
    pin.classList.toggle("is-sent", p > 0.42);
    if (p >= 0.55 && !lit) {
      lit = true;
      stage.ignite();
    } else if (p < 0.55 && lit) {
      lit = false;
      stage.douse();
    }
    if (p < 0.08) {
      if (!asleepAtStart) speak("theory", "confused");
    }
    else if (p < 0.2) speak("smug", "proud");
    else if (p < 0.42) speak(null, "listening");
    else if (p < 0.47) speak(null, "thinking");
    else if (p < 0.55) speak("lean", "curious");
    else if (p < 0.62) speak("eureka", "eureka");
    else if (p < 0.74) speak("eureka", "proud");
    else if (!turnEl.dataset.answer) {
      // a new topic: the lantern dims (it doesn't get this one yet), the valley keeps a little of its light
      stage.set({ light: 0 });
      stage.glow(34, 0.8);
      speak("turn", "skeptical");
    }
  };

  // "Your turn": the card's words fly to Gloam as a little note; Gloam reads it, then reacts
  const answers: Record<string, { id: LineId; mood: GloamMood; light: number; note: string }> = {
    wrong: { id: "wrong", mood: "proud", light: 0, note: t.story.notes.wrong },
    half: { id: "half", mood: "curious", light: 0.35, note: t.story.notes.half },
    right: { id: "right", mood: "eureka", light: 1, note: t.story.notes.right },
  };
  const react = (choice: string) => {
    const a = answers[choice];
    if (a.mood === "eureka") stage.ignite();
    else {
      stage.set({ light: a.light });
      stage.glow(a.light ? 60 : 34, 0.8);
    }
    speak(a.id, a.mood);
    void typeInto(reply, LINES[a.id]);
    note.textContent = a.note;
  };
  const fine = matchMedia("(pointer: fine)").matches;
  for (const b of $$<HTMLButtonElement>(".choices button", turnEl)) {
    // the cards lean toward the pointer a little (they're paper you could pick up)
    if (fine && !calm) {
      b.addEventListener("pointermove", (e) => {
        const r = b.getBoundingClientRect();
        const rx = ((e.clientY - r.top) / r.height - 0.5) * -7;
        const ry = ((e.clientX - r.left) / r.width - 0.5) * 9;
        b.style.transform = `perspective(700px) rotateX(${rx.toFixed(1)}deg) rotateY(${ry.toFixed(1)}deg) translateY(-3px)`;
      });
      b.addEventListener("pointerleave", () => (b.style.transform = ""));
    }
    b.addEventListener("click", () => {
      for (const o of $$(".choices button", turnEl)) o.setAttribute("aria-pressed", String(o === b));
      turnEl.dataset.answer = b.dataset.choice;
      speak(null, "listening");
      if (calm) return react(b.dataset.choice!);
      const r = b.getBoundingClientRect();
      const head = stage.box();
      const paper = document.createElement("div");
      paper.className = "note-fly";
      paper.textContent = b.textContent;
      paper.style.left = `${r.left}px`;
      paper.style.top = `${r.top}px`;
      paper.style.width = `${r.width}px`;
      document.body.append(paper);
      const dx = head.x - (r.left + r.width / 2);
      const dy = head.top + head.h * 0.35 - (r.top + r.height / 2);
      paper
        .animate(
          [
            { transform: "translate(0,0) rotate(0) scale(1)", opacity: 1 },
            { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 90}px) rotate(-14deg) scale(0.6)`, opacity: 1, offset: 0.55 },
            { transform: `translate(${dx}px, ${dy}px) rotate(8deg) scale(0.18)`, opacity: 0 },
          ],
          { duration: 760, easing: "cubic-bezier(.4,.1,.3,1)" },
        )
        .finished.then(() => {
          paper.remove();
          stage.typed();
          setTimeout(() => react(b.dataset.choice!), 220);
        });
    });
  }

  // "Watch Gloam learn" goes to the first beat after the hero
  let st: ScrollTrigger | null = null;
  $<HTMLAnchorElement>('.beat[data-beat="hero"] a[href="#story-wrong"]').addEventListener("click", (e) => {
    if (!st) return;
    e.preventDefault();
    window.scrollTo({ top: st.start + (st.end - st.start) * 0.13, behavior: calm ? "auto" : "smooth" });
  });

  show("hero");
  if (calm) {
    typeTo(explain, text, 1);
    pin.classList.add("is-sent");
    const settle = () => {
      stage.set(wide() ? { ...spot("hero"), light: 1 } : { ground: 1.45, light: 1 });
      stage.glow(160, 0);
      speak("eureka", "proud");
    };
    settle();
    ScrollTrigger.create({ trigger: ".story", start: "top bottom", end: "bottom top", onEnterBack: settle });
    return null;
  }
  typeTo(explain, text, 0);
  measure();
  st = ScrollTrigger.create({
    trigger: ".story",
    start: "top top",
    end: "+=650%",
    pin: ".story-pin",
    scrub: true,
    onEnterBack: () => {
      const b = beat;
      beat = "";
      show(b);
    },
    // the story's over: its last line doesn't follow you down the page
    onLeave: () => speak(null),
    onUpdate: (s) => at(s.progress),
  });
  return st;
}

/** Act II. The teacher's desk: the steps change on the left, the laptop's screen follows, Gloam peeks over it */
function desk() {
  const section = $(".desk");
  const laptop = $(".laptop", section);
  const notes = $(".d-screen .notes .typed", section);
  const drafted = $$(".drafted li", section);
  const table = $(".class", section);
  // "9 students…": the number counts up when the candles light
  const thinks = $(".thinks", section);
  let count: HTMLElement | null = null;
  for (const n of [...thinks.childNodes]) {
    const m = n.nodeType === 3 ? n.textContent?.match(/\d+/) : null;
    if (!m || !n.textContent) continue;
    const [before, after] = [n.textContent.slice(0, m.index), n.textContent.slice((m.index ?? 0) + m[0].length)];
    count = document.createElement("span");
    count.className = "count";
    count.textContent = m[0];
    count.dataset.to = m[0];
    n.replaceWith(before, count, after);
    break;
  }
  let typed = false;
  const type = () => {
    if (typed) return;
    typed = true;
    void typeInto(notes, notes.dataset.type ?? "", { speed: 9 }).then(() => drafted.forEach((li, i) => setTimeout(() => li.classList.add("is-on"), calm ? 0 : 240 * (i + 1))));
  };
  const light = () => {
    if (table.classList.contains("is-lit")) return;
    table.classList.add("is-lit");
    if (!count || calm) return;
    const to = Number(count.dataset.to);
    let n = 0;
    const tick = () => {
      count!.textContent = String(++n);
      if (n < to) setTimeout(tick, 70);
    };
    count.textContent = "0";
    setTimeout(tick, 600);
  };
  let step = -1;
  const go = (s: number) => {
    if (s === step) return;
    step = s;
    laptop.dataset.step = String(s);
    for (const el of $$(".d-beat, .d-screen", section)) el.classList.toggle("is-on", Number(el.dataset.step) === s);
    if (s === 0) type();
    if (s === 2) light();
  };
  if (calm || !wide()) {
    section.classList.add("is-flat");
    laptop.classList.add("is-here");
    for (const el of $$(".d-beat", section)) el.classList.add("is-on");
    if (calm) {
      // the steps in order, and the laptop showing the class
      for (const el of $$(".d-screen", section)) el.classList.toggle("is-on", el.dataset.step === "2");
      table.classList.add("is-lit");
      return;
    }
    // phones: the laptop's screen goes through the steps by itself while it's on screen
    const views = $$(".d-screen", section);
    let s = 0;
    const next = () => {
      views.forEach((v) => v.classList.toggle("is-on", Number(v.dataset.step) === s));
      laptop.dataset.step = String(s);
      if (s === 0) type();
      if (s === 2) light();
      s = (s + 1) % views.length;
    };
    let timer = 0;
    new IntersectionObserver(([e]) => {
      clearInterval(timer);
      if (!e.isIntersecting) return;
      next();
      timer = window.setInterval(next, 4200);
    }).observe(laptop);
    return;
  }
  go(0);
  ScrollTrigger.create({
    trigger: section,
    start: "top top",
    end: "+=240%",
    pin: ".desk-pin",
    scrub: true,
    onEnter: () => laptop.classList.add("is-here"),
    onUpdate: (s) => go(s.progress < 0.34 ? 0 : s.progress < 0.67 ? 1 : 2),
  });
}

/**
 * Act III. Every grade: walk through the four painted worlds. Each next world wipes in behind a travelling seam
 * of moonlight, and its own Gloam lands with a bounce.
 */
function worlds() {
  const section = $(".worlds");
  const panels = $$(".world", section);
  const seam = $(".seam", section);
  if (calm) return;
  let lead = 0;
  const pan = (p: number) => {
    const n = panels.length;
    const pos = p * (n - 1 + 0.6) - 0.15;
    let next = 0;
    let seamAt = -1;
    panels.forEach((w, i) => {
      // how far this world has wiped in (the first one is simply there)
      const r = i === 0 ? 1 : Math.max(0, Math.min(1, (pos - i + 0.15) / 0.3));
      w.style.clipPath = r >= 1 ? "none" : `inset(0 0 0 ${((1 - r) * 100).toFixed(2)}%)`;
      w.style.visibility = r <= 0 ? "hidden" : "visible";
      if (r > 0.5) next = i;
      if (r > 0 && r < 1) seamAt = (1 - r) * 100;
      if (r <= 0) return;
      const local = Math.max(0, Math.min(1, (pos - i + 0.15) / 1.3));
      const from = Number(w.dataset.from ?? 0.15);
      const to = Number(w.dataset.to ?? 0.3);
      for (const l of $$<HTMLImageElement>(".w-layer", w)) {
        const d = Number(l.dataset.depth);
        const at = (from + (to - from) * local) * l.offsetWidth;
        const parallax = (d - 1.5) * local * section.clientWidth * 0.035;
        l.style.transform = `translate3d(${(-at - parallax).toFixed(1)}px, 0, 0)`;
      }
    });
    seam.style.opacity = seamAt >= 0 ? "1" : "0";
    if (seamAt >= 0) seam.style.left = `${seamAt}%`;
    if (next !== lead) {
      lead = next;
      panels.forEach((w, i) => {
        w.classList.toggle("is-on", i === lead);
        const g = $(".w-gloam", w);
        g.classList.remove("land");
        if (i === lead) {
          void g.offsetWidth;
          g.classList.add("land");
        }
      });
    }
  };
  pan(0);
  ScrollTrigger.create({
    trigger: section,
    start: "top top",
    end: "+=320%",
    pin: ".worlds-pin",
    scrub: 0.6,
    onUpdate: (s) => pan(s.progress),
    onRefresh: (s) => pan(s.progress),
  });
}

/**
 * Act IV. Nothing leaves the laptop. Messages travel only between the Chromebooks and the laptop; one keeps
 * trying to leave for the internet, and Gloam (standing guard, very nosy) bonks it back with its lantern.
 */
function privacy(stage: Stage, speak: Speak, setScene: (s: Scene) => void) {
  const section = $(".private");
  const net = $<SVGSVGElement>(".net", section);
  const words = $(".words", section);
  const leak = $<SVGPathElement>("#leak", net);
  // where along the leak path Gloam's lantern waits (and the stray message gets bonked)
  const HIT = 0.68;
  ScrollTrigger.create({ trigger: net, start: "top 75%", once: true, onEnter: () => net.classList.add("is-on") });
  const NS = "http://www.w3.org/2000/svg";
  // the diagram's labels sit on small dark pills (sized to their words, in either language), so they read
  // over the valley whatever's behind them
  for (const label of $$<SVGTextElement>("text", net)) {
    const b = label.getBBox();
    const pill = document.createElementNS(NS, "rect");
    pill.setAttribute("class", "tag");
    pill.setAttribute("x", String(b.x - 8));
    pill.setAttribute("y", String(b.y - 4));
    pill.setAttribute("width", String(b.width + 16));
    pill.setAttribute("height", String(b.height + 8));
    pill.setAttribute("rx", "8");
    label.before(pill);
  }
  // where on the screen a point along the leak path is
  const onScreen = (share: number) => {
    const pt = leak.getPointAtLength(leak.getTotalLength() * share);
    const m = net.getScreenCTM();
    return m ? new DOMPoint(pt.x, pt.y).matrixTransform(m) : new DOMPoint(0, 0);
  };
  // sized to the diagram (which stops growing), so on a big screen Gloam doesn't swallow the internet
  const size = () => Math.min(0.27, (net.getBoundingClientRect().height * 0.36) / innerHeight);
  const guard = () => {
    const p = onScreen(HIT);
    stage.placeLantern(p.x, p.y, size());
  };
  // out of sight, below the screen (until it pops up to guard the laptop)
  const away = () => {
    stage.jump();
    // already at its guarding size, so not even the lantern peeks over the bottom edge
    stage.set({ ground: 1.45, height: size() });
    stage.glow(0, 0.4);
  };
  // phones and reduced motion: a still Gloam beside the diagram, with its line (in the page itself)
  if (calm || !wide()) {
    section.classList.add("is-flat");
    ScrollTrigger.create({
      trigger: section,
      start: "top bottom",
      end: "bottom top",
      onToggle: (st) => {
        if (!st.isActive) return;
        speak(null);
        away();
      },
    });
    return;
  }
  // wide screens: the scene holds still while Gloam stands guard
  ScrollTrigger.create({
    trigger: section,
    start: "top bottom",
    end: "bottom top",
    onToggle: (st) => st.isActive && away(),
  });
  ScrollTrigger.create({
    trigger: section,
    start: "top top",
    end: "+=110%",
    pin: true,
    onToggle: (st) => {
      if (!st.isActive) {
        speak(null);
        away();
        return;
      }
      setScene({ name: "private", words: () => words, bubble: false, quiet: true });
      stage.set({ light: 0.25 });
      stage.glow(18, 0.8);
      guard();
      speak("nosy", "proud");
    },
  });
  addEventListener("resize", () => section.getBoundingClientRect().top === 0 && guard());
  if (calm) return;
  const threads = $$<SVGPathElement>(".thread", net);
  threads.forEach((th, i) => {
    th.id = `thread-${i}`;
    const c = document.createElementNS(NS, "circle");
    c.setAttribute("r", "3.6");
    c.setAttribute("class", "packet");
    const m = document.createElementNS(NS, "animateMotion");
    m.setAttribute("dur", `${2.6 + (i % 3) * 0.4}s`);
    m.setAttribute("begin", `${1.4 + i * 0.35}s`);
    m.setAttribute("repeatCount", "indefinite");
    m.setAttribute("keyPoints", i % 2 ? "0;1" : "1;0");
    m.setAttribute("keyTimes", "0;1");
    m.setAttribute("calcMode", "linear");
    const mp = document.createElementNS(NS, "mpath");
    mp.setAttribute("href", `#${th.id}`);
    m.append(mp);
    c.append(m);
    net.insertBefore(c, net.querySelector(".laptop-icon"));
  });
  // the one that tries to leave: driven from here, so Gloam knows exactly when to swing
  const escape = document.createElementNS(NS, "circle");
  escape.setAttribute("r", "4");
  escape.setAttribute("class", "escape");
  const flash = document.createElementNS(NS, "circle");
  flash.setAttribute("r", "14");
  flash.setAttribute("class", "bonk");
  net.append(escape, flash);
  let visibleNow = false;
  new IntersectionObserver(([e]) => (visibleNow = e.isIntersecting)).observe(net);
  let t0 = performance.now();
  const len = leak.getTotalLength();
  const tick = (now: number) => {
    requestAnimationFrame(tick);
    if (!visibleNow) return;
    // 2.6s a round: out toward the internet (1.5s), bonked, bounced back (0.6s), a rest
    const k = ((now - t0) % 2600) / 2600;
    let share: number;
    if (k < 0.58) share = HIT * (k / 0.58) * (k / 0.58);
    else if (k < 0.81) share = HIT * (1 - (k - 0.58) / 0.23);
    else share = 0;
    const pt = leak.getPointAtLength(len * share);
    escape.setAttribute("cx", String(pt.x));
    escape.setAttribute("cy", String(pt.y));
    escape.style.opacity = k < 0.81 ? "1" : "0";
    const hitNow = k >= 0.58 && k < 0.6;
    if (hitNow && !escape.dataset.hit) {
      escape.dataset.hit = "1";
      stage.swing(-30);
      flash.setAttribute("cx", String(pt.x));
      flash.setAttribute("cy", String(pt.y));
      flash.classList.remove("is-on");
      void flash.getBoundingClientRect();
      flash.classList.add("is-on");
    }
    if (k < 0.5) delete escape.dataset.hit;
  };
  t0 = performance.now();
  requestAnimationFrame(tick);
}

/** Act V. Ways to play: the switches really change the preview, and "read it to me" makes a live Gloam talk */
function ways(voice: Voice, setReading: (r: boolean) => void, reading: () => boolean) {
  const mini = $("#mini");
  if (!calm) createMini($(".mini-stage", mini), reading);
  for (const b of $$<HTMLButtonElement>(".toggles button")) {
    b.addEventListener("click", () => {
      const on = b.getAttribute("aria-pressed") !== "true";
      const way = b.dataset.way!;
      b.setAttribute("aria-pressed", String(on));
      if (way === "read") {
        if (!on) {
          setReading(false);
          return voice.stop();
        }
        setReading(true);
        mini.classList.add("is-reading");
        void voice.play("mini", true).then(() => {
          setReading(false);
          mini.classList.remove("is-reading");
          b.setAttribute("aria-pressed", "false");
        });
      } else mini.classList.toggle(`is-${way}`, on);
    });
  }
}

/** The finale: dawn comes up as you arrive, a Gloam that knows something now, and the download */
function finale(stage: Stage, speak: Speak, setScene: (s: Scene) => void) {
  const words = $(".get-wrap");
  ScrollTrigger.create({
    trigger: ".get",
    start: "top bottom",
    end: "top top",
    scrub: true,
    onUpdate: (s) => stage.dawn(calm ? 1 : s.progress),
  });
  ScrollTrigger.create({
    trigger: ".get",
    start: "top 60%",
    end: "bottom 40%",
    onToggle: (st) => {
      if (!st.isActive) return speak(null);
      setScene({ name: "finale", words: () => words, bubble: false });
      const vh = innerHeight;
      const ground = 0.88;
      const height = Math.max(0.2, Math.min(0.48, (ground * vh - BUBBLE_ROOM) / 1.02 / vh));
      if (!wide()) stage.jump();
      stage.set(wide() ? { focus: 0.78, height, ground, light: 1 } : { ground: 1.45, light: 1 });
      stage.glow(160, calm ? 0 : 1.6);
      speak("finale", "proud");
    },
  });
}

/** The chapter trail on the right edge: a lantern per chapter (moonlight, not gold), and where you are */
function trail(storyST: ScrollTrigger | null) {
  const nav = $("#trail");
  if (innerWidth < 1100) return;
  nav.hidden = false;
  const links = $$<HTMLAnchorElement>("a", nav);
  const top = (id: string) => {
    if (id === "story") return storyST ? storyST.start : 0;
    if (id === "turn") return storyST ? storyST.start + (storyST.end - storyST.start) * 0.8 : $("#turn").getBoundingClientRect().top + scrollY;
    const el = $(`#${id}`);
    // (a pinned section is wrapped in a spacer: its top is where the chapter starts)
    const spacer = el.parentElement?.classList.contains("pin-spacer") ? el.parentElement : el;
    return spacer.getBoundingClientRect().top + scrollY;
  };
  for (const a of links) {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      window.scrollTo({ top: top(a.dataset.to!) + 2, behavior: calm ? "auto" : "smooth" });
    });
  }
  let raf = 0;
  const mark = () => {
    raf = 0;
    const y = scrollY + innerHeight * 0.35;
    let current = links[0];
    for (const a of links) if (top(a.dataset.to!) <= y) current = a;
    for (const a of links) a.toggleAttribute("aria-current", a === current);
    if (current) current.setAttribute("aria-current", "step");
    nav.classList.toggle("on-paper", !!document.elementFromPoint(innerWidth - 40, innerHeight / 2)?.closest(".paper,.desk"));
  };
  addEventListener("scroll", () => (raf ||= requestAnimationFrame(mark)), { passive: true });
  mark();
}
