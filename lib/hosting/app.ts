import { SITE_URL } from "./site";

/**
 * Where the Protégé app itself lives online (students and teachers use it there; the public website,
 * protege-edu.pages.dev, sends students to it). On Vercel this is known automatically; PROTEGE_APP_URL
 * overrides it (e.g. a school's own address). On this computer while developing: null.
 */
export function appUrl(): string | null {
  if (process.env.PROTEGE_APP_URL) return process.env.PROTEGE_APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_ENV === "production" && process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return null;
}

/**
 * Where students go to join a class: the website's join page (site: SITE_URL/j, short and the same every
 * year), which sends them on to the app (app). While developing, the app is wherever the teacher is.
 */
export function joinPlaces(request: Request): { site: string; app: string } {
  return { site: SITE_URL, app: appUrl() ?? new URL(request.url).origin };
}
