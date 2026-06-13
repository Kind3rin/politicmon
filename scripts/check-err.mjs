import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 480, height: 720 } });
const errs = [];
page.on("pageerror", (e) => errs.push(e.stack || String(e)));
await page.goto("https://politicmon.vercel.app", { waitUntil: "networkidle" });
await page.waitForTimeout(3000);
console.log(errs.join("\n---\n") || "nessun errore");
await browser.close();
