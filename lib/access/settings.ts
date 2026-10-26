import { z } from "zod";
import type { AgeStyle } from "@/lib/age-styles/types";

/**
 * "Ways to play": how a student likes Protégé set up (voice typing, read-aloud, bigger text,
 * high contrast, easier reading, less motion, sound). Saved on the student's account so it follows
 * them to any Chromebook, and on the device for practice. A teacher can switch these on for a student.
 *
 * Privacy: these can hint at a disability, so they live only on the student's own record. They never
 * appear in class summaries, exports or anything aggregated.
 */
export const Access = z.object({
  /** show the microphone: talk instead of type */
  voice: z.boolean(),
  /** read Gloam's words aloud: never, with a button, or every line by itself */
  readAloud: z.enum(["off", "button", "auto"]),
  /** 0 normal, 1 bigger, 2 biggest (everything grows with it, like zooming in) */
  text: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  /** solid backgrounds, stronger lines, darker words */
  contrast: z.boolean(),
  /** more space between letters, words and lines, or a dyslexia-friendly font */
  reading: z.enum(["normal", "spaced", "dyslexic"]),
  /** less motion, even if the device doesn't ask for it */
  calm: z.boolean(),
  sound: z.boolean(),
});
export type Access = z.infer<typeof Access>;

/** A change to some of the settings (what the panel, and a teacher, send) */
export const AccessPatch = Access.partial().strict();
export type AccessPatch = z.infer<typeof AccessPatch>;

/** What each age starts with: read-aloud and the mic are on for younger kids, everything else off */
export function defaultAccess(style: Pick<AgeStyle, "input">): Access {
  return {
    voice: style.input.modes.includes("voice"),
    readAloud: style.input.readAloud ? "button" : "off",
    text: 0,
    contrast: false,
    reading: "normal",
    calm: false,
    sound: false,
  };
}

/** Saved settings, made safe: anything unknown or broken is dropped, so an old or edited value can't break a page */
export function cleanAccess(raw: unknown): AccessPatch {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, unknown> = {};
  for (const [k, schema] of Object.entries(Access.shape)) {
    const v = (raw as Record<string, unknown>)[k];
    if (v !== undefined && schema.safeParse(v).success) out[k] = v;
  }
  return out as AccessPatch;
}
