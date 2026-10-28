/**
 * The homepage, as a film in acts (site/js/home.ts plays it), in either language (every word comes from
 * site/i18n.ts). Everything here is real HTML first: with no JavaScript, or with reduced motion, every beat
 * simply shows, in order.
 *
 *   Act I    the story: one pinned scene. The words on the left; Gloam on the right gets it wrong, is taught,
 *            and gets it (the lantern ignites and its light rolls across the valley). Then it's your turn.
 *   Act II   the teacher's desk: a laptop whose screen follows the steps, with Gloam peeking over it
 *   Act III  every grade: walk through the four painted worlds, each with its own Gloam
 *   Act IV   nothing leaves the laptop (Gloam guards it)
 *   Act V    ways to play, live
 *   Finale   dawn, and the download
 */
import type { SiteCopy } from "../i18n";
import { linesFor } from "../js/lines";

export interface Links {
  windows: string;
  mac: string;
  windowsZip: string;
  macZip: string;
  repo: string;
}

/** A candle, as in the app: unlit, smoldering, flickering or steady (steady is gold: understood) */
export const candle = (state: "unlit" | "smolder" | "flicker" | "steady", label?: string) =>
  `<span class="candle is-${state}"${label ? ` role="img" aria-label="${label}"` : ' aria-hidden="true"'}><svg viewBox="0 0 20 34"><path class="flame" d="M10 2c3 5 5.5 7.5 5.5 11a5.5 5.5 0 0 1-11 0C4.5 9.5 7 7 10 2z"/><rect class="wax" x="5" y="18" width="10" height="15" rx="2"/></svg></span>`;

/** A little lantern (the chapter trail) */
const lantern = `<svg viewBox="0 0 20 30" aria-hidden="true"><path class="hook" d="M10 1v5"/><rect class="cap" x="5" y="6" width="10" height="3" rx="1"/><ellipse class="glass" cx="10" cy="17" rx="7" ry="8"/><rect class="cap" x="6" y="25" width="8" height="3" rx="1"/></svg>`;

// pretend students (nicknames, as in Protégé) and their candles for each idea
const students: [string, ("unlit" | "smolder" | "flicker" | "steady")[]][] = [
  ["Moss Otter", ["steady", "steady", "flicker", "smolder"]],
  ["Comet", ["steady", "flicker", "flicker", "unlit"]],
  ["Pixel Fern", ["flicker", "smolder", "unlit", "unlit"]],
  ["Bluejay", ["steady", "steady", "steady", "flicker"]],
  ["Quiet Storm", ["smolder", "unlit", "unlit", "unlit"]],
  ["Noodle", ["steady", "flicker", "smolder", "smolder"]],
];

// where each world's camera starts and stops along its painted journey (its best stretch), as a share of its width
const WORLDS = [
  { age: "little", from: 0.12, to: 0.3 },
  { age: "junior", from: 0.31, to: 0.37 },
  { age: "middle", from: 0.14, to: 0.24 },
  { age: "senior", from: 0.06, to: 0.2 },
] as const;

/** Words as separate pieces (so they can ink in one by one); screen readers still read one sentence */
const inked = (text: string) =>
  text
    .split(" ")
    .map((w) => `<span class="w">${w}</span>`)
    .join(" ");

/** `up`: the way back to the site's root from this page ("" or "../") */
export function homeBody(l: Links, bar: string, t: SiteCopy, up: string): string {
  const s = t.story;
  const lines = linesFor(t.lang);
  const valley = (k: number, lit: boolean) => `<img class="layer" data-depth="${k}" src="${up}art/senior/valley-${k}-${lit ? "lit" : "dark"}.webp" alt="">`;
  const worldLayers = (age: string) => [0, 1, 2, 3].map((k) => `<img class="w-layer" data-depth="${k}" src="${up}art/${age}/journey-${k}-lit.webp" alt="" loading="lazy">`).join("");
  const chapters: [string, string][] = [
    ["story", t.trail.story],
    ["turn", t.trail.turn],
    ["teachers", t.trail.desk],
    ["worlds", t.trail.grades],
    ["private", t.trail.privacy],
    ["download", t.trail.get],
  ];
  return `
<div class="stage" id="stage" aria-hidden="true">
  <div class="camera">
    <div class="layers">${[0, 1, 2, 3].map((k) => valley(k, false)).join("")}</div>
    <div class="layers lit-layers">${[0, 1, 2, 3].map((k) => valley(k, true)).join("")}</div>
    <div class="light-ring"></div>
    <div class="mist"></div>
  </div>
  <div class="dawn"></div>
  <div class="shade"></div>
  <img class="gloam-still" src="${up}img/gloam-confused.webp" alt="">
  <div class="gloam-canvas"></div>
  <div class="sparks"></div>
</div>
<div class="bubble" id="bubble" hidden><p class="voice" id="say" aria-live="polite"></p></div>
<button class="poke" id="poke" type="button" aria-label="${t.lang === "fr" ? "Taquiner Gloam" : "Poke Gloam"}" hidden></button>
<nav class="trail" id="trail" aria-label="${t.trail.label}" hidden>
  ${chapters.map(([id, label]) => `<a href="#${id}" data-to="${id}"><span class="sr-only">${label}</span><span class="tip" aria-hidden="true">${label}</span>${lantern}</a>`).join("")}
</nav>

${bar}

<main id="main">
<section class="story" id="story" aria-label="${s.label}">
  <div class="story-pin">
    <div class="beats">
      <div class="beat is-on" data-beat="hero">
        <h1 class="voice">${inked(s.h1)}</h1>
        <p class="lede">${s.lede}</p>
        <div class="buttons">
          <a class="btn primary" data-download href="${l.windows}">${t.download.generic}</a>
          <a class="btn quiet" href="#story-wrong">${s.watch}</a>
        </div>
        <p class="small" data-download-note>${s.note}</p>
        <p class="say-static voice" aria-hidden="true">${lines.theory}</p>
      </div>
      <div class="beat" data-beat="wrong" id="story-wrong">
        <h2 class="voice">${s.wrongH}</h2>
        <p class="lede">${s.wrongP}</p>
      </div>
      <div class="beat" data-beat="teach">
        <h2 class="voice">${s.teachH}</h2>
        <p class="lede">${s.teachP}</p>
      </div>
      <div class="beat" data-beat="eureka">
        <h2 class="voice">${s.clickH}</h2>
        <p class="got">${candle("steady")} <span>${s.got}</span></p>
        <p class="lede">${s.clickP}</p>
      </div>
      <div class="beat" data-beat="turn" id="turn">
        <h2 class="voice">${s.turnH}</h2>
        <p class="lede">${s.turnQ} <span class="voice theory">${s.turnTheory}</span></p>
        <div class="choices" role="group" aria-label="${s.choicesLabel}">
          <button type="button" data-choice="wrong"><span>${s.choices.wrong}</span></button>
          <button type="button" data-choice="half"><span>${s.choices.half}</span></button>
          <button type="button" data-choice="right"><span>${s.choices.right}</span></button>
        </div>
        <div class="result" aria-live="polite"><p class="reply voice"></p><p class="note">${s.preview}</p></div>
      </div>
    </div>
    <div class="teachbox" role="group" aria-label="${s.teachLabel}">
      <p class="typed" id="explain">${s.explain}</p>
      <span class="send" aria-hidden="true">${s.send}</span>
    </div>
  </div>
</section>

<section class="desk" id="teachers" aria-labelledby="desk-title">
  <div class="desk-pin">
    <div class="wrap desk-grid">
      <div class="desk-words">
        <h2 id="desk-title" class="desk-title voice">${t.desk.title}</h2>
        <div class="d-steps">
          ${t.desk.steps.map((st, i) => `<div class="d-beat${i === 0 ? " is-on" : ""}" data-step="${i}"><h3>${st.h}</h3><p>${st.p}</p></div>`).join("\n          ")}
        </div>
      </div>
      <div class="laptop">
        <img class="peeker" src="${up}img/gloam-curious.webp" alt="" width="220" height="276" loading="lazy">
        <div class="lid">
          <div class="lap-screen">
            <div class="chrome" aria-hidden="true"><i></i><i></i><i></i><span>protégé · localhost:3000/teacher</span></div>
            <div class="views">
              <div class="d-screen is-on" data-step="0">
                <div class="notes"><p class="nhead">${t.desk.notesHead}</p><p class="typed" data-type="${t.desk.notes}">${t.desk.notes}</p></div>
                <div class="drafted"><p class="dhead">${t.desk.draftHead}</p><ol>${t.desk.ideas.map((i) => `<li>${candle("unlit")} ${i}</li>`).join("")}</ol><p class="mistake">${t.desk.mistake}</p></div>
              </div>
              <div class="d-screen" data-step="1"><img src="${up}img/review.webp" width="1366" height="768" alt="${t.desk.reviewAlt}" loading="lazy"><span class="cursor" aria-hidden="true"></span></div>
              <div class="d-screen" data-step="2">
                <table class="class">
                  <caption class="sr-only">${t.desk.tableCaption}</caption>
                  <thead><tr><th scope="col">${t.desk.student}</th>${t.desk.ideas.map((i) => `<th scope="col">${i}</th>`).join("")}</tr></thead>
                  <tbody>${students.map(([n, c]) => `<tr><th scope="row">${n}</th>${c.map((st, i) => `<td>${candle(st, `${t.desk.ideas[i]}: ${t.desk.levels[st]}`)}</td>`).join("")}</tr>`).join("")}</tbody>
                </table>
                <p class="thinks">${t.desk.thinks}</p>
              </div>
            </div>
          </div>
        </div>
        <div class="deck" aria-hidden="true"></div>
      </div>
    </div>
  </div>
</section>

<section class="worlds" id="worlds" aria-labelledby="worlds-title">
  <div class="worlds-pin">
    ${WORLDS.map(
      (w, i) => `<figure class="world${i === 0 ? " is-on" : ""}" data-world="${i}" data-from="${w.from}" data-to="${w.to}">
      <div class="w-layers">${worldLayers(w.age)}</div>
      <img class="w-gloam" src="${up}img/gloam-${w.age}.webp" alt="" loading="lazy">
      <figcaption><b class="voice">${t.worlds.list[w.age].grade}</b> <span>${t.worlds.list[w.age].line}</span></figcaption>
    </figure>`,
    ).join("")}
    <div class="seam" aria-hidden="true"></div>
    <div class="worlds-head"><div class="wrap"><h2 id="worlds-title" class="voice">${t.worlds.title}</h2><p class="lede">${t.worlds.lede}</p></div></div>
  </div>
</section>

<section class="private" id="private" aria-labelledby="private-title">
  <div class="wrap">
    <div class="words">
      <h2 id="private-title" class="voice">${t.private.title}</h2>
      <p class="nosy voice">“${lines.nosy}” <span>Gloam</span></p>
      <ul class="plain">${t.private.points.map(([b, rest]) => `<li><b>${b}</b> ${rest}</li>`).join("")}</ul>
      <a class="btn quiet" href="privacy.html">${t.private.more}</a>
    </div>
    <svg class="net" viewBox="0 0 520 420" role="img" aria-label="${t.private.diagram}">
      <g class="cloud"><path d="M396 64a28 28 0 0 1 54-8 22 22 0 0 1 28 30h-96a20 20 0 0 1 14-22z"/><text x="437" y="112">${t.private.internet}</text></g>
      <path class="leak" id="leak" d="M262 190 Q 330 120 420 92"/>
      ${[
        [90, 110],
        [70, 250],
        [150, 360],
        [372, 372],
        [262, 392],
      ]
        .map(([x, y]) => `<path class="thread" d="M${x} ${y} Q ${(x + 260) / 2} ${(y + 220) / 2 - 30} 260 220"/><g class="book" transform="translate(${x - 26} ${y - 18})"><rect width="52" height="34" rx="4"/><rect class="screen" x="5" y="5" width="42" height="22" rx="2"/></g>`)
        .join("")}
      <g class="laptop-icon" transform="translate(212 186)"><rect width="96" height="62" rx="6"/><rect class="screen" x="8" y="8" width="80" height="46" rx="3"/><path d="M-12 66h120l-8 10H-4z"/></g>
      <text class="lbl" x="260" y="290">${t.private.laptop}</text>
    </svg>
    <figure class="guard-still" aria-hidden="true"><img src="${up}img/gloam-proud.webp" alt="" width="220" height="276" loading="lazy"><figcaption class="voice">${lines.nosy}</figcaption></figure>
  </div>
</section>

<section class="ways paper" id="ways" aria-labelledby="ways-title">
  <div class="wrap">
    <div class="words">
      <h2 id="ways-title" class="voice">${t.ways.title}</h2>
      <p class="lede">${t.ways.lede}</p>
      <div class="toggles" role="group" aria-label="${t.ways.label}">
        ${(["big", "contrast", "space", "read"] as const).map((w) => `<button type="button" aria-pressed="false" data-way="${w}">${t.ways.toggles[w]}</button>`).join("\n        ")}
      </div>
      <p class="small">${t.ways.also}</p>
      <a class="btn quiet" href="${up}board/accessibility.html">${t.ways.checked}</a>
    </div>
    <figure class="mini" id="mini" aria-label="${t.ways.preview}">
      <div class="mini-stage"><img class="mini-gloam" src="${up}img/gloam-curious.webp" alt="" width="220" height="276"></div>
      <p class="mini-say voice">${lines.mini}</p>
      <div class="mini-box"><span>${t.ways.box}</span><b>${s.send}</b></div>
    </figure>
  </div>
</section>

<section class="get" id="download" aria-labelledby="get-title">
  <div class="wrap get-wrap">
    <h2 id="get-title" class="voice">${t.get.title}</h2>
    <img class="get-gloam" src="${up}img/gloam-proud.webp" alt="" width="220" height="276" loading="lazy">
    <p class="lede">${t.get.lede}</p>
    <div class="buttons">
      <a class="btn primary big" data-download href="${l.windows}">${t.download.generic}</a>
    </div>
    <p class="small" data-download-note>${t.get.note}</p>
    <ol class="how">${t.get.steps
      .map(([b, rest]) => `<li><b>${b}</b> ${typeof rest === "string" ? rest : `<span data-os-only="windows">${rest.windows}</span><span data-os-only="mac">${rest.mac}</span>`}</li>`)
      .join("")}</ol>
    <p class="others">${t.get.others({ ...l, guide: "guide.html" })}</p>
  </div>
</section>

<section class="boards paper" id="boards" aria-labelledby="boards-title">
  <div class="wrap">
    <h2 id="boards-title" class="voice">${t.boards.title}</h2>
    <p class="lede">${t.boards.lede}</p>
    <ul class="docs">${t.boards.docs.map(([file, name, about]) => `<li><a href="${up}board/${file}.html">${name}</a><span>${about}</span></li>`).join("")}</ul>
  </div>
</section>
</main>`;
}
