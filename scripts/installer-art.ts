/**
 * Makes the installers' pictures from Protégé's own art, so they can be remade any time:
 *   release-files/windows/protege.ico         Gloam's mark, every size Windows uses (16 to 256 px)
 *   release-files/windows/wizard.png          the installer's side panel: the real painted Gloam in its valley
 *   release-files/windows/wizard-small.png    the installer's corner picture
 *   release-files/mac/icon-1024.png           the Mac app icon (turned into .icns on a Mac by scripts/release.ts)
 *
 *   npx tsx scripts/installer-art.ts [http://localhost:3000]   (the panel needs the dev server, for /dev/rig)
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const root = process.cwd();
const dev = process.argv[2] ?? "http://localhost:3000";
const svg = fs.readFileSync(path.join(root, "site", "img", "mark.svg"), "utf8");
const win = path.join(root, "release-files", "windows");
const mac = path.join(root, "release-files", "mac");
fs.mkdirSync(win, { recursive: true });
fs.mkdirSync(mac, { recursive: true });

/** An .ico holding PNGs (every Windows since Vista reads these) */
function ico(pngs: { size: number; data: Buffer }[]): Buffer {
  const head = Buffer.alloc(6 + 16 * pngs.length);
  head.writeUInt16LE(0, 0);
  head.writeUInt16LE(1, 2);
  head.writeUInt16LE(pngs.length, 4);
  let offset = head.length;
  pngs.forEach((p, i) => {
    const e = 6 + i * 16;
    head.writeUInt8(p.size >= 256 ? 0 : p.size, e);
    head.writeUInt8(p.size >= 256 ? 0 : p.size, e + 1);
    head.writeUInt16LE(1, e + 4);
    head.writeUInt16LE(32, e + 6);
    head.writeUInt32LE(p.data.length, e + 8);
    head.writeUInt32LE(offset, e + 12);
    offset += p.data.length;
  });
  return Buffer.concat([head, ...pngs.map((p) => p.data)]);
}

async function main() {
  const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  const page = await browser.newPage();
  const mark = async (size: number, inset = 0) => {
    await page.setViewportSize({ width: size, height: size });
    const pad = Math.round(size * inset);
    await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:${size - pad * 2}px;height:${size - pad * 2}px;margin:${pad}px}</style>${svg}`);
    return page.screenshot({ omitBackground: true });
  };

  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const pngs = [];
  for (const size of sizes) pngs.push({ size, data: await mark(size) });
  fs.writeFileSync(path.join(win, "protege.ico"), ico(pngs));
  // Mac icons sit inside a margin (Apple's grid: about 10% each side)
  fs.writeFileSync(path.join(mac, "icon-1024.png"), await mark(1024, 0.1));
  fs.writeFileSync(path.join(win, "wizard-small.png"), await mark(110));

  // the side panel: the animated Gloam (curious, lantern dark) in the night valley, from the dev rig page
  await page.setViewportSize({ width: 656, height: 1500 });
  await page.goto(`${dev}/dev/rig?mood=curious&light=0&at=2`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-ready='1']", { timeout: 60000 });
  await page.waitForTimeout(1500);
  const shot = await page.screenshot({ clip: { x: 0, y: 40, width: 656, height: 1256 } });
  // down to the size Inno Setup shows at 200% (328×628)
  await page.setViewportSize({ width: 328, height: 628 });
  await page.setContent(`<style>html,body{margin:0}img{display:block;width:328px;height:628px}</style><img src="data:image/png;base64,${shot.toString("base64")}">`);
  fs.writeFileSync(path.join(win, "wizard.png"), await page.screenshot());
  await browser.close();
  console.log("Installer pictures written to release-files/.");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
