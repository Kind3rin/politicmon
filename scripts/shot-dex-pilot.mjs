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
  const { DexScene } = await import("/src/scenes/DexScene.ts");
  const { DEX_ORDER } = await import("/src/data/species.ts");
  const { preloadSprites } = await import("/src/engine/assets.ts");
  const { MONSTERS_WITH_PNG } = await import("/src/art/monsters.ts");
  // Preload tutti i PNG e attendi.
  const map = {};
  for (const id of MONSTERS_WITH_PNG) map[`mon:${id}`] = `monsters/${id}.png`;
  preloadSprites(map);
  await new Promise((r) => setTimeout(r, 1500));

  const state = newGameState();
  for (const id of DEX_ORDER) state.dex[id] = "caught";
  function render(targetId) {
    const canvas = document.createElement("canvas");
    canvas.width = 240; canvas.height = 180;
    const screen = new Screen(canvas);
    const stack = new SceneStack();
    const dex = new DexScene(stack, new Input(), state);
    // posiziona l'indice sul mostro voluto e mostra il dettaglio
    const idx = DEX_ORDER.indexOf(targetId);
    dex.index = idx; dex.detail = true;
    stack.push(dex);
    for (let i = 0; i < 4; i++) { stack.update(1/30); stack.draw(screen); }
    return canvas.toDataURL("image/png");
  }
  return { trumpon: render("trumpon"), draghimon: render("draghimon"), berlusconix: render("berlusconix") };
});
function save(n, d){ writeFileSync(`artifacts/screens/${n}.png`, Buffer.from(d.slice("data:image/png;base64,".length),"base64")); console.log(n); }
save("dex_trumpon", shots.trumpon);
save("dex_draghimon", shots.draghimon);
save("dex_berlusconix", shots.berlusconix);
await browser.close();
