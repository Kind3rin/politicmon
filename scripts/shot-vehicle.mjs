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
    "player:south": "chars/player_south.png", "veh:auto": "chars/auto.png",
    "veh:ruspa": "chars/ruspa.png", "obj:T": "tiles/tree.png", "obj:s": "tiles/sign.png"
  });
  await new Promise((r) => setTimeout(r, 1500));
  const canvas = document.createElement("canvas");
  canvas.width = 240; canvas.height = 180;
  const screen = new Screen(canvas);
  const input = new Input();
  function render(veh, facing) {
    const state = newGameState();
    state.flags["intro-done"] = true;
    state.party = [createMonster("giorgetta", 18)];
    state.vehicle = veh;
    state.pos = { mapId: "borgo", x: 8, y: 8, facing };
    const stack = new SceneStack();
    stack.push(new WorldScene(stack, input, state));
    for (let i = 0; i < 6; i++) { stack.update(1/30); stack.draw(screen); input.endFrame(); }
    return canvas.toDataURL("image/png");
  }
  return {
    auto_down: render("auto", "down"), auto_up: render("auto", "up"),
    auto_left: render("auto", "left"), auto_right: render("auto", "right")
  };
});
function save(n, d){ writeFileSync(`artifacts/screens/${n}.png`, Buffer.from(d.slice("data:image/png;base64,".length),"base64")); }
for (const [k,v] of Object.entries(shot)) save(`veh_${k}`, v);
console.log("salvati");
await browser.close();
