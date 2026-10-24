import { chromium } from "@playwright/test";
const b = await chromium.launch();
for (const [name, w, h] of [["chromebook", 1366, 768], ["phone", 390, 844]] as const) {
  const ctx = await b.newContext({ viewport: { width: w, height: h } });
  const p = await ctx.newPage();
  const errs: string[] = [];
  p.on("pageerror", (e) => errs.push(e.message));
  p.on("console", (m) => m.type() === "error" && errs.push(m.text().slice(0, 300)));
  await p.goto("http://localhost:3100/", { waitUntil: "load" });
  await p.waitForTimeout(3500);
  await p.screenshot({ path: `screenshots/v2-title-${name}.png` });
  await p.getByRole("button", { name: /start teaching|continue/i }).click();
  await p.waitForTimeout(2500);
  await p.screenshot({ path: `screenshots/v2-intro-${name}.png` });
  await p.getByRole("button", { name: "Skip intro" }).click();
  await p.waitForTimeout(3500);
  await p.screenshot({ path: `screenshots/v2-teach-${name}.png` });
  console.log(name, errs.slice(0, 4).join("\n") || "no errors");
  await ctx.close();
}
await b.close();
