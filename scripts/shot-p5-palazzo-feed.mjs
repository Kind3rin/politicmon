import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
await page.goto(process.env.BASE_URL ?? "http://127.0.0.1:5179", { waitUntil: "load" });
await page.waitForTimeout(800);
const shots = await page.evaluate(async () => {
  const { Screen } = await import("/src/engine/screen.ts");
  const { Input } = await import("/src/engine/input.ts");
  const { SceneStack } = await import("/src/engine/scene.ts");
  const { newGameState } = await import("/src/game/state.ts");
  const { createMonster } = await import("/src/game/monster.ts");
  const { WorldScene } = await import("/src/game/world/WorldScene.ts");
  const canvas = document.createElement("canvas"); canvas.width = 240; canvas.height = 180;
  const screen = new Screen(canvas); const input = new Input();
  const render = async (mapId, x, y) => {
    const stack = new SceneStack(); const state = newGameState();
    state.flags["intro-done"] = true; state.flags.tourComplete = true;
    state.party = [createMonster("nordiodo", 54)]; state.pos = { mapId, x, y, facing: "up" };
    stack.push(new WorldScene(stack, input, state));
    await new Promise((resolve) => setTimeout(resolve, 500));
    for (let i = 0; i < 20; i += 1) { stack.update(1 / 30); stack.draw(screen); input.endFrame(); }
    return canvas.toDataURL("image/png");
  };
  return {
    lobby: await render("palazzo_feed", 9, 8),
    algoritmo: await render("palazzo_algoritmo", 4, 5),
    studio: await render("palazzo_feed_studio", 8, 6)
  };
});
mkdirSync("artifacts/screens", { recursive: true });
for (const [name, data] of Object.entries(shots)) {
  writeFileSync(`artifacts/screens/p5_palazzo_feed_${name}.png`, Buffer.from(data.split(",")[1], "base64"));
}
console.log("salvati screenshot P5 Palazzo dei Feed");
await browser.close();
