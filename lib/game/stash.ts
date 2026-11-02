/**
 * Gloam's stash: things a student buys with fireflies to put around Gloam's home (/me).
 * Painted props (art/prompts.py STASH): a moonlit set for the high school valley, a daylight set for the
 * younger worlds. Fireflies only come from teaching well, so this is a reward for teaching, never a store
 * that costs anything real. `side`: which side of Gloam it prefers; `size`: its height compared with Gloam's;
 * `aspect`: its painting's width / height (to pack them side by side without overlapping).
 */
export const STASH = [
  { id: "books", price: 25, side: -1, size: 0.42, aspect: 1.24 },
  { id: "stool", price: 40, side: 1, size: 0.5, aspect: 0.8 },
  { id: "kite", price: 60, side: -1, size: 0.95, aspect: 0.7 },
  { id: "telescope", price: 90, side: -1, size: 0.85, aspect: 0.45 },
  { id: "tent", price: 150, side: 1, size: 0.8, aspect: 1.05 },
] as const;
export type StashId = (typeof STASH)[number]["id"];

/**
 * Things Gloam wears (drawn on it in code, so they move with it: components/gloam/rig/outfit.ts). It can wear
 * all of them at once. A Gloam whose painting already has a scarf (grades 6-8) doesn't get another.
 */
export const OUTFIT_SHOP = [
  { id: "glasses", price: 30 },
  { id: "scarf", price: 45 },
  { id: "beanie", price: 70 },
  { id: "cape", price: 110 },
] as const;
export type OutfitId = (typeof OUTFIT_SHOP)[number]["id"];
export const isOutfit = (id: string): id is OutfitId => OUTFIT_SHOP.some((o) => o.id === id);
/** How many stand around Gloam at once (there's room for about three beside it, even on a laptop) */
export const MAX_OUT = 3;
export const stashItem = (id: string): { id: string; price: number } | null => STASH.find((s) => s.id === id) ?? OUTFIT_SHOP.find((o) => o.id === id) ?? null;

/** The painting for an item in an age style's world (night for high school, daylight for the younger ones) */
export const stashArt = (id: StashId, age: string) => `/art/stash/${age === "senior" ? "night" : "day"}-${id}.webp`;

/** Can this student buy it? (pure: the server checks again, all at once, when it spends them) */
export function canBuy(id: string, jar: number, owned: string[]): "ok" | "unknown" | "owned" | "short" {
  const item = stashItem(id);
  if (!item) return "unknown";
  if (owned.includes(id)) return "owned";
  return jar >= item.price ? "ok" : "short";
}
