// Audit visivo: titolo + città a varie posizioni per vedere layout/edifici/terreno.
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
  const { WorldScene } = await import("/src/game/world/WorldScene.ts");
  const { TitleScene } = await import("/src/scenes/TitleScene.ts");
  const { createMonster } = await import("/src/game/monster.ts");
  const { ACHIEVEMENTS } = await import("/src/game/achievements.ts");
  const { audio } = await import("/src/engine/audio.ts");
  const { mp } = await import("/src/net/mp.ts");
  audio.enabled = false;
  mp.setEnabled(false);

  const canvas = document.createElement("canvas");
  canvas.width = 240; canvas.height = 180;
  const screen = new Screen(canvas);
  const input = new Input();

  async function world(mapId, x, y) {
    const state = newGameState();
    state.flags["intro-done"] = true;
    state.flags["hint-casino"] = true;
    for (const achievement of ACHIEVEMENTS) {
      state.flags[`ach:${achievement.id}`] = true;
    }
    state.party = [createMonster("giorgetta", 18)];
    state.badges = ["auditel", "spread", "dazio"];
    state.pos = { mapId, x, y, facing: "down" };
    const stack = new SceneStack();
    stack.push(new WorldScene(stack, input, state));
    for (let i = 0; i < 30; i++) { stack.update(1/30); stack.draw(screen); input.endFrame(); await new Promise(r=>setTimeout(r,12)); }
    return canvas.toDataURL("image/png");
  }
  async function title() {
    const stack = new SceneStack();
    stack.push(new TitleScene(stack, input));
    for (let i = 0; i < 50; i++) { stack.update(1/30); stack.draw(screen); input.endFrame(); await new Promise(r=>setTimeout(r,20)); }
    return canvas.toDataURL("image/png");
  }

  return {
    title: await title(),
    borgo_top: await world("borgo", 14, 4),
    borgo_houses: await world("borgo", 6, 14),
    borgo_house_red: await world("borgo", 24, 14),
    borgo_bar: await world("borgo", 20, 19),
    mediopoli: await world("mediopoli", 14, 10),
    mediopoli_house_brick: await world("mediopoli", 24, 11),
    mediopoli_house_green: await world("mediopoli", 24, 16),
    eurotown: await world("eurotown", 12, 9),
    eurotown_houses: await world("eurotown", 23, 6),
    eurotown_civic: await world("eurotown", 22, 11),
    capitale_houses: await world("capitale", 24, 18),
    capitale_palace: await world("capitale", 14, 7),
    capitale_casino: await world("capitale", 20, 12),
    stretto_buildings: await world("stretto", 16, 5),
  };
});

function save(name, dataUrl) {
  writeFileSync(`artifacts/screens/${name}.png`,
    Buffer.from(dataUrl.slice("data:image/png;base64,".length), "base64"));
}
for (const [k,v] of Object.entries(shots)) save(`audit_${k}`, v);
console.log("salvati:", Object.keys(shots).map(k=>`audit_${k}`).join(", "));
await browser.close();
