// Verifica del deploy: carica la prod, controlla errori console, canvas attivo e SW.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const URL = "https://politicmon.vercel.app";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 480, height: 720 } });
await page.addInitScript(() => {
  sessionStorage.setItem("politicmon-intro-seen", "1");
});
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForTimeout(3500);

const info = await page.evaluate(async () => {
  const canvas = document.querySelector("#game-canvas");
  const ctx = canvas.getContext("2d");
  const px = ctx.getImageData(0, 0, 240, 180).data;
  let lit = 0;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i] + px[i + 1] + px[i + 2] > 30) lit += 1;
  }
  const reg = await navigator.serviceWorker?.getRegistration();
  return { litPixels: lit, swActive: Boolean(reg?.active), title: document.title };
});

const shot = await page.locator("#game-canvas").screenshot();
writeFileSync("artifacts/screens/prod_title.png", shot);
console.log(JSON.stringify({ ...info, errors }, null, 2));
await browser.close();
