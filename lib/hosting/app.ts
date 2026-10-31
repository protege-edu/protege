/**
 * Where the Protégé app itself lives online (students and teachers use it there; the public website,
 * protege-edu.pages.dev, only links to it). On Vercel this is known automatically; PROTEGE_APP_URL
 * overrides it (e.g. a school's own address). On this computer while developing: null.
 */
export function appUrl(): string | null {
  if (process.env.PROTEGE_APP_URL) return process.env.PROTEGE_APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_ENV === "production" && process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return null;
}
