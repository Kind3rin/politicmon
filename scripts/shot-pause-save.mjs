// Screenshot del menu PAUSA per verificare che SALVA sia la prima voce.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5179";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
await page.goto(BASE, { waitUntil: "networkidle" });

const result = await page.evaluate(async () => {
  const { Screen } = await import("/src/engine/screen.ts");
  const { Input } = await import("/src/engine/input.ts");
  const { SceneStack } = await import("/src/engine/scene.ts");
  const { newGameState } = await import("/src/game/state.ts");
  const { PauseScene } = await import("/src/scenes/PauseScene.ts");
  const { audio } = await import("/src/engine/audio.ts");
  audio.enabled = false;

  const canvas = document.createElement("canvas");
  canvas.width = 240; canvas.height = 180;
  const screen = new Screen(canvas);
  const input = new Input();
  const stack = new SceneStack();
  const state = newGameState();
  state.flags["starter-chosen"] = true;
  state.flags["rival1-beaten"] = true;
  state.flags["dex-received"] = true;
  state.badges = ["auditel"];
  state.sondaggi = 60;

  const p = new PauseScene(stack, input, state);
  stack.push(p);
  const frame = () => { stack.update(1 / 30); stack.draw(screen); input.endFrame(); };
  for (let i = 0; i < 4; i++) frame();
  // Espone le voci del menu principale per verifica testuale.
  const entries = p.entries;
  return { png: canvas.toDataURL("image/png"), entries };
});

writeFileSync("artifacts/screens/pause_save.png", Buffer.from(result.png.slice("data:image/png;base64,".length), "base64"));
console.log("voci menu:", JSON.stringify(result.entries));
console.log("prima voce:", result.entries[0]);
console.log("salvato pause_save.png");
await browser.close();
