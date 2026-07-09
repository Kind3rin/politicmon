// Verifica prompt "Vuoi cambiare?" dopo KO di un foe di un trainer (stile Pokemon).
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
  // Party con 2 mon sani (serve la panchina per far comparire il prompt).
  state.party.push(createMonster("giorgetta", 20));
  state.party.push(createMonster("giorgiagon", 22));
  const trainer = { id: "aide", name: "PORTABORSE", money: 200, intro: ["Ehi!"], defeat: ["Uff."], team: [] };
  const battle = new BattleScene(stack, input, {
    state,
    foeTeam: [createMonster("renzino", 10), createMonster("renzino", 12)],
    trainer,
    onEnd: () => undefined
  });
  stack.push(battle);
  const frame = () => { stack.update(1/30); stack.draw(screen); input.endFrame(); };
  const press = (code) => {
    document.dispatchEvent(new KeyboardEvent("keydown", { code, bubbles: true }));
    frame();
    document.dispatchEvent(new KeyboardEvent("keyup", { code, bubbles: true }));
    for (let i=0;i<4;i++) frame();
  };
  // Completa intro.
  for (let g=0; g<400 && battle.mode !== "menu"; g++) { if (g%4===0) press("KeyZ"); else frame(); }
  // Forza il KO del primo foe e invoca afterFoeDown (via accesso runtime).
  battle.foe.mon.hp = 0;
  battle.afterFoeDown();
  // Avanza i messaggi ("manda in campo...") fino al prompt "Vuoi cambiare?".
  for (let g=0; g<40 && battle.mode !== "ask"; g++) { press("KeyZ"); }
  for (let i=0;i<6;i++) frame();
  return canvas.toDataURL("image/png");
});
writeFileSync("artifacts/screens/switch_prompt.png", Buffer.from(shot.slice("data:image/png;base64,".length),"base64"));
console.log("salvato switch_prompt");
await browser.close();
