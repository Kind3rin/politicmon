// Verifica schermata "Quale dimentichi?" con confronto NUOVA vs SCARTI.
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
  const { Menu } = await import("/src/ui/widgets.ts");
  const { MOVES } = await import("/src/data/moves.ts");
  const { audio } = await import("/src/engine/audio.ts");
  audio.enabled = false;
  const canvas = document.createElement("canvas");
  canvas.width = 240; canvas.height = 180;
  const screen = new Screen(canvas);
  const input = new Input();
  const stack = new SceneStack();
  const state = newGameState();
  const mon = createMonster("giorgetta", 24); // ha 4 mosse
  state.party.push(mon);
  const battle = new BattleScene(stack, input, { state, foeTeam: [createMonster("renzino", 10)], onEnd: () => undefined });
  stack.push(battle);
  const frame = () => { stack.update(1/30); stack.draw(screen); input.endFrame(); };
  const press = (code) => {
    document.dispatchEvent(new KeyboardEvent("keydown", { code, bubbles: true }));
    frame();
    document.dispatchEvent(new KeyboardEvent("keyup", { code, bubbles: true }));
    for (let i=0;i<4;i++) frame();
  };
  // Completa intro fino al menu AZIONE.
  for (let g=0; g<400 && battle.mode !== "menu"; g++) { if (g%4===0) press("KeyZ"); else frame(); }
  for (let i=0;i<10;i++) frame();
  // Forza la schermata "quale dimentichi": inietta i passi di apprendimento.
  battle.pendingLearnMoveId = "fiammatricolore";
  battle.mode = "fight";
  battle.onFightSelect = () => {};
  battle.fightMenu = new Menu(mon.moves.map((s) => ({ label: MOVES[s.id].name })));
  battle.fightMenu.index = 1; // punta alla 2a mossa da scartare
  battle.fightEff = mon.moves.map(() => null);
  for (let i = 0; i < 4; i++) frame();
  return canvas.toDataURL("image/png");
});
writeFileSync("artifacts/screens/learnmove.png", Buffer.from(shot.slice("data:image/png;base64,".length), "base64"));
console.log("salvato artifacts/screens/learnmove.png");
await browser.close();
