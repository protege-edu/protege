/** Where a device keeps its "Ways to play" (lib/access/store.ts) */
export const ACCESS_KEY = "protege.access";

/**
 * Inline script for <head> (app/layout.tsx): applies the saved look before the first paint, so bigger
 * text or high contrast never flashes in late. Tiny and dependency-free; mirrors applyAccess() in store.ts.
 */
export const ACCESS_BOOT = `try{var a=JSON.parse(localStorage.getItem(${JSON.stringify(ACCESS_KEY)})||"{}"),d=document.documentElement.dataset;d.text=String(a.text||0);if(a.contrast)d.contrast="more";d.reading=a.reading||"normal";if(a.calm)d.motion="calm"}catch(e){}`;
