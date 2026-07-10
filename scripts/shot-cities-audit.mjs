// Sweep UI di tutte le città + interni: screenshot al centro per scovare
// collisioni/overflow/HUD sovrapposto. Non interagisce, solo render.
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
  const { createMonster } = await import("/src/game/monster.ts");
  const { MAPS } = await import("/src/data/maps.ts");
  const { audio } = await import("/src/engine/audio.ts");
  audio.enabled = false;
  const canvas = document.createElement("canvas");
  canvas.width = 240; canvas.height = 180;
  const screen = new Screen(canvas);
  const input = new Input();
  // Città + interni chiave. Coordinata = centro-ish calpestabile.
  const spots = [
    ["borgo", 14, 12], ["mediopoli", 14, 10], ["eurotown", 14, 8],
    ["capitale", 14, 12], ["stretto", 14, 6], ["offshore", 14, 8],
    ["bruxelles", 12, 8], ["colle", 5, 5],
    ["route1", 14, 6], ["route2", 14, 6], ["route3", 12, 6],
    ["grotta2", 8, 8], ["oblast-meme", 10, 6]
  ];
  const out = {};
  for (const [mapId, x, y] of spots) {
    if (!MAPS[mapId]) continue;
    const state = newGameState();
    state.flags["intro-done"] = true;
    state.party = [createMonster("giorgetta", 25)];
    state.badges = ["auditel", "spread", "dazio"];
    state.money = 9999;
    state.sondaggi = 88;
    state.pos = { mapId, x, y, facing: "down" };
    const stack = new SceneStack();
    stack.push(new WorldScene(stack, input, state));
    for (let i = 0; i < 20; i++) { stack.update(1/30); stack.draw(screen); input.endFrame(); }
    out[mapId] = canvas.toDataURL("image/png");
  }
  return out;
});
for (const [id, d] of Object.entries(shots)) {
  writeFileSync(`artifacts/screens/city_${id}.png`, Buffer.from(d.slice("data:image/png;base64,".length),"base64"));
}
console.log("salvate:", Object.keys(shots).join(", "));
await browser.close();
