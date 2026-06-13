// Screenshot della scena MISSIONI con la lista scorrevole (principali + side).
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
  const { QuestScene } = await import("/src/scenes/QuestScene.ts");
  const { audio } = await import("/src/engine/audio.ts");
  audio.enabled = false;

  const canvas = document.createElement("canvas");
  canvas.width = 240; canvas.height = 180;
  const screen = new Screen(canvas);
  const input = new Input();
  const stack = new SceneStack();
  const state = newGameState();
  // Stato a metà gioco: alcune fatte, una corrente, side visibili.
  state.flags["starter-chosen"] = true;
  state.flags["rival1-beaten"] = true;
  state.flags["dex-received"] = true;
  state.badges = ["auditel"];
  state.flags["veh-monopattino"] = true;
  state.sondaggi = 88;

  const q = new QuestScene(stack, input, state);
  stack.push(q);
  const frame = () => { stack.update(1/30); stack.draw(screen); input.endFrame(); };
  // Scendi nella lista per mostrare lo scroll fino alle side quest.
  for (let i = 0; i < 8; i++) {
    document.dispatchEvent(new KeyboardEvent("keydown", { code: "ArrowDown", bubbles: true }));
    frame();
    document.dispatchEvent(new KeyboardEvent("keyup", { code: "ArrowDown", bubbles: true }));
  }
  for (let i = 0; i < 4; i++) frame();
  return canvas.toDataURL("image/png");
});

writeFileSync("artifacts/screens/quests_scroll.png", Buffer.from(shot.slice("data:image/png;base64,".length), "base64"));
console.log("salvato quests_scroll.png");
await browser.close();
