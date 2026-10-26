import { chromium } from "@playwright/test";
const [url, out, w = "1366", h = "768"] = process.argv.slice(2);
const b = await chromium.launch({ args: ["--enable-gpu", "--ignore-gpu-blocklist"] });
const p = await b.newPage({ viewport: { width: +w, height: +h } });
await p.goto(url, { waitUntil: "load", timeout: 120000 });
await p.waitForTimeout(Number(process.env.WAIT ?? 3000));
await p.screenshot({ path: out, fullPage: process.env.FULL === "1" });
await b.close();
