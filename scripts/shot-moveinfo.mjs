// Screenshot del menu mosse con la nuova riga di riepilogo (cosa fa la mossa).
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

  // Squadra con mosse di tipo diverso: COMIZIO (danno), SLOGAN (debuff difesa),
  // IO SONO GIORGIA (buff attacco), CITOFONATA (danno + status).
  const state = newGameState();
  const mon = createMonster("giorgetta", 20);
  mon.moves = [
    { id: "comizio", pp: 35 },
    { id: "slogan", pp: 30 },
    { id: "iosonogiorgia", pp: 10 },
    { id: "citofonata", pp: 20 }
  ];
  state.party.push(mon);
  state.dex["renzino"] = "caught";

  const battle = new BattleScene(stack, input, {
    state, foeTeam: [createMonster("renzino", 18)], onEnd: () => undefined
  });
  stack.push(battle);

  const frame = () => { stack.update(1 / 30); stack.draw(screen); input.endFrame(); };
  const press = (code) => {
    document.dispatchEvent(new KeyboardEvent("keydown", { code, bubbles: true, cancelable: true }));
    frame();
    document.dispatchEvent(new KeyboardEvent("keyup", { code, bubbles: true, cancelable: true }));
    for (let i = 0; i < 6; i++) frame();
  };

  for (let g = 0; g < 400 && battle.mode !== "menu"; g++) {
    if (g % 4 === 0) press("KeyZ"); else frame();
  }
  press("KeyZ"); // apri LOTTA

  const out = {};
  // Mossa 0: COMIZIO (danno puro)
  for (let i = 0; i < 6; i++) frame();
  out.danno = canvas.toDataURL("image/png");
  // Mossa 1: SLOGAN (debuff)
  press("ArrowRight");
  for (let i = 0; i < 6; i++) frame();
  out.debuff = canvas.toDataURL("image/png");
  // Mossa 2: IO SONO GIORGIA (buff self)
  press("ArrowDown");
  press("ArrowLeft");
  for (let i = 0; i < 6; i++) frame();
  out.buff = canvas.toDataURL("image/png");
  // Mossa 3: CITOFONATA (danno + status)
  press("ArrowRight");
  for (let i = 0; i < 6; i++) frame();
  out.status = canvas.toDataURL("image/png");
  return out;
});

function save(name, dataUrl) {
  writeFileSync(`artifacts/screens/${name}.png`,
    Buffer.from(dataUrl.slice("data:image/png;base64,".length), "base64"));
}
for (const [k, v] of Object.entries(shots)) save(`moveinfo_${k}`, v);
console.log("salvati:", Object.keys(shots).join(", "));
await browser.close();
