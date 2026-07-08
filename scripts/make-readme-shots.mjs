// Rigenera gli screenshot del README (docs/img/title.png, world.png, battle.png)
// con la grafica attuale. Cattura a 240x180 e upscala 4x nearest (960x720).
// Uso: dev server attivo, poi `node scripts/make-readme-shots.mjs`.
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
  const { WorldScene } = await import("/src/game/world/WorldScene.ts");
  const { BattleScene } = await import("/src/game/battle/BattleScene.ts");
  const { TitleScene } = await import("/src/scenes/TitleScene.ts");
  const { createMonster } = await import("/src/game/monster.ts");
  const { audio } = await import("/src/engine/audio.ts");
  audio.enabled = false;

  const canvas = document.createElement("canvas");
  canvas.width = 240; canvas.height = 180;
  const screen = new Screen(canvas);
  const big = document.createElement("canvas");
  big.width = 960; big.height = 720;
  const bctx = big.getContext("2d");
  bctx.imageSmoothingEnabled = false;
  const grab = () => { bctx.drawImage(canvas, 0, 0, 960, 720); return big.toDataURL("image/png"); };
  const out = {};

  // --- TITLE ---
  {
    const input = new Input();
    const stack = new SceneStack();
    stack.push(new TitleScene(stack, input));
    const frame = () => { stack.update(1 / 30); stack.draw(screen); input.endFrame(); };
    for (let i = 0; i < 60; i++) { frame(); await new Promise((r) => setTimeout(r, 30)); }
    out.title = grab();
  }

  // --- WORLD ---
  {
    const input = new Input();
    const state = newGameState();
    state.flags["intro-done"] = true;
    state.party = [createMonster("giorgetta", 18)];
    state.pos = { mapId: "mediopoli", x: 10, y: 10, facing: "down" };
    const stack = new SceneStack();
    stack.push(new WorldScene(stack, input, state));
    const frame = () => { stack.update(1 / 30); stack.draw(screen); input.endFrame(); };
    for (let i = 0; i < 90; i++) { frame(); await new Promise((r) => setTimeout(r, 25)); }
    out.world = grab();
  }

  // --- BATTLE ---
  {
    const input = new Input();
    const state = newGameState();
    state.party = [createMonster("giorgetta", 22)];
    const stack = new SceneStack();
    const battle = new BattleScene(stack, input, {
      state, foeTeam: [createMonster("renzino", 20)], onEnd: () => undefined,
    });
    stack.push(battle);
    const frame = () => { stack.update(1 / 30); stack.draw(screen); input.endFrame(); };
    const press = (code) => {
      document.dispatchEvent(new KeyboardEvent("keydown", { code, bubbles: true }));
      frame();
      document.dispatchEvent(new KeyboardEvent("keyup", { code, bubbles: true }));
    };
    for (let g = 0; g < 500 && battle.mode !== "menu"; g++) {
      if (g % 5 === 0) press("KeyZ"); else frame();
      if (g % 10 === 0) await new Promise((r) => setTimeout(r, 10));
    }
    // lascia svanire l'overlay "UN VOLTO MAI VISTO!" prima dello scatto
    for (let i = 0; i < 150; i++) { frame(); if (i % 10 === 0) await new Promise((r) => setTimeout(r, 10)); }
    out.battle = grab();
  }
  return out;
});

for (const [name, dataUrl] of Object.entries(shots)) {
  writeFileSync(`docs/img/${name}.png`,
    Buffer.from(dataUrl.slice("data:image/png;base64,".length), "base64"));
  console.log(`salvato docs/img/${name}.png`);
}
await browser.close();
