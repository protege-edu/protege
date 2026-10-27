/**
 * Makes the website's pictures of Gloam from the real animated rig, so the site and the app always match:
 *   site/img/gloam-<mood>.webp   Gloam cut out (transparent), for computers that can't animate it and for the
 *                                reading pages' margins
 *   site/img/setup.webp          the first-run setup page (needs the dev server started with a setup demo: see
 *                                the README, "The website")
 *
 *   npx tsx scripts/site-art.ts [http://localhost:3000] [--setup]
 */
import fs from "node:fs";
import path from "node:path";
import { chromium, type Page } from "playwright";

const root = process.cwd();
const dev = process.argv.find((a) => a.startsWith("http")) ?? "http://localhost:3000";
const img = path.join(root, "site", "img");

/** A PNG screenshot as WebP (with its transparency), encoded by the browser */
async function webp(page: Page, png: Buffer, quality = 0.86): Promise<Buffer> {
  const data = await page.evaluate(
    async ({ b64, q }) => {
      const im = new Image();
      im.src = `data:image/png;base64,${b64}`;
      await im.decode();
      const c = document.createElement("canvas");
      c.width = im.width;
      c.height = im.height;
      c.getContext("2d")!.drawImage(im, 0, 0);
      return c.toDataURL("image/webp", q).split(",")[1];
    },
    { b64: png.toString("base64"), q: quality },
  );
  return Buffer.from(data, "base64");
}

async function main() {
  const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  const page = await browser.newPage({ viewport: { width: 800, height: 900 } });
  for (const mood of ["confused", "curious", "proud", "sheepish"]) {
    await page.goto(`${dev}/dev/rig?mood=${mood}&light=0&at=2`, { waitUntil: "networkidle" });
    await page.waitForSelector("[data-ready='1']", { timeout: 60000 });
    // no valley behind Gloam: just Gloam
    await page.addStyleTag({ content: "html,body,main,main>div{background:transparent!important;background-image:none!important} main>div:last-child{display:none!important}" });
    await page.waitForTimeout(1200);
    const box = await page.evaluate(() => {
      const h = innerHeight;
      return { cx: innerWidth / 2, feet: h * 0.82, gh: h * 0.5 };
    });
    const png = await page.screenshot({ omitBackground: true, clip: { x: box.cx - box.gh * 0.55, y: box.feet - box.gh * 1.32, width: box.gh * 1.1, height: box.gh * 1.38 } });
    fs.writeFileSync(path.join(img, `gloam-${mood}.webp`), await webp(page, png));
  }
  if (process.argv.includes("--setup")) {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto(`${dev}/setup#demokey`, { waitUntil: "networkidle" });
    await page.waitForTimeout(5000);
    fs.writeFileSync(path.join(img, "setup.webp"), await webp(page, await page.screenshot(), 0.82));
  }
  await browser.close();
  console.log("Website pictures written to site/img/.");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
