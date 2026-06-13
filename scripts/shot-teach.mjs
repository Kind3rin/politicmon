// Screenshot della scena DIRETTIVA DI PARTITO (sostituzione mossa).
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
  const { createMonster } = await import("/src/game/monster.ts");
  const { TeachScene } = await import("/src/scenes/TeachScene.ts");
  const { audio } = await import("/src/engine/audio.ts");
  audio.enabled = false;

  const canvas = document.createElement("canvas");
  canvas.width = 240; canvas.height = 180;
  const screen = new Screen(canvas);
  const input = new Input();
  const stack = new SceneStack();
  const state = newGameState();

  const mon = createMonster("salvinator", 30);
  mon.moves = [
    { id: "ruspa", pp: 15 }, { id: "citofonata", pp: 20 },
    { id: "blocconavale", pp: 10 }, { id: "mojito", pp: 10 }
  ];
  state.party.push(mon);

  const teach = new TeachScene(stack, input, mon, "vaffa", () => {});
  stack.push(teach);
  for (let i = 0; i < 6; i++) { stack.update(1 / 30); stack.draw(screen); input.endFrame(); }
  return canvas.toDataURL("image/png");
});

writeFileSync("artifacts/screens/teach_directive.png",
  Buffer.from(shot.slice("data:image/png;base64,".length), "base64"));
console.log("salvato teach_directive.png");
await browser.close();
