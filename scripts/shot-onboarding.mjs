// Verifica hint onboarding: arrivo a Caput Mundi mostra l'annuncio del CASINÒ.
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
  const stack = new SceneStack();

  const state = newGameState();
  state.flags["intro-done"] = true; // salta l'intro del borgo
  state.party = [createMonster("giorgetta", 18)];
  state.badges = ["auditel", "spread"];
  state.pos = { mapId: "capitale", x: 14, y: 10, facing: "down" };
  const world = new WorldScene(stack, input, state);
  stack.push(world);
  const frame = () => { stack.update(1/30); stack.draw(screen); input.endFrame(); };
  for (let i = 0; i < 20; i++) frame(); // lascia scattare l'hint one-shot
  return { img: canvas.toDataURL("image/png"), fired: Boolean(state.flags["hint-casino"]) };
});

writeFileSync("artifacts/screens/onboarding_casino.png",
  Buffer.from(shot.img.slice("data:image/png;base64,".length), "base64"));
console.log("hint casinò scattato:", shot.fired);
console.log("salvato onboarding_casino.png");
await browser.close();
