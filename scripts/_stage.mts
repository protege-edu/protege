import { chromium } from "@playwright/test";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1366, height: 768 } });
const errs: string[] = [];
p.on("pageerror", (e) => errs.push(e.message.slice(0, 200)));
p.on("console", (m) => m.type() === "error" && errs.push(m.text().slice(0, 200)));
for (const [v, mood] of [[0, "proud"], [0.5, "skeptical"], [1, "eureka"]] as const) {
  await p.goto(`http://localhost:3100/dev/stage?b=${v}&ground=0.66&mood=${mood}`, { waitUntil: "load" });
  await p.waitForTimeout(7000);
  await p.screenshot({ path: `screenshots/painted-gloam-${v}.png` });
}
console.log(errs.slice(0, 3).join("\n") || "no errors");
await b.close();
