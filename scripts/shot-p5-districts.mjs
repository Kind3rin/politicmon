import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
await page.goto(process.env.BASE_URL ?? "http://127.0.0.1:5179", { waitUntil: "load" });
await page.waitForTimeout(1000);
const shots = await page.evaluate(async () => {
  const { Screen } = await import("/src/engine/screen.ts"); const { Input } = await import("/src/engine/input.ts");
  const { SceneStack } = await import("/src/engine/scene.ts"); const { newGameState } = await import("/src/game/state.ts");
  const { createMonster } = await import("/src/game/monster.ts"); const { addAlly } = await import("/src/game/coalition.ts");
  const { newElectionState } = await import("/src/game/election.ts"); const { WorldScene } = await import("/src/game/world/WorldScene.ts");
  const { DistrictScene } = await import("/src/scenes/DistrictScene.ts");
  const canvas = document.createElement("canvas"); canvas.width = 240; canvas.height = 180; const screen = new Screen(canvas); const input = new Input();
  const renderWorld = async (mapId, x, y) => {
    const stack = new SceneStack(); const state = newGameState(); state.flags["intro-done"] = true; state.party = [createMonster("nordiodo", 54)];
    state.pos = { mapId, x, y, facing: "up" }; stack.push(new WorldScene(stack, input, state)); stack.update(1 / 30); stack.draw(screen); input.endFrame();
    await new Promise((resolve) => setTimeout(resolve, 800)); for (let i = 0; i < 20; i += 1) { stack.update(1 / 30); stack.draw(screen); input.endFrame(); }
    return canvas.toDataURL("image/png");
  };
  const hub = await renderWorld("tour_feed", 11, 12); const nord = await renderWorld("district_nord", 9, 10);
  const state = newGameState(); state.money = 2400; state.election = newElectionState(true);
  let added = addAlly(state.coalition, "campo_secretary"); if (added.ok) state.coalition = added.state;
  added = addAlly(state.coalition, "quantum_centrist"); if (added.ok) state.coalition = added.state;
  const stack = new SceneStack(); stack.push(new DistrictScene(stack, input, state, "nord", () => undefined)); stack.update(1 / 60); stack.draw(screen); input.endFrame();
  await new Promise((resolve) => setTimeout(resolve, 100)); stack.draw(screen);
  return { hub, nord, choice: canvas.toDataURL("image/png") };
});
mkdirSync("artifacts/screens", { recursive: true });
for (const [name, data] of Object.entries(shots)) writeFileSync(`artifacts/screens/p5_district_${name}.png`, Buffer.from(data.split(",")[1], "base64"));
console.log("salvati screenshot P5 cinque collegi"); await browser.close();
