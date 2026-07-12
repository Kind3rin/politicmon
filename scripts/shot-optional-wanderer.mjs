// Regressione visuale: lo sfidante casuale compare nel mondo senza aprire
// dialoghi o battaglie e resta una scelta esplicita del giocatore.
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5179";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 720, height: 540 } });
await page.goto(BASE, { waitUntil: "networkidle" });
const result = await page.evaluate(async () => {
  const { Screen } = await import("/src/engine/screen.ts");
  const { Input } = await import("/src/engine/input.ts");
  const { SceneStack } = await import("/src/engine/scene.ts");
  const { newGameState } = await import("/src/game/state.ts");
  const { createMonster } = await import("/src/game/monster.ts");
  const { WorldScene } = await import("/src/game/world/WorldScene.ts");
  const canvas = document.createElement("canvas");
  canvas.width = 240; canvas.height = 180;
  const screen = new Screen(canvas);
  const input = new Input();
  const stack = new SceneStack();
  const state = newGameState();
  state.flags["intro-done"] = true;
  state.flags["dex-received"] = true;
  state.party.push(createMonster("giorgiagon", 12));
  state.pos = { mapId: "borgo", x: 14, y: 15, facing: "up" };
  const world = new WorldScene(stack, input, state);
  stack.push(world);
  world.wanderCooldown = 0;
  const random = Math.random;
  Math.random = () => 0;
  const spawned = world.checkWanderingChallenger();
  Math.random = random;
  for (let i = 0; i < 12; i++) { stack.update(1 / 60); stack.draw(screen); input.endFrame(); }
  return { png: canvas.toDataURL("image/png"), spawned, hasPrompt: Boolean(world.askMenu), stackSize: stack.size };
});
mkdirSync("artifacts/screens", { recursive: true });
writeFileSync("artifacts/screens/optional-wanderer.png", Buffer.from(result.png.slice("data:image/png;base64,".length), "base64"));
console.log(JSON.stringify({ spawned: result.spawned, hasPrompt: result.hasPrompt, stackSize: result.stackSize }));
await browser.close();
