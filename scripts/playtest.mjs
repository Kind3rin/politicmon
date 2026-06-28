// Playtest reale: avvia, scegli starter, cammina, entra in battaglia, apri menu.
// Salva una sequenza di screenshot per giudicare il gioco come lo vede chi gioca.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5179";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 480, height: 360 } });
await page.goto(BASE, { waitUntil: "load" });
await page.waitForTimeout(4000);

const canvas = await page.$("#game-canvas");
let n = 0;
async function shot(label) {
  const buf = await canvas.screenshot();
  writeFileSync(`artifacts/screens/pt_${String(n).padStart(2,"0")}_${label}.png`, buf);
  n++;
}
async function key(code, times = 1, gap = 180) {
  for (let i = 0; i < times; i++) {
    await page.keyboard.down(code); await page.waitForTimeout(60); await page.keyboard.up(code);
    await page.waitForTimeout(gap);
  }
}
await shot("title");
// Salta intro / entra: Enter o Z = A
await key("KeyZ", 1, 600); await shot("after_a1");
await key("KeyZ", 1, 600); await shot("after_a2");
// Prova a muoverti
await key("ArrowDown", 3); await shot("down");
await key("ArrowRight", 3); await shot("right");
await key("ArrowUp", 2); await shot("up");
await key("ArrowLeft", 2); await shot("left");
// Apri menu pausa (Enter/Start = X o Escape?) prova X
await key("KeyX", 1, 400); await shot("menu_x");
await key("Escape", 1, 400); await shot("menu_esc");
console.log("playtest salvato", n, "frame");
await browser.close();
