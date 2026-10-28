/**
 * The homepage, played like a film (GSAP's ScrollTrigger, free). The rule that keeps it clean: in every scene,
 * the words stay on one side and Gloam on the other, so nothing ever crosses it. Gloam's lines change with the
 * scene and are cleared between scenes; with the voice on, it says them out loud.
 * With reduced motion nothing is pinned or scrubbed: every beat simply shows, in order.
 */
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { GloamMood } from "@/components/gloam/poses";
import { COPY } from "../i18n";
import { linesFor, POKES, type LineId } from "./lines";
import { calm, createStage, type Stage } from "./stage";
import { typeInto, typeTo } from "./type";
import { createVoice, type Voice } from "./voice";

gsap.registerPlugin(ScrollTrigger);

const $ = <T extends Element = HTMLElement>(s: string, el: ParentNode = document) => el.querySelector<T>(s)!;
const $$ = <T extends Element = HTMLElement>(s: string, el: ParentNode = document) => [...el.querySelectorAll<T>(s)];
const wide = () => innerWidth >= 900;
// the page's language: Gloam's lines, its voice, and every word the script writes
const lang = document.documentElement.lang.startsWith("fr") ? "fr" : "en";
const t = COPY[lang];
const LINES = linesFor(lang);

type Speak = (id: LineId | null, mood?: GloamMood) => void;

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
  const voice = createVoice(lang, document.body.dataset.root ?? "", (talking) => stage.set({ talking: talking || typing }));
  let line: LineId | null = null;
  let bubbleOK = true;
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
    bubble.classList.toggle("is-empty", !bubbleOK);
    typing = true;
    stage.set({ talking: true });
    void voice.play(id);
    void typeInto(say, LINES[id], { speed: 26 }).then(() => {
      typing = false;
      if (line === id && !voice.on) stage.set({ talking: false });
    });
  };
  /** phones: the bubble only shows where there's room for it */
  const allowBubble = (ok: boolean) => {
    bubbleOK = ok;
    bubble.classList.toggle("is-empty", !ok || !line);
  };

  // the bubble sits above Gloam's head, on Gloam's side of the screen (never over the words)
  stage.onBox((b) => {
    const half = say.offsetWidth / 2;
    const minX = wide() ? innerWidth * 0.5 + half : 12 + half;
    const x = Math.min(innerWidth - 12 - half, Math.max(minX, b.x));
    const y = Math.max(say.offsetHeight + 72, b.top - 4);
    bubble.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    bubble.style.setProperty("--tail", `${Math.round(Math.max(-half + 24, Math.min(half - 24, b.x - x)))}px`);
    poke.style.cssText = `left:${b.x - b.h * 0.4}px;top:${b.feet - b.h * 0.95}px;width:${b.h * 0.8}px;height:${b.h * 0.95}px`;
  });

  // poking
  let pokes = 0;
  let pokedAt = 0;
  poke.addEventListener("click", () => {
    const before = stage.state.mood;
    const was = line;
    const t = (pokedAt = performance.now());
    allowBubble(true);
    line = null;
    speak(POKES[pokes++ % POKES.length], "skeptical");
    setTimeout(() => {
      if (pokedAt !== t) return;
      stage.set({ mood: before === "skeptical" ? "confused" : before });
      line = null;
      speak(was);
      allowBubble(fits(scene));
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
      if (voice.on) {
        const was = line;
        line = null;
        speak("soundOn");
        setTimeout(() => {
          if (line !== "soundOn") return;
          line = null;
          speak(was);
        }, 3200);
      }
    });
  }

  let scene = "hero";

  // phones have room for the bubble only while Gloam is being taught (the hero's and "your turn"'s words fill
  // the screen; there, Gloam's answer appears under the choices)
  const fits = (s: string) => wide() || ["wrong", "teach", "eureka"].includes(s);
  story(stage, speak, (s) => {
    scene = s;
    allowBubble(fits(s));
  });
  desk();
  worlds();
  privacy();
  ways(voice);
  finale(stage, speak, () => {
    scene = "finale";
    allowBubble(wide());
  });
  addEventListener("resize", () => allowBubble(fits(scene)));

  // the stage is only drawn while the story or the finale is on screen. (Made after the pinned scenes, so it
  // measures the page with their scrolling room in it.)
  let inStory = true;
  let inFinale = false;
  const visible = () => stage.set({ hidden: !(inStory || inFinale) });
  ScrollTrigger.create({
    trigger: ".story",
    start: "top bottom",
    endTrigger: ".desk",
    end: "top top",
    onToggle: (st) => {
      inStory = st.isActive;
      visible();
    },
  });
  ScrollTrigger.create({
    trigger: ".get",
    start: "top bottom",
    end: "bottom top",
    onToggle: (st) => {
      inFinale = st.isActive;
      visible();
    },
  });
  ScrollTrigger.refresh();
}

/**
 * Act I. One scene, pinned while you scroll: the words change on the left, Gloam stays on the right.
 *   hero → it starts out wrong → students set it straight (the teach box types) → it thinks → it asks →
 *   it clicks (the lantern ignites and its light spreads across the valley) → your turn
 */
function story(stage: Stage, speak: Speak, onScene: (s: string) => void) {
  const pin = $(".story-pin");
  const beats = $$(".beat", pin);
  const explain = $("#explain");
  const text = explain.textContent ?? "";
  const turnEl = $('.beat[data-beat="turn"]');
  const reply = $(".reply", turnEl);
  const note = $(".note", turnEl);
  let lastShare = -1;
  let lit = false;
  let beat = "";

  const spot = (b: string) => {
    if (wide()) return { focus: 0.74, height: 0.5, ground: 0.84 };
    // phones: Gloam above, the words below. In the hero it stands beside the headline's short lines; in "your turn"
    // (words all the way down) it peeks up from the bottom corner, lantern showing, so you see it light up
    if (b === "hero") return { focus: 0.76, height: 0.16, ground: 0.33 };
    return b === "turn" ? { focus: 0.84, height: 0.17, ground: 1.08 } : { focus: 0.5, height: 0.25, ground: 0.46 };
  };
  const show = (b: string) => {
    if (b === beat) return;
    beat = b;
    pin.dataset.beat = b;
    for (const el of beats) el.classList.toggle("is-on", el.dataset.beat === b);
    stage.set(spot(b));
    onScene(b);
  };

  const at = (p: number) => {
    stage.drift(p);
    const b = p < 0.08 ? "hero" : p < 0.2 ? "wrong" : p < 0.54 ? "teach" : p < 0.74 ? "eureka" : "turn";
    show(b);
    // the student's explanation types itself in, and Gloam nods along
    const share = Math.max(0, Math.min(1, (p - 0.23) / 0.19));
    if (Math.abs(share - lastShare) > 0.002) {
      typeTo(explain, text, share);
      if (share > lastShare && share > 0 && share < 1) stage.typed();
      lastShare = share;
    }
    pin.classList.toggle("is-sent", p > 0.42);
    // the moment: it gets it (and scrolling back up undoes it)
    if (p >= 0.55 && !lit) {
      lit = true;
      stage.ignite();
    } else if (p < 0.55 && lit) {
      lit = false;
      stage.douse();
    }
    if (p < 0.08) speak("theory", "confused");
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

  // "Your turn": what Gloam does with each answer
  const answers: Record<string, { id: LineId; mood: GloamMood; light: number; note: string }> = {
    wrong: { id: "wrong", mood: "proud", light: 0, note: t.story.notes.wrong },
    half: { id: "half", mood: "curious", light: 0.35, note: t.story.notes.half },
    right: { id: "right", mood: "eureka", light: 1, note: t.story.notes.right },
  };
  for (const b of $$<HTMLButtonElement>(".choices button", turnEl)) {
    b.addEventListener("click", () => {
      const a = answers[b.dataset.choice!];
      for (const o of $$(".choices button", turnEl)) o.setAttribute("aria-pressed", String(o === b));
      turnEl.dataset.answer = b.dataset.choice;
      if (a.mood === "eureka") stage.ignite();
      else {
        stage.set({ light: a.light });
        stage.glow(a.light ? 60 : 34, 0.8);
      }
      speak(a.id, a.mood);
      void typeInto(reply, LINES[a.id]);
      note.textContent = a.note;
    });
  }

  // "Watch Gloam learn" goes to the first beat after the hero
  let st: ScrollTrigger | null = null;
  $<HTMLAnchorElement>('.beat[data-beat="hero"] a[href="#story-wrong"]').addEventListener("click", (e) => {
    if (!st) return;
    e.preventDefault();
    window.scrollTo({ top: st.start + (st.end - st.start) * 0.13, behavior: calm ? "auto" : "smooth" });
  });

  if (calm) {
    // every beat shows, in order: end on what it learned
    typeTo(explain, text, 1);
    pin.classList.add("is-sent");
    stage.set({ ...spot("hero"), light: 1 });
    stage.glow(160, 0);
    speak("eureka", "proud");
    return;
  }
  typeTo(explain, text, 0);
  stage.set(spot("hero"));
  speak("theory", "confused");
  st = ScrollTrigger.create({
    trigger: ".story",
    start: "top top",
    end: "+=650%",
    pin: ".story-pin",
    scrub: true,
    onEnterBack: () => onScene(beat),
    onUpdate: (s) => at(s.progress),
  });
}

/** Act II. The teacher's desk: the steps change on the left, the laptop's screen follows on the right */
function desk() {
  const section = $(".desk");
  const notes = $(".d-screen .notes .typed", section);
  const drafted = $$(".drafted li", section);
  let typed = false;
  let step = -1;
  const go = (s: number) => {
    if (s === step) return;
    step = s;
    for (const el of $$(".d-beat, .d-screen", section)) el.classList.toggle("is-on", Number(el.dataset.step) === s);
    if (s === 0 && !typed) {
      typed = true;
      void typeInto(notes, notes.dataset.type ?? "", { speed: 9 }).then(() => drafted.forEach((li, i) => setTimeout(() => li.classList.add("is-on"), calm ? 0 : 260 * (i + 1))));
    }
    if (s === 2) $(".class", section).classList.add("is-lit");
  };
  if (calm || !wide()) {
    // no pinning: each step with its picture, one after another
    for (const el of $$(".d-beat, .d-screen", section)) el.classList.add("is-on");
    for (const el of $$(".d-screen", section)) {
      ScrollTrigger.create({
        trigger: el,
        start: "top 75%",
        once: true,
        onEnter: () => {
          if (el.dataset.step === "0" && !typed) {
            typed = true;
            void typeInto(notes, notes.dataset.type ?? "", { speed: 9 }).then(() => drafted.forEach((li, i) => setTimeout(() => li.classList.add("is-on"), calm ? 0 : 260 * (i + 1))));
          }
          if (el.dataset.step === "2") $(".class", section).classList.add("is-lit");
        },
      });
    }
    return;
  }
  go(0);
  ScrollTrigger.create({
    trigger: section,
    start: "top top",
    end: "+=220%",
    pin: ".desk-pin",
    scrub: true,
    onUpdate: (s) => go(s.progress < 0.34 ? 0 : s.progress < 0.67 ? 1 : 2),
  });
}

/** Act III. Every grade: walk through the four painted worlds, each with its own Gloam */
function worlds() {
  const section = $(".worlds");
  const panels = $$(".world", section);
  if (calm) return;
  const pan = (p: number) => {
    const n = panels.length;
    const pos = p * n;
    // each world is on screen for its share of the scroll, crossfading at the edges; only the more visible one
    // shows its words (two captions on top of each other would be a mess)
    const seen = panels.map((_, i) => Math.max(0, Math.min(1, Math.min(pos - i + 0.15, 1.15 - (pos - i)) / 0.15)));
    const lead = seen.indexOf(Math.max(...seen));
    panels.forEach((w, i) => {
      const q = pos - i;
      const vis = seen[i];
      w.style.opacity = vis.toFixed(3);
      w.classList.toggle("is-on", i === lead);
      if (vis <= 0) return;
      const local = Math.max(0, Math.min(1, q));
      const from = Number(w.dataset.from ?? 0.15);
      const to = Number(w.dataset.to ?? 0.3);
      for (const l of $$<HTMLImageElement>(".w-layer", w)) {
        const d = Number(l.dataset.depth);
        // the camera walks along the painting's best stretch; the front grass slides a little more than the far
        // hills (depth), so you're walking through it
        const at = (from + (to - from) * local) * l.offsetWidth;
        const parallax = (d - 1.5) * local * innerWidth * 0.035;
        l.style.transform = `translate3d(${(-at - parallax).toFixed(1)}px, 0, 0)`;
      }
    });
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

/** Act IV. Nothing leaves the laptop: messages travel only to the laptop; one tries to leave and is stopped */
function privacy() {
  const net = $<SVGSVGElement>(".net");
  ScrollTrigger.create({ trigger: net, start: "top 75%", once: true, onEnter: () => net.classList.add("is-on") });
  if (calm) return;
  const NS = "http://www.w3.org/2000/svg";
  const threads = $$<SVGPathElement>(".thread", net);
  threads.forEach((t, i) => (t.id = `thread-${i}`));
  // little moonlit messages, from each Chromebook to the laptop and back
  threads.forEach((t, i) => {
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
    mp.setAttribute("href", `#${t.id}`);
    m.append(mp);
    c.append(m);
    net.insertBefore(c, net.querySelector(".laptop"));
  });
  // and one that tries to leave for the internet, and is stopped every time
  const escape = document.createElementNS(NS, "circle");
  escape.setAttribute("r", "3.6");
  escape.setAttribute("class", "escape");
  const m = document.createElementNS(NS, "animateMotion");
  m.setAttribute("dur", "2.4s");
  m.setAttribute("begin", "2.2s");
  m.setAttribute("repeatCount", "indefinite");
  const mp = document.createElementNS(NS, "mpath");
  mp.setAttribute("href", "#leak");
  m.append(mp);
  escape.append(m);
  net.insertBefore(escape, net.querySelector(".stop"));
}

/** Act V. Ways to play: the switches really change the preview, and "read it to me" uses Gloam's voice */
function ways(voice: Voice) {
  const mini = $("#mini");
  for (const b of $$<HTMLButtonElement>(".toggles button")) {
    b.addEventListener("click", () => {
      const on = b.getAttribute("aria-pressed") !== "true";
      const way = b.dataset.way!;
      b.setAttribute("aria-pressed", String(on));
      if (way === "read") {
        if (!on) return voice.stop();
        mini.classList.add("is-reading");
        void voice.play("mini", true).then(() => {
          mini.classList.remove("is-reading");
          b.setAttribute("aria-pressed", "false");
        });
      } else mini.classList.toggle(`is-${way}`, on);
    });
  }
}

/** The finale: dawn, a Gloam that knows something now, and the download */
function finale(stage: Stage, speak: Speak, onScene: () => void) {
  ScrollTrigger.create({
    trigger: ".get",
    start: "top 60%",
    end: "bottom 40%",
    onToggle: (st) => {
      if (!st.isActive) return;
      onScene();
      stage.set(wide() ? { focus: 0.76, height: 0.46, ground: 0.86, light: 1 } : { focus: 0.82, height: 0.17, ground: 1.08, light: 1 });
      stage.glow(160, calm ? 0 : 1.6);
      speak("finale", "proud");
    },
  });
  // leaving the finale upward, back into the story's last scene
  ScrollTrigger.create({ trigger: ".get", start: "top 60%", onLeaveBack: () => stage.glow(34, 0.6) });
}
