// Screenshot di verifica del nuovo layout battaglia (menu 2x2 + striscia info).
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
  audio.enabled = false; // niente musica dalla scheda di test

  const canvas = document.createElement("canvas");
  canvas.width = 240; canvas.height = 180;
  const screen = new Screen(canvas);
  const input = new Input();
  const stack = new SceneStack();

  const state = newGameState();
  state.party.push(createMonster("giorgetta", 20));
  state.dex["renzino"] = "caught"; // mostra i marker di efficacia
  const battle = new BattleScene(stack, input, {
    state,
    foeTeam: [createMonster("renzino", 18)],
    onEnd: () => undefined
  });
  stack.push(battle);

  const frame = () => { stack.update(1 / 30); stack.draw(screen); input.endFrame(); };
  const press = (code) => {
    document.dispatchEvent(new KeyboardEvent("keydown", { code, bubbles: true, cancelable: true }));
    frame();
    document.dispatchEvent(new KeyboardEvent("keyup", { code, bubbles: true, cancelable: true }));
    for (let i = 0; i < 6; i++) frame();
  };

  // Avanza l'intro premendo A solo finché siamo in coda messaggi.
  // (la proprietà "mode" è privata solo per TypeScript)
  for (let guard = 0; guard < 400 && battle.mode !== "menu"; guard++) {
    if (guard % 4 === 0) press("KeyZ"); else frame();
  }
  for (let i = 0; i < 20; i++) frame();
  const menuShot = canvas.toDataURL("image/png");

  // Apri LOTTA e scendi alla seconda riga di mosse.
  press("KeyZ");
  press("ArrowDown");
  for (let i = 0; i < 10; i++) frame();
  const fightShot = canvas.toDataURL("image/png");
  return { menuShot, fightShot, mode: battle.mode };
});

function save(name, dataUrl) {
  writeFileSync(`artifacts/screens/${name}.png`,
    Buffer.from(dataUrl.slice("data:image/png;base64,".length), "base64"));
  console.log(`salvato artifacts/screens/${name}.png`);
}
save("battle_menu_v2", shots.menuShot);
save("battle_fight_v2", shots.fightShot);
await browser.close();
