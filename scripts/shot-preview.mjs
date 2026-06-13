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
  const { StarterPreviewScene } = await import("/src/scenes/StarterPreviewScene.ts");
  const { audio } = await import("/src/engine/audio.ts");
  audio.enabled = false;
  const out = {};
  for (const id of ["giorgetta", "ellyna", "renzino"]) {
    const canvas = document.createElement("canvas");
    canvas.width = 240; canvas.height = 180;
    const screen = new Screen(canvas);
    const input = new Input();
    const stack = new SceneStack();
    const s = new StarterPreviewScene(stack, input, id, () => {});
    stack.push(s);
    for (let i = 0; i < 30; i++) { stack.update(1/30); stack.draw(screen); input.endFrame(); }
    out[id] = canvas.toDataURL("image/png");
  }
  return out;
});
for (const [id, url] of Object.entries(shots)) {
  writeFileSync(`artifacts/screens/preview_${id}.png`, Buffer.from(url.slice(22), "base64"));
}
console.log("salvati preview_giorgetta, preview_ellyna, preview_renzino");
await browser.close();
