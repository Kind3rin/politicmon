// Screenshot del layout touch: levetta analogica vs d-pad a croce.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5179";
const browser = await chromium.launch();
// Viewport tipo telefono, pointer coarse per attivare i controlli touch.
const page = await browser.newPage({
  viewport: { width: 412, height: 892 },
  isMobile: true,
  hasTouch: true
});
await page.goto(BASE, { waitUntil: "networkidle" });
await page.waitForTimeout(800);

async function shot(mode, file) {
  await page.evaluate(async (m) => {
    document.body.classList.add("touch");
    const { setControlMode } = await import("/src/engine/controls.ts");
    setControlMode(m);
    const cap = document.querySelector("#touch-stick-cap");
    if (cap) cap.style.transform = "translate(26px, 0px)"; // mostra spinta a destra
  }, mode);
  await page.waitForTimeout(300);
  const buf = await page.screenshot();
  writeFileSync(`artifacts/screens/${file}.png`, buf);
  console.log(`salvato ${file}.png`);
}

await shot("stick", "controls_stick");
await shot("dpad", "controls_dpad");
await browser.close();
