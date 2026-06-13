// Cattura screenshot di verifica della mappa STRETTO via Playwright.
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
  const { createMonster } = await import("/src/game/monster.ts");
  const { WorldScene } = await import("/src/game/world/WorldScene.ts");

  function render(x, y, facing) {
    const canvas = document.createElement("canvas");
    canvas.width = 240; canvas.height = 180;
    const screen = new Screen(canvas);
    const input = new Input();
    const stack = new SceneStack();
    const state = newGameState();
    state.flags["intro-done"] = true;
    state.flags["dex-received"] = true;
    state.party.push(createMonster("capitanone", 24));
    state.badges = ["auditel", "spread", "dazio"];
    state.sondaggi = 64;
    state.pos = { mapId: "stretto", x, y, facing };
    stack.push(new WorldScene(stack, input, state));
    for (let i = 0; i < 5; i++) { stack.update(1 / 60); stack.draw(screen); input.endFrame(); }
    return canvas.toDataURL("image/png");
  }
  return {
    beach: render(14, 7, "down"),
    bridge: render(14, 13, "down")
  };
});

function save(name, dataUrl) {
  const b64 = dataUrl.slice("data:image/png;base64,".length);
  writeFileSync(`artifacts/screens/${name}.png`, Buffer.from(b64, "base64"));
  console.log(`salvato artifacts/screens/${name}.png`);
}
save("stretto_beach", shots.beach);
save("stretto_bridge", shots.bridge);

await browser.close();
