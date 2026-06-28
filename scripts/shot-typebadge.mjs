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
  const { TypesScene } = await import("/src/scenes/TypesScene.ts");
  const { DexScene } = await import("/src/scenes/DexScene.ts");
  const { newGameState } = await import("/src/game/state.ts");
  const { getSpriteImage } = await import("/src/engine/assets.ts");
  const { setTypeIconLoader } = await import("/src/data/poltypes.ts");
  const { audio } = await import("/src/engine/audio.ts");
  audio.enabled = false;
  setTypeIconLoader(getSpriteImage);
  await new Promise((r) => setTimeout(r, 3000));
  const canvas = document.createElement("canvas");
  canvas.width = 240; canvas.height = 180;
  const screen = new Screen(canvas);
  const input = new Input();
  function shot(scene, pressA) {
    const stack = new SceneStack();
    const sc = scene(stack);
    stack.push(sc);
    for (let i = 0; i < 6; i++) { stack.update(1/30); stack.draw(screen); input.endFrame(); }
    if (pressA && "detail" in sc) { sc.detail = true; }
    return new Promise((res) => setTimeout(() => {
      for (let i = 0; i < 6; i++) { stack.update(1/30); stack.draw(screen); input.endFrame(); }
      res(canvas.toDataURL("image/png"));
    }, 1500));
  }
  const state = newGameState();
  Object.keys(state.dex).forEach((k)=>state.dex[k]="caught");
  return {
    types: await shot((stack) => new TypesScene(stack, input)),
    dex: await shot((stack) => new DexScene(stack, input, state), true)
  };
});
function save(n, d){ writeFileSync(`artifacts/screens/${n}.png`, Buffer.from(d.slice("data:image/png;base64,".length),"base64")); }
save("tb_types", shots.types);
save("tb_dex", shots.dex);
console.log("salvati");
await browser.close();
