/**
 * Screenshots the app so we can critique the UI like a picky design director.
 * The app must be running (default http://localhost:3000, or set APP_URL).
 *
 *   npx tsx scripts/screenshot.ts                     start of a lesson (intro), all screen sizes
 *   npx tsx scripts/screenshot.ts --only chromebook   one screen size
 *   npx tsx scripts/screenshot.ts --reduced           with prefers-reduced-motion
 *   npx tsx scripts/screenshot.ts --play "msg one" "msg two" ...
 *       skips the intro, teaches Gloam each message, and screenshots every step
 *       (thinking, the eureka moment if one happens, and the reply)
 */
import { chromium, type Page } from "@playwright/test";
import fs from "node:fs";

const BASE = process.env.APP_URL ?? "http://localhost:3000";
const args = process.argv.slice(2);
const flag = (name: string) => args.includes(name);
const value = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const playIndex = args.indexOf("--play");
const messages = playIndex >= 0 ? args.slice(playIndex + 1).filter((a) => !a.startsWith("--")) : [];

const VIEWPORTS = [
  { name: "chromebook", width: 1366, height: 768 },
  { name: "desktop", width: 1920, height: 1080 },
  { name: "phone", width: 390, height: 844 },
];

const status = (page: Page) => page.locator("[data-screen]").getAttribute("data-screen");

async function waitForStatus(page: Page, want: string[], timeout = 240_000) {
  await page.waitForFunction(
    (w) => w.includes(document.querySelector("[data-screen]")?.getAttribute("data-screen") ?? ""),
    want,
    { timeout, polling: 100 },
  );
}

async function main() {
  fs.mkdirSync("screenshots", { recursive: true });
  const only = value("--only");
  const suffix = flag("--reduced") ? "-reduced" : "";
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
    const shot = async (name: string) => {
      const file = `screenshots/${name}-${vp.name}${suffix}.png`;
      await page.screenshot({ path: file });
      console.log(`saved ${file}`);
    };

    await page.goto(BASE, { waitUntil: "load" });
    await page.waitForTimeout(2500);
    await shot("01-intro");

    if (messages.length) {
      await page.getByRole("button", { name: "Skip intro" }).click();
      await waitForStatus(page, ["ready", "offline"]);
      await page.waitForTimeout(1500);
      await shot("02-ready");

      for (const [n, msg] of messages.entries()) {
        const step = String(n + 1).padStart(2, "0");
        await page.getByLabel("Explain it to Gloam").fill(msg);
        await page.getByRole("button", { name: "Teach Gloam", exact: true }).click();
        await page.waitForTimeout(1200);
        await shot(`t${step}-a-thinking`);
        await waitForStatus(page, ["ready", "moment", "offline"]);
        if ((await status(page)) === "moment") {
          await page.waitForTimeout(900);
          await shot(`t${step}-b-eureka`);
          await waitForStatus(page, ["ready", "offline"]);
        }
        await page.waitForTimeout(2200);
        await shot(`t${step}-c-reply`);
        console.log(`  turn ${step}: ${await status(page)}`);
      }
    }
    const recap = page.getByRole("heading", { name: "What you taught Gloam" });
    if (await recap.count()) {
      await recap.scrollIntoViewIfNeeded();
      await page.waitForTimeout(600);
      await shot("99-recap");
    }
    if (errors.length) console.log(`  console errors:\n  - ${errors.join("\n  - ")}`);
    await context.close();
  }
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
