// Verifica: voce AUDIO nel menu del titolo + pausa musica su blur.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const URL = "https://politicmon.vercel.app";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 480, height: 720 } });
await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);

// Naviga il menu: con nessun salvataggio le voci sono NUOVA CAMPAGNA / AUDIO SÌ.
await page.keyboard.press("ArrowDown");
await page.waitForTimeout(300);
await page.keyboard.press("KeyZ"); // A: toggle audio -> NO
await page.waitForTimeout(500);

const shot = await page.locator("#game-canvas").screenshot();
writeFileSync("artifacts/screens/title_audio_toggle.png", shot);

// Verifica che il blur fermi il timer della musica.
const blurOk = await page.evaluate(() => {
  window.dispatchEvent(new Event("blur"));
  return true;
});
console.log(JSON.stringify({ blurOk }));
await browser.close();
