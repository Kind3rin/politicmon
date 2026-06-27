// Verifica round 12: tetto casinò ($) a CAPUT MUNDI, icone oggetti in BORSA e SHOP.
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5179";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
page.on("pageerror", (e) => console.error("PAGEERR:", e.message));
await page.goto(BASE, { waitUntil: "networkidle" });

const shots = await page.evaluate(async () => {
  const { Screen } = await import("/src/engine/screen.ts");
  const { Input } = await import("/src/engine/input.ts");
  const { SceneStack } = await import("/src/engine/scene.ts");
  const { newGameState } = await import("/src/game/state.ts");
  const { WorldScene } = await import("/src/game/world/WorldScene.ts");
  const { createMonster } = await import("/src/game/monster.ts");
  const { BagScene } = await import("/src/scenes/BagScene.ts");
  const { ShopScene } = await import("/src/scenes/ShopScene.ts");
  const { audio } = await import("/src/engine/audio.ts");
  audio.enabled = false;

  const canvas = document.createElement("canvas");
  canvas.width = 240; canvas.height = 180;
  const screen = new Screen(canvas);
  const input = new Input();

  function fullState() {
    const state = newGameState();
    state.flags["intro-done"] = true;
    state.flags["hint-casino"] = true;
    state.party = [createMonster("giorgetta", 18)];
    state.badges = ["auditel", "spread", "dazio"];
    state.money = 9999;
    // riempi la borsa di tutti gli oggetti per vedere le icone
    for (const id of ["scheda","schedona","caffe","spritz","mojito","maalox","tessera","divisa","dirVaffa","dirFiamma","dirGreen","dirWhatever"]) {
      state.bag[id] = 3;
    }
    return state;
  }

  function render(scene, frames = 6) {
    const stack = new SceneStack();
    stack.push(scene(stack));
    for (let i = 0; i < frames; i++) { stack.update(1/30); stack.draw(screen); input.endFrame(); }
    return canvas.toDataURL("image/png");
  }

  const casino = render((stack) => {
    const state = fullState();
    state.pos = { mapId: "capitale", x: 21, y: 13, facing: "up" }; // davanti alla porta casinò
    return new WorldScene(stack, input, state);
  });
  const bag = render((stack) => new BagScene(stack, input, fullState(), { inBattle: false }));
  const shop = render((stack) => new ShopScene(stack, input, fullState()));

  return { casino, bag, shop };
});

mkdirSync("artifacts/screens", { recursive: true });
for (const [name, data] of Object.entries(shots)) {
  const b64 = data.replace(/^data:image\/png;base64,/, "");
  writeFileSync(`artifacts/screens/r12_${name}.png`, Buffer.from(b64, "base64"));
  console.log("saved", `artifacts/screens/r12_${name}.png`);
}
await browser.close();
