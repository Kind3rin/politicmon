// Screenshot del CASINÒ DI PALAZZO: menu e slot in azione.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5179";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
await page.goto(BASE, { waitUntil: "networkidle" });

const shots = await page.evaluate(async () => {
  const { Screen } = await import("/src/engine/screen.ts");
  const { Input } = await import("/src/engine/input.ts");
  const { SceneStack } = await import("/src/engine/scene.ts");
  const { newGameState } = await import("/src/game/state.ts");
  const { CasinoScene } = await import("/src/scenes/CasinoScene.ts");
  const { audio } = await import("/src/engine/audio.ts");
  audio.enabled = false;

  const canvas = document.createElement("canvas");
  canvas.width = 240; canvas.height = 180;
  const screen = new Screen(canvas);
  const input = new Input();
  const stack = new SceneStack();
  const state = newGameState();
  state.money = 5000;
  state.sondaggi = 60;

  const casino = new CasinoScene(stack, input, state);
  stack.push(casino);
  const frame = () => { stack.update(1/30); stack.draw(screen); input.endFrame(); };
  for (let i = 0; i < 4; i++) frame();
  const menuShot = canvas.toDataURL("image/png");

  // Avvia slot e cattura mentre i rulli girano.
  const press = (code) => {
    document.dispatchEvent(new KeyboardEvent("keydown", { code, bubbles: true, cancelable: true }));
    frame();
    document.dispatchEvent(new KeyboardEvent("keyup", { code, bubbles: true, cancelable: true }));
    frame();
  };
  press("KeyZ"); // seleziona SLOT
  for (let i = 0; i < 10; i++) frame(); // rulli in movimento
  const slotShot = canvas.toDataURL("image/png");
  // Lascia fermare i rulli per l'esito.
  for (let i = 0; i < 60; i++) frame();
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
