import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5179";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 480, height: 360 } });
await page.goto(BASE, { waitUntil: "load" });
await page.waitForTimeout(1500);
const shot = await page.evaluate(async () => {
  const { Screen } = await import("/src/engine/screen.ts");
  const { playerImage } = await import("/src/art/characters.ts");
  const { preloadSprites } = await import("/src/engine/assets.ts");
  const map = {};
  for (const d of ["south","north","east","west"]) for (let f=0; f<4; f++) map[`player:${d}:w${f}`] = `chars/player_${d}_w${f}.png`;
  preloadSprites(map);
  // Aspetta che il registry abbia caricato i frame (playerImage ritorna non-null).
  for (let i = 0; i < 50; i++) {
    if (playerImage("down", 0, true) && playerImage("right", 2, true)) break;
    await new Promise((r) => setTimeout(r, 100));
  }
  const canvas = document.createElement("canvas");
  canvas.width = 240; canvas.height = 80;
  const screen = new Screen(canvas);
  screen.clear("#3f7d3a");
  // 4 frame walk south in fila + 4 east
  for (let f=0; f<4; f++){
    const img = playerImage("down", f, true);
    if (img) screen.imageSprite(img, 8 + f*30, 8, { scaleX: 28/img.height, scaleY: 28/img.height });
  }
  for (let f=0; f<4; f++){
    const img = playerImage("right", f, true);
    if (img) screen.imageSprite(img, 130 + f*28, 8, { scaleX: 28/img.height, scaleY: 28/img.height });
  }
  return canvas.toDataURL("image/png");
});
writeFileSync("artifacts/screens/walk_frames.png", Buffer.from(shot.slice("data:image/png;base64,".length),"base64"));
console.log("salvato");
await browser.close();
