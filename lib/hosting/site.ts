/**
 * The public website, where students type their join code (/j) and where classes online have their room
 * (functions/api/room). One setting: a school that runs its own copy of the website points this at it.
 */
export const SITE_URL = (process.env.PROTEGE_SITE_URL ?? "https://protege-edu.pages.dev").replace(/\/$/, "");
