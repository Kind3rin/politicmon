// Verifica marker USCITA nella grotta (uscita invisibile senza marker).
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
  const { WorldScene } = await import("/src/game/world/WorldScene.ts");
  const { createMonster } = await import("/src/game/monster.ts");
  const { audio } = await import("/src/engine/audio.ts");
  audio.enabled = false;
  const canvas = document.createElement("canvas");
  canvas.width = 240; canvas.height = 180;
  const screen = new Screen(canvas);
  const input = new Input();
  const state = newGameState();
  state.flags["intro-done"] = true;
  state.party = [createMonster("giorgetta", 18)];
  state.pos = { mapId: "grotta1", x: 8, y: 10, facing: "down" };
  const stack = new SceneStack();
  stack.push(new WorldScene(stack, input, state));
  // Avanza il tempo così la freccia lampeggiante è nella fase visibile.
  for (let i = 0; i < 30; i++) { stack.update(1/30); stack.draw(screen); input.endFrame(); }
  return canvas.toDataURL("image/png");
});
writeFileSync("artifacts/screens/grotta_exit.png", Buffer.from(shot.slice("data:image/png;base64,".length), "base64"));
console.log("salvato artifacts/screens/grotta_exit.png");
await browser.close();
