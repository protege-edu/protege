/**
 * The public website (Cloudflare Pages), where students type their class code (/j). One setting: a school
 * that runs its own copy of the website points this at it.
 */
export const SITE_URL = (process.env.PROTEGE_SITE_URL ?? "https://protege-edu.pages.dev").replace(/\/$/, "");
