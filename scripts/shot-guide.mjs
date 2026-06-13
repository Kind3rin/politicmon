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
  const { audio } = await import("/src/engine/audio.ts");
  audio.enabled = false;
  try { localStorage.setItem("politicmon-guide", "on"); } catch {}
  const canvas = document.createElement("canvas");
  canvas.width = 240; canvas.height = 180;
  const screen = new Screen(canvas);
  const input = new Input();
  const stack = new SceneStack();
  const state = newGameState();
  state.flags["intro-done"] = true;
  // Nessuno starter scelto -> prima quest "starter" con target lab (6,12).
  state.pos = { mapId: "borgo", x: 14, y: 9, facing: "down" };
  const w = new WorldScene(stack, input, state);
  stack.push(w);
  for (let i = 0; i < 20; i++) { stack.update(1/30); stack.draw(screen); input.endFrame(); }
  return canvas.toDataURL("image/png");
});
writeFileSync("artifacts/screens/guide_arrow.png", Buffer.from(shot.slice(22), "base64"));
console.log("salvato guide_arrow.png");
await browser.close();
