import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
await page.goto(process.env.BASE_URL ?? "http://127.0.0.1:5179", { waitUntil: "load" });
await page.waitForTimeout(1000);
const image = await page.evaluate(async () => {
  const { Screen } = await import("/src/engine/screen.ts");
  const { Input } = await import("/src/engine/input.ts");
  const { SceneStack } = await import("/src/engine/scene.ts");
  const { newGameState } = await import("/src/game/state.ts");
  const { createMonster } = await import("/src/game/monster.ts");
  const { WorldScene } = await import("/src/game/world/WorldScene.ts");
  const canvas = document.createElement("canvas"); canvas.width = 240; canvas.height = 180;
  const screen = new Screen(canvas); const input = new Input(); const stack = new SceneStack();
  const state = newGameState(); state.flags["intro-done"] = true; state.flags["dex-received"] = true;
  state.party = [createMonster("salistrobo", 30)]; state.pos = { mapId: "campo_largo", x: 10, y: 8, facing: "up" };
  stack.push(new WorldScene(stack, input, state));
  stack.update(1 / 60); stack.draw(screen); input.endFrame();
  await new Promise((resolve) => setTimeout(resolve, 1000));
  for (let i = 0; i < 10; i += 1) { stack.update(1 / 60); stack.draw(screen); input.endFrame(); }
  return canvas.toDataURL("image/png");
});
mkdirSync("artifacts/screens", { recursive: true });
writeFileSync("artifacts/screens/campo_largo_assets.png", Buffer.from(image.split(",")[1], "base64"));
console.log("salvato artifacts/screens/campo_largo_assets.png");
await browser.close();
