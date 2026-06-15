// Screenshot di verifica: battaglia (nuovo bilanciamento) + HUD sondaggi del mondo.
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
  const { BattleScene } = await import("/src/game/battle/BattleScene.ts");
  const { WorldScene } = await import("/src/game/world/WorldScene.ts");
  const { AchievementsScene } = await import("/src/scenes/AchievementsScene.ts");
  const { createMonster } = await import("/src/game/monster.ts");
  const { audio } = await import("/src/engine/audio.ts");
  audio.enabled = false;

  const canvas = document.createElement("canvas");
  canvas.width = 240; canvas.height = 180;
  const screen = new Screen(canvas);
  const input = new Input();
  const frameOf = (stack) => { stack.update(1/30); stack.draw(screen); input.endFrame(); };

  // --- Battaglia ---
  const state = newGameState();
  state.sondaggi = 58;
  state.party = [createMonster("giorgetta", 12)];
  const battleStack = new SceneStack();
  const battle = new BattleScene(battleStack, input, {
    state, foeTeam: [createMonster("salvinott", 11)],
    onEnd: () => {}
  });
  battleStack.push(battle);
  for (let i = 0; i < 90; i++) frameOf(battleStack); // oltre l'intro a cerchio
  const battleShot = canvas.toDataURL("image/png");

  // --- Mondo con HUD sondaggi ---
  const wstate = newGameState();
  wstate.sondaggi = 72;
  wstate.party = [createMonster("giorgetta", 12)];
  const worldStack = new SceneStack();
  const world = new WorldScene(worldStack, input, wstate);
  worldStack.push(world);
  for (let i = 0; i < 30; i++) frameOf(worldStack);
  const worldShot = canvas.toDataURL("image/png");

  // --- Schermata TRAGUARDI (alcuni sbloccati) ---
  const astate = newGameState();
  astate.flags["ach:first-blood"] = true;
  astate.flags["ach:first-catch"] = true;
  astate.flags["ach:first-badge"] = true;
  astate.flags["ach:treasure-hunter"] = true;
  const achStack = new SceneStack();
  achStack.push(new AchievementsScene(achStack, input, astate));
  for (let i = 0; i < 4; i++) frameOf(achStack);
  const achShot = canvas.toDataURL("image/png");

  return { battleShot, worldShot, achShot };
});

function save(name, dataUrl) {
  writeFileSync(`artifacts/screens/${name}.png`, Buffer.from(dataUrl.slice("data:image/png;base64,".length), "base64"));
}
save("verify_battle", shots.battleShot);
save("verify_world_hud", shots.worldShot);
save("verify_achievements", shots.achShot);
console.log("salvati verify_battle, verify_world_hud, verify_achievements");
await browser.close();
