import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5179";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
await page.goto(BASE, { waitUntil: "networkidle" });
const shot = await page.evaluate(async () => {
  const { Screen } = await import("/src/engine/screen.ts");
  const { Input } = await import("/src/engine/input.ts");
  const { SceneStack } = await import("/src/engine/scene.ts");
  const { newGameState } = await import("/src/game/state.ts");
  const { ShopScene } = await import("/src/scenes/ShopScene.ts");
  const { audio } = await import("/src/engine/audio.ts");
  audio.enabled = false;
  const canvas = document.createElement("canvas");
  canvas.width = 240; canvas.height = 180;
  const screen = new Screen(canvas);
  const input = new Input();
  const stack = new SceneStack();
  const state = newGameState();
  state.money = 5986;
  stack.push(new ShopScene(stack, input, state));
  const frame = () => { stack.update(1/30); stack.draw(screen); input.endFrame(); };
  const press = (code) => {
    document.dispatchEvent(new KeyboardEvent("keydown", { code, bubbles: true }));
    frame();
    document.dispatchEvent(new KeyboardEvent("keyup", { code, bubbles: true }));
    for (let i=0;i<4;i++) frame();
  };
  for (let i=0;i<6;i++) frame();
  // Scorri fino alla TESSERA RIMBORSO SPESE (desc lunga, era troncata).
  for (let i=0;i<4;i++) press("ArrowDown");
  return canvas.toDataURL("image/png");
});
writeFileSync("artifacts/screens/shop_desc.png", Buffer.from(shot.slice("data:image/png;base64,".length),"base64"));
console.log("salvato shop_desc");
await browser.close();
