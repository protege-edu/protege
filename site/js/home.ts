/**
 * The homepage's chapters, choreographed with GSAP's ScrollTrigger (free). Each chapter tells the stage
 * (site/js/stage.ts) where Gloam stands and how it feels; "Students explain" is the one big moment, played by
 * the scroll: the explanation types itself in, Gloam thinks, gets it, and the valley lights up.
 * With reduced motion nothing is pinned or scrubbed: each chapter simply shows how it ends.
 */
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { GloamMood } from "@/components/gloam/poses";
import { calm, createStage, type Stage } from "./stage";
import { typeInto, typeTo } from "./type";

gsap.registerPlugin(ScrollTrigger);

const $ = <T extends Element = HTMLElement>(s: string, el: ParentNode = document) => el.querySelector<T>(s)!;
const $$ = <T extends Element = HTMLElement>(s: string, el: ParentNode = document) => [...el.querySelectorAll<T>(s)];
const wide = () => innerWidth >= 900;

/** What Gloam says when poked, by how it feels */
const POKED = ["please don't poke the scholar.", "i'm thinking. it doesn't look like it, but i am.", "that's my face.", "rude. accurate, but rude.", "if you want me to learn something, use words."];

export function home() {
  if (calm) document.documentElement.classList.add("calm");
  const stage = createStage($("#stage"));
  const bubble = $("#bubble");
  const say = $("#say");
  const poke = $<HTMLButtonElement>("#poke");
  bubble.hidden = false;
  poke.hidden = false;

  // the speech bubble and the poke button follow Gloam
  stage.onBox((b) => {
    const above = Math.max(70, b.top + b.h * 0.05);
    // centred over Gloam's head, but never off the edge of the screen
    const half = say.offsetWidth / 2;
    bubble.style.transform = `translate(${Math.round(Math.min(innerWidth - 12 - half, Math.max(12 + half, b.x)))}px, ${Math.round(above)}px)`;
    poke.style.cssText = `left:${b.x - b.h * 0.4}px;top:${b.top + b.h * 0.1}px;width:${b.h * 0.8}px;height:${b.h * 0.9}px`;
  });

  let line = "";
  // phones have no room beside the words: the bubble only shows while a student teaches Gloam, or when poked
  let scene = "hero";
  let poked = false;
  const fits = () => wide() || scene === "teach" || poked;
  const setScene = (s: string) => {
    scene = s;
    bubble.classList.toggle("is-off", !fits());
  };
  addEventListener("resize", () => bubble.classList.toggle("is-off", !fits()));
  const speak = (text: string, mood?: GloamMood) => {
    if (mood) stage.set({ mood });
    if (text === line) return;
    line = text;
    bubble.classList.toggle("is-empty", !text);
    if (!text) return void (say.textContent = "");
    stage.set({ talking: true });
    void typeInto(say, text, { speed: 24 }).then(() => {
      if (line === text) stage.set({ talking: false });
    });
  };

  // ---- poking ----
  let pokes = 0;
  let pokedUntil = 0;
  poke.addEventListener("click", () => {
    const before = stage.state.mood;
    pokedUntil = performance.now() + 2600;
    poked = true;
    setScene(scene);
    speak(POKED[pokes++ % POKED.length], "skeptical");
    setTimeout(() => {
      if (performance.now() < pokedUntil) return;
      poked = false;
      setScene(scene);
      stage.set({ mood: before === "skeptical" ? "confused" : before });
    }, 2700);
  });

  // ---- the hero: Gloam and its wrong theory ----
  // (phones: Gloam peeks up from the bottom corner)
  const heroSpot = () => (wide() ? { focus: 0.7, height: 0.5, ground: 0.88 } : { focus: 0.8, height: 0.22, ground: 1.1 });
  const hero = () => {
    setScene("hero");
    stage.set({ ...heroSpot(), light: 0, lit: 0, hidden: false });
    speak("ok so i figured out seasons by myself. summer = earth gets closer to the sun. not complicated.", "confused");
  };
  hero();
  ScrollTrigger.create({ trigger: ".hero", start: "top top", end: "bottom center", onEnterBack: hero });

  // ---- chapter: students explain (the big moment) ----
  teach(stage, speak, () => setScene("teach"));

  // ---- chapter: your turn ----
  turn(stage, speak, () => setScene("turn"));

  // ---- paper chapters cover the stage (it stops drawing) ----
  for (const sel of [".teachers", ".worlds", ".ways", ".boards"]) {
    ScrollTrigger.create({
      trigger: sel,
      start: "top top",
      end: "bottom bottom",
      onToggle: (st) => stage.set({ hidden: st.isActive }),
    });
  }
  teachers();
  worlds();

  // ---- chapter: privacy (Gloam stands to the side) ----
  ScrollTrigger.create({
    trigger: ".private",
    start: "top 60%",
    end: "bottom 40%",
    onToggle: (st) => {
      if (!st.isActive) return;
      setScene("private");
      stage.set({ hidden: false, ...(wide() ? { focus: 0.9, height: 0.28, ground: 0.98 } : { focus: 0.85, height: 0.18, ground: 1.1 }), light: 0.25, lit: 0.2 });
      speak("nothing leaves the laptop. i checked. i'm very nosy.", "proud");
    },
  });
  ScrollTrigger.create({ trigger: ".net", start: "top 75%", once: true, onEnter: () => $(".net").classList.add("is-on") });
  ways();

  // ---- the finale: dawn, and a Gloam that knows something now ----
  ScrollTrigger.create({
    trigger: ".get",
    start: "top 55%",
    end: "bottom 30%",
    onToggle: (st) => {
      if (!st.isActive) return;
      setScene("download");
      stage.set({ hidden: false, ...(wide() ? { focus: 0.82, height: 0.42, ground: 0.92 } : { focus: 0.85, height: 0.18, ground: 1.1 }), light: 1, lit: 1 });
      speak("you taught me seasons. now teach me everything else.", "proud");
    },
  });
}

/** "Students explain. Gloam gets it.": pinned, and played by the scroll */
function teach(stage: Stage, speak: (t: string, m?: GloamMood) => void, onScene: () => void) {
  const section = $(".teach");
  const explain = $("#explain");
  const text = explain.dataset.text ?? explain.textContent ?? "";
  const box = $(".teachbox");
  const clicked = $(".clicked");
  let lastShare = -1;
  let got = false;
  const spot = () => (wide() ? { focus: 0.68, height: 0.44, ground: 0.8 } : { focus: 0.5, height: 0.2, ground: 0.5 });

  const at = (p: number) => {
    // 0 → 0.45: the student's explanation types in, and Gloam listens
    const share = Math.max(0, Math.min(1, (p - 0.06) / 0.38));
    if (Math.abs(share - lastShare) > 0.002) {
      typeTo(explain, text, share);
      if (share > lastShare && share < 1) stage.typed();
      lastShare = share;
    }
    box.classList.toggle("is-sent", p > 0.46);
    if (p < 0.06) speak("ok so i figured out seasons by myself. summer = earth gets closer to the sun. not complicated.", "confused");
    else if (p < 0.46) speak("", "listening");
    else if (p < 0.56) speak("…", "thinking");
    else if (p < 0.7) speak("wait. so it's not about distance. it's the LEAN?", "curious");
    // the moment: it gets it (once each way, so scrolling back up undoes it)
    if (p >= 0.7 && !got) {
      got = true;
      stage.eureka();
      stage.set({ light: 1, lit: 1 });
      speak("ohhh. the tilt. fine. FINE. you're right. i hate this.", "eureka");
    } else if (p < 0.7 && got) {
      got = false;
      stage.set({ light: 0, lit: 0 });
    }
    if (got && p > 0.84) speak("ohhh. the tilt. fine. FINE. you're right. i hate this.", "proud");
    clicked.classList.toggle("is-on", p > 0.76);
  };

  if (calm) {
    // no pinning: show how it ends
    typeTo(explain, text, 1);
    box.classList.add("is-sent");
    clicked.classList.add("is-on");
    ScrollTrigger.create({
      trigger: section,
      start: "top center",
      end: "bottom center",
      onToggle: (st) => {
        if (!st.isActive) return;
        onScene();
        stage.set({ ...spot(), light: 1, lit: 1, hidden: false });
        speak("ohhh. the tilt. fine. FINE. you're right. i hate this.", "proud");
      },
    });
    return;
  }
  typeTo(explain, text, 0);
  ScrollTrigger.create({
    trigger: section,
    start: "top top",
    end: "+=260%",
    pin: ".teach .pin",
    scrub: true,
    onEnter: () => {
      onScene();
      stage.set({ ...spot(), hidden: false });
    },
    onEnterBack: () => {
      onScene();
      stage.set({ ...spot(), hidden: false });
    },
    onUpdate: (st) => at(st.progress),
  });
}

/** "Your turn": three things to tell Gloam, and what it does with each */
function turn(stage: Stage, speak: (t: string, m?: GloamMood) => void, onScene: () => void) {
  const section = $(".turn");
  const note = $(".turn .note");
  const reply = $(".turn .reply");
  const answers: Record<string, { mood: GloamMood; light: number; line: string; note: string }> = {
    wrong: {
      mood: "proud",
      light: 0,
      line: "see? i KNEW it. i'm basically a scientist.",
      note: "Gloam believed a wrong idea, and its lantern stayed dark. In class, the teacher would see this idea needs another look, without anyone being marked wrong.",
    },
    half: {
      mood: "curious",
      light: 0.35,
      line: "faster where? into the spoon? out of my hand? i need more.",
      note: "Half there. Gloam's lantern smolders, and it asks for more, like a curious student would.",
    },
    right: {
      mood: "eureka",
      light: 0.85,
      line: "ohhh. the spoon is stealing my heat. rude. but i get it.",
      note: "That's the one. Gloam's lantern lights up, and the teacher sees this idea was explained well.",
    },
  };
  const enter = () => {
    onScene();
    stage.set({ hidden: false, ...(wide() ? { focus: 0.8, height: 0.4, ground: 0.92 } : { focus: 0.86, height: 0.17, ground: 1.1 }), light: 0, lit: 0 });
    speak("new topic. i'm confused again. it's kind of my thing.", "skeptical");
  };
  ScrollTrigger.create({ trigger: section, start: "top 55%", end: "bottom 45%", onToggle: (st) => st.isActive && enter() });
  for (const b of $$<HTMLButtonElement>(".choices button", section)) {
    b.addEventListener("click", () => {
      const a = answers[b.dataset.choice!];
      for (const o of $$(".choices button", section)) o.setAttribute("aria-pressed", String(o === b));
      if (a.mood === "eureka") stage.eureka();
      stage.set({ light: a.light, lit: a.light > 0.5 ? 0.6 : 0 });
      speak(a.line, a.mood);
      void typeInto(reply, a.line);
      note.textContent = a.note;
      section.dataset.answer = b.dataset.choice;
    });
  }
}

/** The teacher side: the steps scroll by while their pictures change beside them */
function teachers() {
  const steps = $$(".tstep");
  const notes = $(".v-notes .typed");
  const drafted = $$(".v-notes .drafted li");
  let typed = false;
  for (const s of steps) {
    ScrollTrigger.create({
      trigger: s,
      start: "top 60%",
      end: "bottom 40%",
      onToggle: (st) => {
        s.classList.toggle("is-active", st.isActive);
        if (!st.isActive) return;
        if (s.dataset.step === "0" && !typed) {
          typed = true;
          void typeInto(notes, notes.dataset.type ?? "", { speed: 12 }).then(() => drafted.forEach((li, i) => setTimeout(() => li.classList.add("is-on"), calm ? 0 : 280 * (i + 1))));
        }
        if (s.dataset.step === "2") $(".v-class").classList.add("is-on");
      },
    });
  }
}

/** Every grade: a sideways journey through the four worlds */
function worlds() {
  const track = $(".worlds .track");
  if (calm) return;
  const distance = () => Math.max(0, track.scrollWidth - innerWidth + 32);
  gsap.to(track, {
    x: () => -distance(),
    ease: "none",
    scrollTrigger: { trigger: ".worlds", start: "top top", end: () => `+=${distance()}`, pin: ".worlds .pin", scrub: true, invalidateOnRefresh: true },
  });
}

/** Ways to play: the switches really change the preview */
function ways() {
  const mini = $("#mini");
  for (const b of $$<HTMLButtonElement>(".toggles button")) {
    b.addEventListener("click", () => {
      const on = b.getAttribute("aria-pressed") !== "true";
      const way = b.dataset.way!;
      if (way === "read") {
        // the device's own voice (nothing is sent anywhere), like read-aloud before Gloam's voice is set up
        speechSynthesis.cancel();
        if (on) {
          const u = new SpeechSynthesisUtterance($(".mini-say").textContent ?? "");
          u.onend = () => b.setAttribute("aria-pressed", "false");
          speechSynthesis.speak(u);
        }
      } else mini.classList.toggle(`is-${way}`, on);
      b.setAttribute("aria-pressed", String(on));
    });
  }
}
