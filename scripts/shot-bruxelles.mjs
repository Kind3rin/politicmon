// Screenshot di verifica BRUXELLES (mappa + interno Commissione) via Playwright.
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
  const { createMonster } = await import("/src/game/monster.ts");
  const { WorldScene } = await import("/src/game/world/WorldScene.ts");

  function render(mapId, x, y, facing, flags = {}) {
    const canvas = document.createElement("canvas");
    canvas.width = 240; canvas.height = 180;
    const screen = new Screen(canvas);
    const input = new Input();
    const stack = new SceneStack();
    const state = newGameState();
    state.flags["intro-done"] = true;
    state.flags["dex-received"] = true;
    state.flags["garante-beaten"] = true;
    state.flags["veh-traghetto"] = true;
    Object.assign(state.flags, flags);
    state.party.push(createMonster("macronfox", 48));
    state.badges = ["auditel", "spread", "dazio"];
    state.sondaggi = 72;
    state.pos = { mapId, x, y, facing };
    stack.push(new WorldScene(stack, input, state));
    for (let i = 0; i < 6; i++) { stack.update(1 / 60); stack.draw(screen); input.endFrame(); }
    return canvas.toDataURL("image/png");
  }
  return {
    arrivo: render("bruxelles", 14, 13, "up"),
    viale: render("bruxelles", 14, 9, "up"),
    palazzo: render("bruxelles", 12, 6, "up"),
    boss: render("commissione", 5, 4, "up")
  };
});

function save(name, dataUrl) {
  const b64 = dataUrl.slice("data:image/png;base64,".length);
  writeFileSync(`artifacts/screens/${name}.png`, Buffer.from(b64, "base64"));
  console.log(`salvato artifacts/screens/${name}.png`);
}
save("brux_arrivo", shots.arrivo);
save("brux_viale", shots.viale);
save("brux_palazzo", shots.palazzo);
save("brux_boss", shots.boss);

await browser.close();
