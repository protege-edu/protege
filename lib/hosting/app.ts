/**
 * Where Protégé lives online: one address for everything (the website, /j where students type the class
 * code, /teacher, and the app itself). On Vercel this is known automatically; PROTEGE_APP_URL overrides it
 * (e.g. a school's own address). On this computer while developing: null.
 */
export function appUrl(): string | null {
  if (process.env.PROTEGE_APP_URL) return process.env.PROTEGE_APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_ENV === "production" && process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return null;
}

/** Where students go to join a class (APP/j, short and the same every year). While developing: wherever the teacher is. */
export function joinPlaces(request: Request): { app: string } {
  return { app: appUrl() ?? new URL(request.url).origin };
}
