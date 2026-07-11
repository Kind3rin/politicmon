import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
await page.goto(process.env.BASE_URL ?? "http://127.0.0.1:5179", { waitUntil: "load" });
await page.waitForTimeout(1000);
const shots = await page.evaluate(async () => {
  const { Screen } = await import("/src/engine/screen.ts");
  const { Input } = await import("/src/engine/input.ts");
  const { SceneStack } = await import("/src/engine/scene.ts");
  const { newGameState } = await import("/src/game/state.ts");
  const { createMonster } = await import("/src/game/monster.ts");
  const { WorldScene } = await import("/src/game/world/WorldScene.ts");
  const { GenovaTechnoScene } = await import("/src/scenes/GenovaTechnoScene.ts");
  const canvas = document.createElement("canvas"); canvas.width = 240; canvas.height = 180;
  const screen = new Screen(canvas); const input = new Input();
  const state = newGameState(); state.flags["intro-done"] = true;
  state.party = [createMonster("salisound", 52)]; state.pos = { mapId: "genova_techno", x: 10, y: 12, facing: "up" };
  const worldStack = new SceneStack(); worldStack.push(new WorldScene(worldStack, input, state));
  worldStack.update(1 / 30); worldStack.draw(screen); input.endFrame(); await new Promise((resolve) => setTimeout(resolve, 900));
  for (let i = 0; i < 20; i += 1) { worldStack.update(1 / 30); worldStack.draw(screen); input.endFrame(); }
  const world = canvas.toDataURL("image/png");
  const normalState = newGameState(); const normalStack = new SceneStack();
  normalStack.push(new GenovaTechnoScene(normalStack, input, normalState)); normalStack.update(0.2); normalStack.draw(screen); input.endFrame();
  const normal = canvas.toDataURL("image/png");
  const reducedState = newGameState(); reducedState.reduceEffects = true; const reducedStack = new SceneStack();
  reducedStack.push(new GenovaTechnoScene(reducedStack, input, reducedState)); reducedStack.update(99); reducedStack.draw(screen); input.endFrame();
  await new Promise((resolve) => setTimeout(resolve, 150)); reducedStack.update(1 / 60); reducedStack.draw(screen); input.endFrame();
  return { world, normal, reduced: canvas.toDataURL("image/png") };
});
mkdirSync("artifacts/screens", { recursive: true });
for (const [name, data] of Object.entries(shots)) writeFileSync(`artifacts/screens/p5_genova_${name}.png`, Buffer.from(data.split(",")[1], "base64"));
console.log("salvati screenshot P5 Genova Techno");
await browser.close();
