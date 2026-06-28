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
  const { preloadSprites, loadWangSet } = await import("/src/engine/assets.ts");
  const { registerWangSet } = await import("/src/art/tiles.ts");
  const { audio } = await import("/src/engine/audio.ts");
  audio.enabled = false;
  loadWangSet(registerWangSet, "grass_path", "tiles/wang_grass_path.png", ["="]);
  loadWangSet(registerWangSet, "water_sand", "tiles/wang_water_sand.png", ["z", ".", "=", "~"]);
  preloadSprites({
    "obj:T": "tiles/tree.png", "obj:s": "tiles/sign.png", "obj:f": "tiles/fence.png",
    "build:r": "tiles/build_house.png", "build:u": "tiles/build_lab.png",
    "build:e": "tiles/build_bar.png", "build:Q": "tiles/build_bar.png",
    "build:y": "tiles/build_gym.png", "build:B": "tiles/build_gym.png", "build:x": "tiles/build_gym.png",
    "build:$": "tiles/build_casino.png", "build:M": "tiles/build_palace.png",
    "player:south": "chars/player_south.png", "veh:ferry": "chars/ferry.png",
    "npc:granny:south": "chars/npc_granny_south.png",
    "npc:aide:south": "chars/npc_aide_south.png",
    "npc:guard:south": "chars/npc_guard_south.png",
    "npc:guard:left": "chars/npc_guard_west.png",
    "npc:kid:south": "chars/npc_kid_south.png",
    "npc:barista:south": "chars/npc_barista_south.png"
  });
  await new Promise((r) => setTimeout(r, 2800));
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
    // Primo giro: i draw avviano il load lazy dei building/tile via il renderer.
    for (let i = 0; i < 8; i++) { stack.update(1/30); stack.draw(screen); input.endFrame(); }
    return new Promise((res) => setTimeout(() => {
      for (let i = 0; i < 8; i++) { stack.update(1/30); stack.draw(screen); input.endFrame(); }
      res(canvas.toDataURL("image/png"));
    }, 2500));
  }
  return { route1: await shotMap("mare", 8, 6), borgo: await shotMap("stretto", 14, 6) };
});
function save(n, d){ writeFileSync(`artifacts/screens/${n}.png`, Buffer.from(d.slice("data:image/png;base64,".length),"base64")); }
save("terrain_route1", shots.route1);
save("terrain_borgo", shots.borgo);
console.log("salvati");
await browser.close();
