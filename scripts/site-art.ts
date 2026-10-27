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

/**
 * A PNG screenshot as WebP (with its transparency), encoded by the browser. `soften`: fade the picture's edges
 * to nothing, so a lantern's glow never ends in a straight line (a cut-out must never show its box).
 */
async function webp(page: Page, png: Buffer, quality = 0.86, soften = false): Promise<Buffer> {
  const data = await page.evaluate(
    async ({ b64, q, soft }) => {
      const im = new Image();
      im.src = `data:image/png;base64,${b64}`;
      await im.decode();
      const c = document.createElement("canvas");
      c.width = im.width;
      c.height = im.height;
      const g = c.getContext("2d")!;
      g.drawImage(im, 0, 0);
      if (soft) {
        // keep what's in the middle, fade towards every edge (an oval: Gloam is taller than it is wide)
        g.globalCompositeOperation = "destination-in";
        const r = Math.max(c.width, c.height) / 2;
        const fade = g.createRadialGradient(c.width / 2, c.height * 0.52, r * 0.68, c.width / 2, c.height * 0.52, r);
        fade.addColorStop(0, "#000");
        fade.addColorStop(1, "rgba(0,0,0,0)");
        g.setTransform(c.width / (2 * r), 0, 0, 1, c.width / 2 - (c.width / 2) * (c.width / (2 * r)), 0);
        g.fillStyle = fade;
        g.fillRect(0, 0, 2 * r, c.height);
      }
      return c.toDataURL("image/webp", q).split(",")[1];
    },
    { b64: png.toString("base64"), q: quality, soft: soften },
  );
  return Buffer.from(data, "base64");
}

async function main() {
  const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  const page = await browser.newPage({ viewport: { width: 800, height: 900 } });
  // the high school Gloam in a few moods (lantern dark), and every grade's own Gloam, pleased and lit (for the
  // worlds chapter: those worlds are shown in full colour, the way they look once a class has taught Gloam)
  const shots: [string, string][] = [
    ["confused", "mood=confused&light=0"],
    ["curious", "mood=curious&light=0"],
    ["proud", "mood=proud&light=0"],
    ["sheepish", "mood=sheepish&light=0"],
    ...["little", "junior", "middle", "senior"].map((age): [string, string] => [age, `rig=${age}&mood=proud&light=0.9`]),
  ];
  for (const [name, query] of shots) {
    await page.goto(`${dev}/dev/rig?${query}&at=2`, { waitUntil: "networkidle" });
    await page.waitForSelector("[data-ready='1']", { timeout: 60000 });
    // no valley behind Gloam: just Gloam
    await page.addStyleTag({ content: "html,body,main,main>div{background:transparent!important;background-image:none!important} main>div:last-child{display:none!important}" });
    await page.waitForTimeout(1200);
    const box = await page.evaluate(() => {
      const h = innerHeight;
      return { cx: innerWidth / 2, feet: h * 0.82, gh: h * 0.5 };
    });
    const png = await page.screenshot({ omitBackground: true, clip: { x: box.cx - box.gh * 0.7, y: box.feet - box.gh * 1.45, width: box.gh * 1.4, height: box.gh * 1.55 } });
    fs.writeFileSync(path.join(img, `gloam-${name}.webp`), await webp(page, png, 0.86, true));
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
