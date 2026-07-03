// Screenshot di verifica del LOTTO 2 JUICE (Round 41): numeri di danno
// flottanti in battaglia, tint meteo (sondaggi 85 governo / 30 opposizione),
// ombre nel mondo, banner BREAKING NEWS. Pattern shot-battle.mjs.
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

  const shots = {};

  const runBattle = (sondaggi) => {
    const stack = new SceneStack();
    const state = newGameState();
    state.sondaggi = sondaggi;
    state.party.push(createMonster("giorgetta", 22));
    state.dex["renzino"] = "caught";
    const battle = new BattleScene(stack, input, {
      state,
      foeTeam: [createMonster("renzino", 20)],
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
    // Salta l'intro fino al menu.
    for (let guard = 0; guard < 500 && battle.mode !== "menu"; guard++) {
      if (guard % 4 === 0) press("KeyZ"); else frame();
    }
    return { battle, state, frame, press, tint: canvas.toDataURL("image/png") };
  };

  // 1) TINT METEO — sondaggi 85 (governo, velo dorato): screenshot al menu,
  //    sfondo visibile senza sprite che coprono.
  const gov = runBattle(85);
  shots.tintGov = gov.tint;

  // 2) NUMERI DI DANNO — usa il VERO percorso di produzione (fx.onHit, la
  //    stessa chiamata che BattleScene.moveSteps fa a ogni colpo) per spawnare
  //    i numeri flottanti, poi cattura il frame mentre salgono. Verifica il
  //    rendering senza dover vincere la corsa con la coda di step.
  const frame = gov.frame, battle = gov.battle;
  // Colpo normale (nemico verso player) + super-efficace/crit (player verso
  // nemico), così si vedono i colori diversi (bianco vs oro/rosso).
  battle.fx.onHit("foe", 1, false, 14);      // danno normale sul player
  battle.fx.onHit("player", 2, true, 38);    // super+crit sul nemico (oro/rosso)
  for (let i = 0; i < 4; i++) frame();        // lascia salire i numeri
  shots.damageNumbers = canvas.toDataURL("image/png");

  // 3) TINT METEO — sondaggi 30 (opposizione, velo rosso-piazza).
  const opp = runBattle(30);
  shots.tintOpp = opp.tint;

  return shots;
});

function save(name, dataUrl) {
  if (!dataUrl) { console.log(`(saltato ${name})`); return; }
  writeFileSync(`artifacts/screens/${name}.png`,
    Buffer.from(dataUrl.slice("data:image/png;base64,".length), "base64"));
  console.log(`salvato artifacts/screens/${name}.png`);
}
save("r41-tint-governo", shots.tintGov);
save("r41-damage-numbers", shots.damageNumbers);
save("r41-tint-opposizione", shots.tintOpp);
await browser.close();
