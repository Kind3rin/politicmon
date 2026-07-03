// Screenshot R41 JUICE mondo: ombre ellittiche sotto player/NPC + banner
// BREAKING NEWS. Pattern shot-player.mjs.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5179";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
await page.goto(BASE, { waitUntil: "load" });
await page.waitForTimeout(1500);
const shot = await page.evaluate(async () => {
  const { Screen } = await import("/src/engine/screen.ts");
  const { Input } = await import("/src/engine/input.ts");
  const { SceneStack } = await import("/src/engine/scene.ts");
  const { newGameState } = await import("/src/game/state.ts");
  const { WorldScene } = await import("/src/game/world/WorldScene.ts");
  const { createMonster } = await import("/src/game/monster.ts");
  const { preloadSprites } = await import("/src/engine/assets.ts");
  const { audio } = await import("/src/engine/audio.ts");
  audio.enabled = false;
  preloadSprites({
    "player:south": "chars/player_south.png", "player:north": "chars/player_north.png",
    "player:east": "chars/player_east.png", "player:west": "chars/player_west.png",
    "obj:T": "tiles/tree.png", "obj:s": "tiles/sign.png"
  });
  await new Promise((r) => setTimeout(r, 1800));
  const canvas = document.createElement("canvas");
  canvas.width = 240; canvas.height = 180;
  const screen = new Screen(canvas);
  const input = new Input();

  const state = newGameState();
  state.flags["intro-done"] = true;
  state.party = [createMonster("giorgetta", 18)];
  // Mediopoli ha NPC visibili → ombre su player + NPC nello stesso frame.
  state.pos = { mapId: "mediopoli", x: 10, y: 10, facing: "down" };
  const stack = new SceneStack();
  const world = new WorldScene(stack, input, state);
  stack.push(world);
  for (let i = 0; i < 10; i++) { stack.update(1/30); stack.draw(screen); input.endFrame(); }
  const shadows = canvas.toDataURL("image/png");

  // Banner BREAKING NEWS (metodo privato solo per TS).
  world.showBanner("BREAKING NEWS!", "CRISI DI GOVERNO", "#d04848");
  for (let i = 0; i < 8; i++) { stack.update(1/30); stack.draw(screen); input.endFrame(); }
  const banner = canvas.toDataURL("image/png");

  return { shadows, banner };
});
function save(n, d){
  writeFileSync(`artifacts/screens/${n}.png`, Buffer.from(d.slice("data:image/png;base64,".length),"base64"));
  console.log(`salvato artifacts/screens/${n}.png`);
}
save("r41-world-shadows", shot.shadows);
save("r41-banner-breaking", shot.banner);
await browser.close();
