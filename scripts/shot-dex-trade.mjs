import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5179";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
await page.goto(BASE, { waitUntil: "networkidle" });

const png = await page.evaluate(async () => {
  const { Screen } = await import("/src/engine/screen.ts");
  const { Input } = await import("/src/engine/input.ts");
  const { SceneStack } = await import("/src/engine/scene.ts");
  const { newGameState } = await import("/src/game/state.ts");
  const { DexScene } = await import("/src/scenes/DexScene.ts");
  const { DEX_ORDER } = await import("/src/data/species.ts");
  const { audio } = await import("/src/engine/audio.ts");
  audio.enabled = false;
  const state = newGameState();
  state.browserSeed = 2; // GOVERNO: VANNACCIX è nell'altra versione.
  state.dex.vannaccix = "seen";
  const canvas = document.createElement("canvas");
  canvas.width = 240;
  canvas.height = 180;
  const screen = new Screen(canvas);
  const input = new Input();
  const stack = new SceneStack();
  const scene = new DexScene(stack, input, state);
  scene.index = DEX_ORDER.indexOf("vannaccix");
  scene.scroll = Math.max(0, scene.index - 5);
  stack.push(scene);
  stack.draw(screen);
  return canvas.toDataURL("image/png");
});

mkdirSync("artifacts/screens", { recursive: true });
writeFileSync("artifacts/screens/dex-trade-guide.png", Buffer.from(png.slice("data:image/png;base64,".length), "base64"));
console.log("salvato artifacts/screens/dex-trade-guide.png");
await browser.close();
