// Screenshot del CASINÒ DI PALAZZO: menu e slot in azione.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5179";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
await page.goto(BASE, { waitUntil: "load" });
await page.waitForTimeout(1500);

const shots = await page.evaluate(async () => {
  const { Screen } = await import("/src/engine/screen.ts");
  const { Input } = await import("/src/engine/input.ts");
  const { SceneStack } = await import("/src/engine/scene.ts");
  const { newGameState } = await import("/src/game/state.ts");
  const { CasinoScene } = await import("/src/scenes/CasinoScene.ts");
  const { audio } = await import("/src/engine/audio.ts");
  audio.enabled = false;
  await new Promise((r) => setTimeout(r, 3000)); // attendi PNG cabinet

  const canvas = document.createElement("canvas");
  canvas.width = 240; canvas.height = 180;
  const screen = new Screen(canvas);
  const input = new Input();
  const stack = new SceneStack();
  const state = newGameState();
  state.money = 5000;
  state.chips = 200;
  state.sondaggi = 60;

  const casino = new CasinoScene(stack, input, state);
  stack.push(casino);
  const frame = () => { stack.update(1/30); stack.draw(screen); input.endFrame(); };
  for (let i = 0; i < 4; i++) frame();
  await new Promise((r) => setTimeout(r, 1500)); // attendi cabinet del menu
  for (let i = 0; i < 4; i++) frame();
  const menuShot = canvas.toDataURL("image/png");

  // Forza la modalità slot a rulli fermi con un esito vincente, per vedere il
  // mobile PixelLab dietro i rulli vivi.
  casino.mode = "slot";
  casino.spinning = false;
  casino.reelIdx = [1, 1, 1];
  casino.locked = [true, true, true];
  casino.lastWin = 30;
  for (let i = 0; i < 6; i++) { casino.mode = "slot"; frame(); }
  await new Promise((r) => setTimeout(r, 1500)); // attendi fetch cabinet innescato dal 1° draw-slot
  for (let i = 0; i < 6; i++) { casino.mode = "slot"; frame(); }
  const slotShot = canvas.toDataURL("image/png");
  for (let i = 0; i < 6; i++) { casino.mode = "slot"; frame(); }
  const resultShot = canvas.toDataURL("image/png");
  return { menuShot, slotShot, resultShot };
});

function save(name, dataUrl) {
  writeFileSync(`artifacts/screens/${name}.png`, Buffer.from(dataUrl.slice("data:image/png;base64,".length), "base64"));
}
save("casino_menu", shots.menuShot);
save("casino_slot", shots.slotShot);
save("casino_result", shots.resultShot);
console.log("salvati casino_menu, casino_slot, casino_result");
await browser.close();
