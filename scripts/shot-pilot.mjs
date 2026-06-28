// Screenshot pilota redesign PixelLab: battaglia con mostro PNG (salvinator) +
// mappa con tileset/player PNG. Serve a validare lo stile DENTRO il gioco.
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
  const { createMonster } = await import("/src/game/monster.ts");
  const { BattleScene } = await import("/src/game/battle/BattleScene.ts");
  const { monsterImage } = await import("/src/art/monsters.ts");
  const { audio } = await import("/src/engine/audio.ts");
  audio.enabled = false;

  // Preload mostro + sfondo battaglia + cornice 9-slice.
  const { preloadSprites, loadPanelImage } = await import("/src/engine/assets.ts");
  monsterImage("giorgiagon");
  preloadSprites({ "battle:bg": "ui/battle_bg.png" });
  await new Promise((r) => setTimeout(r, 1400));

  const canvas = document.createElement("canvas");
  canvas.width = 240; canvas.height = 180;
  const screen = new Screen(canvas);
  loadPanelImage((img, b) => screen.setPanelImage(img, b), "ui/dialog.png", 18);
  await new Promise((r) => setTimeout(r, 1000));
  const input = new Input();
  const stack = new SceneStack();

  const state = newGameState();
  state.party.push(createMonster("giorgetta", 22));
  const battle = new BattleScene(stack, input, {
    state,
    foeTeam: [createMonster("giorgiagon", 20)],
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
  for (let guard = 0; guard < 400 && battle.mode !== "menu"; guard++) {
    if (guard % 4 === 0) press("KeyZ"); else frame();
  }
  for (let i = 0; i < 30; i++) frame();
  const battleShot = canvas.toDataURL("image/png");
  return { battleShot };
});

function save(name, dataUrl) {
  writeFileSync(`artifacts/screens/${name}.png`,
    Buffer.from(dataUrl.slice("data:image/png;base64,".length), "base64"));
  console.log(`salvato artifacts/screens/${name}.png`);
}
save("pilot_battle", shots.battleShot);
await browser.close();
