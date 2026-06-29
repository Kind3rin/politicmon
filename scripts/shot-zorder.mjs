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
  const { WorldScene } = await import("/src/game/world/WorldScene.ts");
  const { createMonster } = await import("/src/game/monster.ts");
  const { loadWangSet } = await import("/src/engine/assets.ts");
  const { registerWangSet } = await import("/src/art/tiles.ts");
  const { audio } = await import("/src/engine/audio.ts");
  audio.enabled = false;
  loadWangSet(registerWangSet, "water_sand", "tiles/wang_water_sand.png", ["z", ".", "=", "~"]);
  await new Promise((r) => setTimeout(r, 3500));
  const canvas = document.createElement("canvas");
  canvas.width = 240; canvas.height = 180;
  const screen = new Screen(canvas);
  const input = new Input();
  // Posiziona il player SOPRA il blocco-casa di borgo per testare lo z-order:
  // borgo riga 10-12 ha "rrrr" (casa) a col 21-24. Mettiamo il player a col 23,
  // riga 10 (sul tetto) e riga 13 (davanti alla porta).
  function shotAt(x, y) {
    const state = newGameState();
    state.flags["intro-done"] = true;
    state.party = [createMonster("giorgetta", 18)];
    state.pos = { mapId: "borgo", x, y, facing: "down" };
    const stack = new SceneStack();
    stack.push(new WorldScene(stack, input, state));
    for (let i = 0; i < 8; i++) { stack.update(1/30); stack.draw(screen); input.endFrame(); }
    return new Promise((res) => setTimeout(() => {
      for (let i = 0; i < 8; i++) { stack.update(1/30); stack.draw(screen); input.endFrame(); }
      res(canvas.toDataURL("image/png"));
    }, 2500));
  }
  return {
    behind: await shotAt(23, 10),  // player sul tetto -> deve sparire DIETRO
    front: await shotAt(23, 13)    // player davanti -> deve stare DAVANTI
  };
});
function save(n, d){ writeFileSync(`artifacts/screens/${n}.png`, Buffer.from(d.slice("data:image/png;base64,".length),"base64")); }
save("zorder_behind", shots.behind);
save("zorder_front", shots.front);
console.log("salvati");
await browser.close();
