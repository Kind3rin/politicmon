import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5179";
const MAP_ID = process.env.MAP_ID ?? "capitale";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
await page.goto(BASE, { waitUntil: "networkidle" });

const png = await page.evaluate(async (mapId) => {
  const { Screen } = await import("/src/engine/screen.ts");
  const { Input } = await import("/src/engine/input.ts");
  const { SceneStack } = await import("/src/engine/scene.ts");
  const { newGameState } = await import("/src/game/state.ts");
  const { WorldMapScene } = await import("/src/scenes/WorldMapScene.ts");
  const { audio } = await import("/src/engine/audio.ts");
  audio.enabled = false;

  const state = newGameState();
  state.badges = ["auditel", "spread", "comizio"];
  state.pos = { mapId, x: 12, y: 12, facing: "down" };
  const canvas = document.createElement("canvas");
  canvas.width = 240;
  canvas.height = 180;
  const screen = new Screen(canvas);
  const input = new Input();
  const stack = new SceneStack();
  stack.push(new WorldMapScene(stack, input, state));
  stack.update(1 / 30);
  // Primo draw avvia il caricamento lazy della cartina PixelLab; aspetta il
  // decode e ridisegna come fa il game loop reale, altrimenti lo screenshot
  // fotograferebbe solo il fallback del primo frame.
  stack.draw(screen);
  await new Promise((resolve) => window.setTimeout(resolve, 700));
  stack.draw(screen);
  return canvas.toDataURL("image/png");
}, MAP_ID);

mkdirSync("artifacts/screens", { recursive: true });
writeFileSync(`artifacts/screens/world-map-${MAP_ID}.png`, Buffer.from(png.slice("data:image/png;base64,".length), "base64"));
console.log(`salvato artifacts/screens/world-map-${MAP_ID}.png`);
await browser.close();
