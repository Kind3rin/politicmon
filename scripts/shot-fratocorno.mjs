import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5179";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
await page.goto(BASE, { waitUntil: "load" }); await page.waitForTimeout(1000);
const shots = await page.evaluate(async () => {
  const { Screen } = await import("/src/engine/screen.ts");
  const { Input } = await import("/src/engine/input.ts");
  const { SceneStack } = await import("/src/engine/scene.ts");
  const { newGameState } = await import("/src/game/state.ts");
  const { createMonster } = await import("/src/game/monster.ts");
  const { DEX_ORDER } = await import("/src/data/species.ts");
  const { DexScene } = await import("/src/scenes/DexScene.ts");
  const { BattleScene } = await import("/src/game/battle/BattleScene.ts");
  const { EvolutionScene } = await import("/src/scenes/EvolutionScene.ts");
  const { monsterImage } = await import("/src/art/monsters.ts");
  const { waitForSprites, spriteStatus } = await import("/src/engine/assets.ts");
  const { preloadCoreSprites } = await import("/src/engine/preload.ts");
  await preloadCoreSprites();
  for (const id of ["fratocorno", "campocorno"]) { monsterImage(id); monsterImage(id, true); }
  await waitForSprites(["mon:fratocorno", "mon:fratocorno_action", "mon:campocorno", "mon:campocorno_action"], 4000);
  const render = (scene) => { const canvas = document.createElement("canvas"); canvas.width = 240; canvas.height = 180; const screen = new Screen(canvas); scene.draw(screen); return canvas.toDataURL("image/png"); };
  const input = new Input(); const stack = new SceneStack();
  const dexState = newGameState(); dexState.dex.campocorno = "caught";
  const dex = new DexScene(stack, input, dexState); dex.index = DEX_ORDER.indexOf("campocorno"); dex.detail = true;
  const battleState = newGameState(); battleState.party = [createMonster("campocorno", 38)];
  const battle = new BattleScene(stack, input, { state: battleState, foeTeam: [createMonster("fratocorno", 30)], onEnd: () => {} });
  battle.queue = []; battle.mode = "menu"; battle.introT = 1; battle.firstSeenBanner = 0; battle.fx.lungeT.player = 0.2;
  const evolution = new EvolutionScene(stack, input, "fratocorno", "campocorno", () => {}); evolution.phase = 3; evolution.time = 1;
  return { images: { evolution: render(evolution), dex: render(dex), battle: render(battle) }, debug: { front: [spriteStatus("mon:campocorno"), monsterImage("campocorno")?.naturalWidth ?? 0], action: [spriteStatus("mon:campocorno_action"), monsterImage("campocorno", true)?.naturalWidth ?? 0] } };
});
mkdirSync("artifacts/screens", { recursive: true }); console.log(JSON.stringify(shots.debug));
for (const [name, dataUrl] of Object.entries(shots.images)) { const path = `artifacts/screens/fratocorno_${name}.png`; writeFileSync(path, Buffer.from(dataUrl.slice("data:image/png;base64,".length), "base64")); console.log(`salvato ${path}`); }
await browser.close();
