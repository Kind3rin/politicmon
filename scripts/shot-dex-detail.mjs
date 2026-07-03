// Screenshot di verifica: dettaglio DEX di un leggendario con l'abilità mostrata.
import { chromium } from "playwright";
const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5179";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 720, height: 540 } });
await page.goto(BASE, { waitUntil: "load" });
await page.waitForTimeout(3000);
await page.evaluate(async () => {
  const { DexScene } = await import("/src/scenes/DexScene.ts");
  const { newGameState } = await import("/src/game/state.ts");
  const { SPECIES } = await import("/src/data/species.ts");
  const { Input } = await import("/src/engine/input.ts");
  const stack = window.stack;
  while (stack.scenes && stack.scenes.length) stack.pop();
  const st = newGameState();
  st.browserSeed = 2;
  for (const id of Object.keys(SPECIES)) st.dex[id] = "caught";
  stack.push(new DexScene(stack, window.__input ?? new Input(), st));
});
await page.waitForTimeout(400);
// draghimon è dexNum 15 → scorri e apri il dettaglio.
for (let i = 0; i < 14; i++) { await page.keyboard.press("ArrowDown"); await page.waitForTimeout(50); }
await page.keyboard.press("KeyZ"); // A = conferma → apre dettaglio
await page.waitForTimeout(500);
await page.screenshot({ path: "artifacts/screens/dex-detail-legend.png" });
await browser.close();
console.log("saved artifacts/screens/dex-detail-legend.png");
