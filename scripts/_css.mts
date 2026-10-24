import { chromium } from "@playwright/test";
const b = await chromium.launch();
const p = await b.newPage();
await p.goto("http://localhost:3100/", { waitUntil: "load" });
await p.waitForTimeout(2000);
console.log(await p.evaluate(() => {
  const el = document.querySelector('[data-age-style="senior"]')!;
  const cs = getComputedStyle(el);
  const rules: string[] = [];
  for (const sheet of [...document.styleSheets]) { try { for (const r of [...sheet.cssRules]) { const t = r.cssText; if (t.includes("data-age-style")) rules.push(t.slice(0, 160)); } } catch {} }
  return JSON.stringify({ tpanel: cs.getPropertyValue("--t-panel"), tvoice: cs.getPropertyValue("--t-voice-font"), rules }, null, 1);
}));
await b.close();
