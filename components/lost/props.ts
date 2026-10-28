/**
 * The hiding spots, as dark shapes in the foreground (so they suit every world's painting): lit from above
 * by the moon, with a rim of moonlight that only shows when the light is on them. Plain SVG strings: the
 * app and the website both use them.
 */
const shade = (id: string) =>
  `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a3f3a"/><stop offset="0.45" stop-color="#12201c"/><stop offset="1" stop-color="#060c0a"/></linearGradient></defs>`;

export const PROPS = {
  rock: `<svg class="lost-prop" viewBox="0 0 120 70" aria-hidden="true">${shade("lost-rock")}<ellipse class="shadow" cx="60" cy="67" rx="58" ry="4"/><path fill="url(#lost-rock)" d="M3 66c1-14 8-27 20-36 6-5 9-12 18-15 9-4 18-1 26-3 12-2 23 4 31 13 9 10 15 24 19 41z"/><path class="facet" d="M41 15c-3 11 1 25 13 33 9 6 13 12 13 18M67 12c6 9 7 18 3 27"/><path class="rim" d="M8 52c3-9 8-16 15-22 6-5 9-12 18-15 9-4 18-1 26-3 12-2 22 3 30 12"/></svg>`,
  bush: `<svg class="lost-prop" viewBox="0 0 150 100" aria-hidden="true">${shade("lost-bush")}<ellipse class="shadow" cx="75" cy="97" rx="72" ry="4"/><path fill="url(#lost-bush)" d="M6 96c-4-12 0-24 10-28-2-11 6-20 16-19 1-13 13-21 24-16 5-12 20-17 31-9 10-8 26-4 30 9 12-2 22 8 20 20 10 4 13 17 7 26 4 6 4 12 1 17z"/><path class="facet" d="M32 49c3 8 10 12 18 12m6-27c2 10 8 16 17 18m14-27c-1 9 3 17 11 21m19-8c-2 9 2 17 10 19"/><path class="rim" d="M16 68c-2-11 6-20 16-19 1-13 13-21 24-16 5-12 20-17 31-9 10-8 26-4 30 9 12-2 22 8 20 20"/><path class="leaf" d="M24 50l-7-6m40-17l-3-9m33 1l4-9m25 9l8-5m14 26l9 1"/></svg>`,
  sign: `<svg class="lost-prop" viewBox="0 0 84 156" aria-hidden="true">${shade("lost-sign")}<ellipse class="shadow" cx="40" cy="153" rx="22" ry="3"/><path fill="url(#lost-sign)" d="M36 28l9-1 2 126h-12zM5 18l55-7 15 13-13 16-56 4zM78 62l-52 1-16 11 15 13 53-1z"/><path class="facet" d="M12 26l46-5M14 35l44-3M70 70l-42 1M70 79l-42 1"/><path class="rim" d="M6 18l54-7 14 12M77 62l-51 1-15 10M36 28l9-1"/></svg>`,
} as const;
