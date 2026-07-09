// Verifica menu CAMPAGNA in battaglia (griglia azioni + desc, niente overflow).
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
  const { BattleScene } = await import("/src/game/battle/BattleScene.ts");
  const { audio } = await import("/src/engine/audio.ts");
  audio.enabled = false;
  const canvas = document.createElement("canvas");
  canvas.width = 240; canvas.height = 180;
  const screen = new Screen(canvas);
  const input = new Input();
  const stack = new SceneStack();
  const state = newGameState();
  state.sondaggi = 93;
  state.party.push(createMonster("giorgetta", 20));
  const battle = new BattleScene(stack, input, { state, foeTeam: [createMonster("bunkerput", 9)], onEnd: () => undefined });
  stack.push(battle);
  const frame = () => { stack.update(1/30); stack.draw(screen); input.endFrame(); };
  const press = (code) => {
    document.dispatchEvent(new KeyboardEvent("keydown", { code, bubbles: true }));
    frame();
    document.dispatchEvent(new KeyboardEvent("keyup", { code, bubbles: true }));
    for (let i=0;i<6;i++) frame();
  };
  for (let g=0; g<400 && battle.mode !== "menu"; g++) { if (g%4===0) press("KeyZ"); else frame(); }
  for (let i=0;i<10;i++) frame();
  // AZIONE? menu: CAMPAGNA è in basso-destra (indice 3). Giù + destra.
  press("ArrowDown"); press("ArrowRight"); // -> CAMPAGNA
  press("KeyZ"); // apri
  press("ArrowRight"); // seleziona RUSPA (desc lunga a 2 righe)
  for (let i=0;i<8;i++) frame();
  return canvas.toDataURL("image/png");
});
writeFileSync("artifacts/screens/battle_campaign.png", Buffer.from(shot.slice("data:image/png;base64,".length), "base64"));
console.log("salvato artifacts/screens/battle_campaign.png");
await browser.close();
