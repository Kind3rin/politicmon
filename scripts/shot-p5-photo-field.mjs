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
  const { CoalitionScene } = await import("/src/scenes/CoalitionScene.ts");
  const canvas = document.createElement("canvas"); canvas.width = 240; canvas.height = 180;
  const screen = new Screen(canvas); const input = new Input(); const stack = new SceneStack();
  const state = newGameState();
  state.flags["intro-done"] = true; state.flags["dex-received"] = true; state.flags["ue-beaten"] = true;
  state.party = [createMonster("salistrobo", 50)];
  state.pos = { mapId: "campo_largo", x: 10, y: 16, facing: "up" };
  stack.push(new WorldScene(stack, input, state));
  await new Promise((resolve) => setTimeout(resolve, 800));
  for (let i = 0; i < 150; i += 1) { stack.update(1 / 30); stack.draw(screen); input.endFrame(); }
  const intro = canvas.toDataURL("image/png");

  state.flags["coalition-candidate-seen:campo_secretary"] = true;
  state.flags["coalition-candidate-seen:quantum_centrist"] = true;
  state.flags["coalition-candidate-seen:civic_mayor"] = true;
  stack.push(new CoalitionScene(stack, input, state, "campo_secretary"));
  stack.update(1 / 60); stack.draw(screen); input.endFrame();
  const coalition = canvas.toDataURL("image/png");
  return { intro, coalition, started: state.flags.atto3Started };
});

if (!shots.started) throw new Error("atto3Started non impostato all'ingresso");
mkdirSync("artifacts/screens", { recursive: true });
for (const [name, data] of Object.entries({ p5_photo_intro: shots.intro, p5_coalition_card: shots.coalition })) {
  writeFileSync(`artifacts/screens/${name}.png`, Buffer.from(data.split(",")[1], "base64"));
}
console.log("salvati artifacts/screens/p5_photo_intro.png e p5_coalition_card.png");
await browser.close();
