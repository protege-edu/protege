/**
 * Plays the start of a lesson with the KEYBOARD ONLY (Tab, Enter, Escape) and reports what has focus
 * at every step, so we know nobody needs a mouse. Saves a screenshot of each step's focus ring.
 *
 *   npx tsx scripts/keyboard.ts          (the app must be running; APP_URL, default http://localhost:3000)
 */
import { chromium, type Page } from "@playwright/test";

const BASE = process.env.APP_URL ?? "http://localhost:3000";

async function focused(page: Page) {
  return page.evaluate(`(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return "(nothing)";
    const label = el.getAttribute("aria-label") || el.textContent?.trim().slice(0, 40) || el.getAttribute("placeholder") || el.id;
    return el.tagName.toLowerCase() + ": " + label;
  })()`) as Promise<string>;
}

async function main() {
  const browser = await chromium.launch({ args: ["--enable-gpu", "--ignore-gpu-blocklist"] });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const log: string[] = [];
  const note = async (what: string, shot?: string) => {
    log.push(`${what.padEnd(34)} -> ${await focused(page)}`);
    if (shot) await page.screenshot({ path: `screenshots/kbd-${shot}.png` });
  };
  await page.goto(BASE, { waitUntil: "load" });
  await page.getByRole("button", { name: /^(start teaching|continue)$/i }).waitFor({ timeout: 120_000 });
  await page.waitForTimeout(1500);
  await note("title opens", "title");
  await page.keyboard.press("Tab");
  await note("Tab");
  await page.keyboard.press("Shift+Tab");
  await note("Shift+Tab");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(1200);
  await note("Enter (start)", "intro");
  for (let i = 0; i < 6; i++) {
    const phase = await page.locator("[data-phase]").getAttribute("data-phase");
    if (phase !== "intro") break;
    await page.keyboard.press("Enter");
    await page.waitForTimeout(700);
  }
  await note("Enter through the intro", "teach");
  await page.keyboard.type("its the tilt");
  await note("type an explanation");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(800);
  await note("Escape (pause)", "pause");
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press("Tab");
    await note(`Tab ${i + 1} in the pause menu`);
  }
  await page.keyboard.press("Escape");
  await page.waitForTimeout(800);
  await note("Escape (resume)");
  console.log(log.join("\n"));
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
