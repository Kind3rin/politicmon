import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5179";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
await page.goto(BASE, { waitUntil: "networkidle" });

const png = await page.evaluate(async () => {
  const { Screen } = await import("/src/engine/screen.ts");
  const { Input } = await import("/src/engine/input.ts");
  const { SceneStack } = await import("/src/engine/scene.ts");
  const { newGameState } = await import("/src/game/state.ts");
  const { PauseScene } = await import("/src/scenes/PauseScene.ts");
  const { audio } = await import("/src/engine/audio.ts");
  audio.enabled = false;

  const state = newGameState();
  state.money = 16838;
  state.sondaggi = 100;
  state.badges = ["auditel", "spread"];
  state.dex = { giorgiagon: "caught", ellyna: "caught", salvinator: "seen" };
  const canvas = document.createElement("canvas");
  canvas.width = 240;
  canvas.height = 180;
  const screen = new Screen(canvas);
  const input = new Input();
  const stack = new SceneStack();
  const scene = new PauseScene(stack, input, state);
  // Screenshot mirato della tessera, senza simulare il resto del menu.
  (scene).showCard = true;
  stack.push(scene);
  stack.draw(screen);
  await new Promise((resolve) => window.setTimeout(resolve, 700));
  stack.draw(screen);
  return canvas.toDataURL("image/png");
});

mkdirSync("artifacts/screens", { recursive: true });
writeFileSync("artifacts/screens/candidate-card.png", Buffer.from(png.slice("data:image/png;base64,".length), "base64"));
console.log("salvato artifacts/screens/candidate-card.png");
await browser.close();
