/**
 * Screenshots the app so we can critique the UI like a picky design director.
 *
 *   npx tsx scripts/screenshot.ts                 (app must be running, default http://localhost:3100)
 *   npx tsx scripts/screenshot.ts --teach "its because of the tilt"   (also sends a message)
 *   npx tsx scripts/screenshot.ts --reduced       (prefers-reduced-motion)
 */
import { chromium } from "@playwright/test";
import fs from "node:fs";

const BASE = process.env.APP_URL ?? "http://localhost:3100";
const args = process.argv.slice(2);
const flag = (name: string) => args.includes(name);
const value = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

const VIEWPORTS = [
  { name: "chromebook", width: 1366, height: 768 },
  { name: "desktop", width: 1920, height: 1080 },
  { name: "phone", width: 390, height: 844 },
];

async function main() {
  fs.mkdirSync("screenshots", { recursive: true });
  const only = value("--only");
  const teach = value("--teach");
  const tag = value("--tag") ?? (teach ? "teach" : "start");
  const browser = await chromium.launch();

  for (const vp of VIEWPORTS.filter((v) => !only || v.name === only)) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      reducedMotion: flag("--reduced") ? "reduce" : "no-preference",
      hasTouch: vp.name === "phone",
    });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(e.message));

    await page.goto(BASE, { waitUntil: "load" });
    await page.waitForTimeout(3500);

    if (teach) {
      await page.getByLabel("Explain it to Gloam").fill(teach);
      await page.getByRole("button", { name: "Teach Gloam" }).click();
      await page.waitForTimeout(Number(value("--mid") ?? 1500));
      await page.screenshot({ path: `screenshots/${tag}-thinking-${vp.name}.png` });
      await page.waitForFunction(() => !document.body.innerText.includes("Gloam\n") || true);
      await page.getByRole("button", { name: "Teach Gloam" }).waitFor();
      await page.waitForFunction(() => !(document.querySelector("#teach") as HTMLTextAreaElement)?.disabled, null, { timeout: 90_000 });
      await page.waitForTimeout(Number(value("--after") ?? 4000));
    }

    const file = `screenshots/${tag}-${vp.name}${flag("--reduced") ? "-reduced" : ""}.png`;
    await page.screenshot({ path: file });
    console.log(`saved ${file}${errors.length ? `\n  console errors:\n  - ${errors.join("\n  - ")}` : ""}`);
    await context.close();
  }
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
