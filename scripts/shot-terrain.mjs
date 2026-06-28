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
  const { preloadSprites } = await import("/src/engine/assets.ts");
  const { audio } = await import("/src/engine/audio.ts");
  audio.enabled = false;
  preloadSprites({
    "obj:T": "tiles/tree.png", "obj:s": "tiles/sign.png", "obj:~": "tiles/tallgrass_obj.png",
    "obj:f": "tiles/fence.png",
    "player:south": "chars/player_south.png", "veh:ferry": "chars/ferry.png",
    "npc:granny:south": "chars/npc_granny_south.png",
    "npc:aide:south": "chars/npc_aide_south.png",
    "npc:guard:south": "chars/npc_guard_south.png",
    "npc:guard:left": "chars/npc_guard_west.png",
    "npc:kid:south": "chars/npc_kid_south.png",
    "npc:barista:south": "chars/npc_barista_south.png"
  });
  await new Promise((r) => setTimeout(r, 1500));
  const canvas = document.createElement("canvas");
  canvas.width = 240; canvas.height = 180;
  const screen = new Screen(canvas);
  const input = new Input();
  function shotMap(mapId, x, y) {
    const state = newGameState();
    state.flags["intro-done"] = true;
    state.flags["route1-hint"] = true;
    state.party = [createMonster("giorgetta", 18)];
    state.badges = ["auditel", "spread", "dazio"];
    state.flags["veh-traghetto"] = true;
    state.pos = { mapId, x, y, facing: "down" };
    const stack = new SceneStack();
    stack.push(new WorldScene(stack, input, state));
    for (let i = 0; i < 8; i++) { stack.update(1/30); stack.draw(screen); input.endFrame(); }
    return canvas.toDataURL("image/png");
  }
  return { route1: shotMap("route1", 14, 10), borgo: shotMap("borgo", 8, 8) };
});
function save(n, d){ writeFileSync(`artifacts/screens/${n}.png`, Buffer.from(d.slice("data:image/png;base64,".length),"base64")); }
save("terrain_route1", shots.route1);
save("terrain_borgo", shots.borgo);
console.log("salvati");
await browser.close();
