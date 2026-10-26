/**
 * How smooth is the game on a slow computer? Opens the teach screen with the CPU slowed down
 * (like a cheap Chromebook), counts frames for a few seconds, and reports frames per second.
 *
 *   npx tsx scripts/perf.ts                 4x slower CPU (default)
 *   npx tsx scripts/perf.ts --rate 6        6x slower
 * The app must be running (APP_URL, default http://localhost:3000).
 */
import { chromium } from "@playwright/test";

const BASE = process.env.APP_URL ?? "http://localhost:3000";
const i = process.argv.indexOf("--rate");
const rate = i >= 0 ? Number(process.argv[i + 1]) : 4;

async function main() {
  // use the real graphics card (headless browsers otherwise draw WebGL in software, which no Chromebook does)
  const browser = await chromium.launch({ args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=default"] });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const cdp = await page.context().newCDPSession(page);
  await page.goto(BASE, { waitUntil: "load" });
  await page.getByRole("button", { name: /^(start teaching|continue)$/i }).click({ timeout: 120_000 });
  const skip = page.getByRole("button", { name: /skip intro/i });
  if (await skip.count()) await skip.click();
  await page.waitForTimeout(3000);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate });
  await page.waitForTimeout(2000);
  // (plain text, so the compiler can't add helpers the browser doesn't have)
  const result = (await page.evaluate(`new Promise((resolve) => {
    let frames = 0, worst = 0, last = performance.now();
    const start = last;
    function tick(now) {
      worst = Math.max(worst, now - last);
      last = now;
      frames++;
      if (now - start < 5000) requestAnimationFrame(tick);
      else resolve({ fps: (frames * 1000) / (now - start), worst });
    }
    requestAnimationFrame(tick);
  })`)) as { fps: number; worst: number };
  const gpu = await page.evaluate(`(() => { const gl = document.createElement("canvas").getContext("webgl"); const i = gl && gl.getExtension("WEBGL_debug_renderer_info"); return i ? gl.getParameter(i.UNMASKED_RENDERER_WEBGL) : "unknown"; })()`);
  console.log(`renderer: ${gpu}`);
  console.log(`CPU ${rate}x slower: ${result.fps.toFixed(1)} fps, slowest frame ${result.worst.toFixed(0)} ms`);
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
