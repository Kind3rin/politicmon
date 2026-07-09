// Verifica del DETTAGLIO squadra: navigazione mosse/abilità + box descrizione.
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
  const { createMonster } = await import("/src/game/monster.ts");
  const { PartyScene } = await import("/src/scenes/PartyScene.ts");
  const { audio } = await import("/src/engine/audio.ts");
  audio.enabled = false;

  const canvas = document.createElement("canvas");
  canvas.width = 240; canvas.height = 180;
  const screen = new Screen(canvas);
  const input = new Input();
  const stack = new SceneStack();

  const state = newGameState();
  state.party.push(createMonster("giorgiagon", 30));
  stack.push(new PartyScene(stack, input, state, { mode: "view" }));

  const frame = () => { stack.update(1 / 30); stack.draw(screen); input.endFrame(); };
  const press = (code) => {
    document.dispatchEvent(new KeyboardEvent("keydown", { code, bubbles: true, cancelable: true }));
    frame();
    document.dispatchEvent(new KeyboardEvent("keyup", { code, bubbles: true, cancelable: true }));
    for (let i = 0; i < 4; i++) frame();
  };

  for (let i = 0; i < 6; i++) frame();
  press("KeyZ"); // apri dettaglio (mossa 0 selezionata)
  const move0 = canvas.toDataURL("image/png");
  press("ArrowDown"); press("ArrowDown"); press("ArrowDown"); // scendi alle voci sotto
  const scrolled = canvas.toDataURL("image/png");
  // Vai all'ultima voce (abilità): risali di uno dalla cima
  press("ArrowUp");
  const ability = canvas.toDataURL("image/png");
  return { move0, scrolled, ability };
});

function save(name, dataUrl) {
  writeFileSync(`artifacts/screens/${name}.png`,
    Buffer.from(dataUrl.slice("data:image/png;base64,".length), "base64"));
  console.log(`salvato artifacts/screens/${name}.png`);
}
save("party_detail_move", shots.move0);
save("party_detail_scroll", shots.scrolled);
save("party_detail_ability", shots.ability);
await browser.close();
