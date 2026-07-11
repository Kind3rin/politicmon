import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5179";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
await page.goto(BASE, { waitUntil: "load" });
await page.waitForTimeout(800);

const shot = await page.evaluate(async () => {
  const { Screen } = await import("/src/engine/screen.ts");
  const { getSpriteImage, waitForSprites, spriteStatus } = await import("/src/engine/assets.ts");
  const { tileImage } = await import("/src/art/tiles.ts");
  const canvas = document.createElement("canvas"); canvas.width = 240; canvas.height = 180;
  const screen = new Screen(canvas);
  const defs = [
    ["PALCO", "atto3_stage", 64, 38, 48], ["GAZEBO", "atto3_gazebo", 48, 120, 48],
    ["MANIFESTO", "atto3_poster", 16, 180, 48], ["CABINA", "atto3_voting_booth", 32, 216, 48],
    ["URNA", "atto3_ballot_box", 16, 28, 112], ["MAXISCHERMO", "atto3_social_screen", 48, 74, 112],
    ["VAN", "atto3_press_van", 48, 132, 112], ["ROCCAFORTE", "atto3_fortress", 96, 202, 128],
  ];
  const keys = [];
  for (const [, id] of defs) {
    getSpriteImage(`qa:${id}`, `tiles/${id}.png`); keys.push(`qa:${id}`);
  }
  tileImage("."); keys.push("tile:.");
  await waitForSprites(keys, 5000);
  const grass = tileImage(".");
  for (let y = 0; y < 180; y += 16) for (let x = 0; x < 240; x += 16) {
    if (grass) screen.imageSprite(grass, x, y, { scaleX: 16 / grass.width, scaleY: 16 / grass.height });
  }
  for (const [label, id, target, cx, baseY] of defs) {
    const img = getSpriteImage(`qa:${id}`, `tiles/${id}.png`);
    if (!img) continue;
    const b = screen.imageBounds(img); const scale = target / Math.max(b.w, b.h);
    screen.imageSpriteCropped(img, cx - b.w * scale / 2, baseY - b.h * scale, { scaleX: scale, scaleY: scale });
  }
  return { image: canvas.toDataURL("image/png"), status: keys.map((k) => [k, spriteStatus(k)]) };
});

mkdirSync("artifacts/screens", { recursive: true });
writeFileSync("artifacts/screens/atto3_world_assets.png", Buffer.from(shot.image.split(",")[1], "base64"));
console.log(JSON.stringify(shot.status));
await browser.close();
