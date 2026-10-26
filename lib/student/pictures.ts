/** The pictures a secret key is made from (painted in public/art/keys, shown by components/join/KeyPad.tsx) */
export const PICTURES = ["moon", "fern", "lantern", "owl", "star", "mushroom", "leaf", "moth", "stone"] as const;
export type Picture = (typeof PICTURES)[number];

/** Little kids (K–2) remember 2 pictures; everyone else 3 */
export const keySize = (grade: number) => (grade <= 2 ? 2 : 3);
