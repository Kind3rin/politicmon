import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
const BASE = "http://127.0.0.1:5179";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 480, height: 720 } });
await page.goto(BASE, { waitUntil: "networkidle" });
const shot = await page.evaluate(async () => {
  const { Screen } = await import("/src/engine/screen.ts");
  const { Input } = await import("/src/engine/input.ts");
  const { SceneStack } = await import("/src/engine/scene.ts");
  const { newGameState } = await import("/src/game/state.ts");
  const { createMonster } = await import("/src/game/monster.ts");
  const { WorldScene } = await import("/src/game/world/WorldScene.ts");
  const { audio } = await import("/src/engine/audio.ts");
  audio.enabled = false;
  const canvas = document.createElement("canvas"); canvas.width=240; canvas.height=180;
  const screen = new Screen(canvas); const input = new Input(); const stack = new SceneStack();
  const state = newGameState();
  state.flags["intro-done"]=true; state.flags["dex-received"]=true; state.starterId="giorgetta";
  state.party.push(createMonster("giorgetta", 12)); state.rivalWins = 1;
  // Posiziono il player accanto al rivale (22,7) per inquadrarlo bene.
  state.pos = { mapId: "mediopoli", x: 20, y: 8, facing: "up" };
  const world = new WorldScene(stack, input, state);
  stack.push(world);
  for (let i=0;i<8;i++){ stack.update(1/30); stack.draw(screen); input.endFrame(); }
  return canvas.toDataURL("image/png");
});
writeFileSync("artifacts/screens/rival_mediopoli.png", Buffer.from(shot.slice(22),"base64"));
console.log("salvato rival_mediopoli.png");
await browser.close();
process.exit(0);
