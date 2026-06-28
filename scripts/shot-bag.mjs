import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5179";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
await page.goto(BASE, { waitUntil: "load" });
await page.waitForTimeout(1500);
const shot = await page.evaluate(async () => {
  const { Screen } = await import("/src/engine/screen.ts");
  const { Input } = await import("/src/engine/input.ts");
  const { SceneStack } = await import("/src/engine/scene.ts");
  const { newGameState } = await import("/src/game/state.ts");
  const { BagScene } = await import("/src/scenes/BagScene.ts");
  const { preloadSprites, loadPanelImage } = await import("/src/engine/assets.ts");
  preloadSprites({
    "item:scheda": "items/scheda.png", "item:caffe": "items/caffe.png",
    "item:spritz": "items/spritz.png", "item:mojito": "items/mojito.png", "item:maalox": "items/maalox.png"
  });
  await new Promise((r) => setTimeout(r, 1200));
  const canvas = document.createElement("canvas");
  canvas.width = 240; canvas.height = 180;
  const screen = new Screen(canvas);
  loadPanelImage((img, b) => screen.setPanelImage(img, b));
  await new Promise((r) => setTimeout(r, 800));
  const state = newGameState();
  state.bag = { scheda: 5, caffe: 3, spritz: 2, mojito: 1, maalox: 4 };
  const stack = new SceneStack();
  stack.push(new BagScene(stack, new Input(), state, {}));
  for (let i = 0; i < 6; i++) { stack.update(1/30); stack.draw(screen); }
  return canvas.toDataURL("image/png");
});
writeFileSync("artifacts/screens/bag_pilot.png", Buffer.from(shot.slice("data:image/png;base64,".length),"base64"));
console.log("salvato");
await browser.close();
