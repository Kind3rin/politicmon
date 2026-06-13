// Cattura frame d'animazione della battaglia: idle (respiro) e affondo (squash).
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
  const { BattleScene } = await import("/src/game/battle/BattleScene.ts");
  const { audio } = await import("/src/engine/audio.ts");
  audio.enabled = false;

  const canvas = document.createElement("canvas");
  canvas.width = 240; canvas.height = 180;
  const screen = new Screen(canvas);
  const input = new Input();
  const stack = new SceneStack();
  const state = newGameState();
  state.party.push(createMonster("giorgetta", 22)); // starter -> ha frame d'azione
  const battle = new BattleScene(stack, input, {
    state, foeTeam: [createMonster("renzino", 20)], onEnd: () => undefined
  });
  stack.push(battle);
  const frame = () => { stack.update(1/30); stack.draw(screen); input.endFrame(); };
  const press = (code) => {
    document.dispatchEvent(new KeyboardEvent("keydown", { code, bubbles: true }));
    frame();
    document.dispatchEvent(new KeyboardEvent("keyup", { code, bubbles: true }));
    for (let i = 0; i < 4; i++) frame();
  };

  // Avanza fino al menu.
  for (let g = 0; g < 400 && battle.mode !== "menu"; g++) { if (g % 4 === 0) press("KeyZ"); else frame(); }
  // Idle a due istanti diversi (per vedere il respiro).
  for (let i = 0; i < 6; i++) frame();
  const idleA = canvas.toDataURL("image/png");
  for (let i = 0; i < 20; i++) frame();
  const idleB = canvas.toDataURL("image/png");

  // Forza l'affondo del player al picco e disegna (più affidabile dell'input).
  battle.lungeT.player = 0.15;
  stack.draw(screen);
  const lungeShot = canvas.toDataURL("image/png");
  return { idleA, idleB, lungeShot };
});

function save(name, dataUrl) {
  if (!dataUrl) { console.log(`(nessun frame per ${name})`); return; }
  writeFileSync(`artifacts/screens/${name}.png`, Buffer.from(dataUrl.slice("data:image/png;base64,".length), "base64"));
}
save("anim_idle_a", shots.idleA);
save("anim_idle_b", shots.idleB);
save("anim_lunge", shots.lungeShot);
console.log("done", { lunge: !!shots.lungeShot });
await browser.close();
