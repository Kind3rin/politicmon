// Screenshot LOTTO 3 (Round 42 ECONOMIA): MONUMENTO AL CANDIDATO (livelli 0/2/3)
// e una battaglia contro un boss UE in HARD MODE (per vedere l'asso col GILET).
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5179";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
await page.goto(BASE, { waitUntil: "load" });
await page.waitForTimeout(2000);

const shots = await page.evaluate(async () => {
  const { Screen } = await import("/src/engine/screen.ts");
  const { Input } = await import("/src/engine/input.ts");
  const { SceneStack } = await import("/src/engine/scene.ts");
  const { newGameState } = await import("/src/game/state.ts");
  const { createMonster } = await import("/src/game/monster.ts");
  const { MonumentScene } = await import("/src/scenes/MonumentScene.ts");
  const { BattleScene } = await import("/src/game/battle/BattleScene.ts");
  const { TRAINERS } = await import("/src/data/trainers.ts");
  const { audio } = await import("/src/engine/audio.ts");
  audio.enabled = false;
  await new Promise((r) => setTimeout(r, 2500)); // attendi i PNG dei mostri

  const canvas = document.createElement("canvas");
  canvas.width = 240; canvas.height = 180;
  const screen = new Screen(canvas);
  const input = new Input();

  const monumentShot = (level) => {
    const stack = new SceneStack();
    const st = newGameState();
    st.money = 100000;
    st.monumentLevel = level;
    const scene = new MonumentScene(stack, input, st);
    stack.push(scene);
    for (let i = 0; i < 4; i++) { stack.update(1 / 30); stack.draw(screen); input.endFrame(); }
    return canvas.toDataURL("image/png");
  };
  const mon0 = monumentShot(0);
  const mon2 = monumentShot(2);
  const mon3 = monumentShot(3);

  // Battaglia HARD contro un boss UE: l'asso ha il GILET, IA boss-grade.
  const stack = new SceneStack();
  const st = newGameState();
  st.hardMode = true;
  st.badges = ["a", "b", "c"];
  st.party.push(createMonster("draghimon", 55));
  const bossDef = TRAINERS["commissione"];
  const team = bossDef.team.map(([id, lv, mv, held]) => {
    const m = createMonster(id, Math.min(60, lv + 5));
    if (held) m.heldItem = held;
    return m;
  });
  const battle = new BattleScene(stack, input, { state: st, foeTeam: team, trainer: bossDef, onEnd: () => {} });
  stack.push(battle);
  const frame = () => { stack.update(1 / 30); stack.draw(screen); input.endFrame(); };
  const press = (code) => {
    document.dispatchEvent(new KeyboardEvent("keydown", { code, bubbles: true, cancelable: true }));
    frame();
    document.dispatchEvent(new KeyboardEvent("keyup", { code, bubbles: true, cancelable: true }));
    for (let i = 0; i < 4; i++) frame();
  };
  // Drena l'intro (dialoghi) fino al menu azioni premendo A (KeyZ).
  for (let g = 0; g < 800 && battle.mode !== "menu"; g++) {
    if (g % 4 === 0) press("KeyZ"); else frame();
  }
  await new Promise((r) => setTimeout(r, 800));
  for (let i = 0; i < 6; i++) frame();
  const hardBoss = canvas.toDataURL("image/png");

  return { mon0, mon2, mon3, hardBoss, mode: battle.mode };
});

function save(name, dataUrl) {
  writeFileSync(`artifacts/screens/${name}.png`, Buffer.from(dataUrl.slice("data:image/png;base64,".length), "base64"));
}
save("r42-lotto3-monument-0", shots.mon0);
save("r42-lotto3-monument-2", shots.mon2);
save("r42-lotto3-monument-3", shots.mon3);
save("r42-lotto3-hardmode-boss", shots.hardBoss);
console.log("salvati r42-lotto3-monument-0/2/3 e r42-lotto3-hardmode-boss (battle.mode=" + shots.mode + ")");
await browser.close();
