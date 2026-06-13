// Screenshot a viewport mobile dei testi corretti (casinò + Dex dettaglio).
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const BASE = "http://127.0.0.1:5179";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
await page.goto(BASE, { waitUntil: "networkidle" });

const shots = await page.evaluate(async () => {
  const { Screen } = await import("/src/engine/screen.ts");
  const { Input } = await import("/src/engine/input.ts");
  const { SceneStack } = await import("/src/engine/scene.ts");
  const { newGameState } = await import("/src/game/state.ts");
  const { CasinoScene } = await import("/src/scenes/CasinoScene.ts");
  const { DexScene } = await import("/src/scenes/DexScene.ts");
  const { audio } = await import("/src/engine/audio.ts");
  audio.enabled = false;
  const out = {};

  const render = (make, ticks) => {
    const canvas = document.createElement("canvas");
    canvas.width = 240; canvas.height = 180;
    const screen = new Screen(canvas);
    const input = new Input();
    const stack = new SceneStack();
    const state = newGameState();
    state.money = 5000; state.sondaggi = 60;
    // Sblocca il Dex e segna qualche specie vista/non-eletta per il dettaglio.
    state.dex = { giorgetta: "caught", renzino: "seen" };
    const scene = make(stack, input, state);
    stack.push(scene);
    for (let i = 0; i < ticks; i++) { stack.update(1/30); stack.draw(screen); input.endFrame(); }
    return { canvas, stack, input, screen };
  };

  // Casinò: schermata menu con la riga di testo corretta.
  out.casino = render((st, inp, s) => new CasinoScene(st, inp, s), 5).canvas.toDataURL("image/png");

  // Dex dettaglio: entra nel dettaglio di una specie NON eletta (riga "(Non ancora nella tua squadra)").
  const dex = render((st, inp, s) => new DexScene(st, inp, s), 3);
  // Premi A per aprire il dettaglio della prima voce.
  const press = (code) => {
    document.dispatchEvent(new KeyboardEvent("keydown", { code, bubbles: true }));
    dex.stack.update(1/30); dex.stack.draw(dex.screen); dex.input.endFrame();
    document.dispatchEvent(new KeyboardEvent("keyup", { code, bubbles: true }));
    for (let i = 0; i < 3; i++) { dex.stack.update(1/30); dex.stack.draw(dex.screen); dex.input.endFrame(); }
  };
  press("KeyZ");
  out.dex = dex.canvas.toDataURL("image/png");
  return out;
});

function save(name, url) {
  writeFileSync(`artifacts/screens/${name}.png`, Buffer.from(url.slice(22), "base64"));
}
save("uifix_casino", shots.casino);
save("uifix_dex", shots.dex);
console.log("salvati uifix_casino, uifix_dex");
await browser.close();
process.exit(0);
