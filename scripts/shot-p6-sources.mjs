import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
await page.goto(process.env.BASE_URL ?? "http://127.0.0.1:5179", { waitUntil: "load" }); await page.waitForTimeout(500);
const image = await page.evaluate(async () => {
  const { Screen } = await import("/src/engine/screen.ts"); const { Input } = await import("/src/engine/input.ts"); const { SceneStack } = await import("/src/engine/scene.ts"); const { SourcesScene } = await import("/src/scenes/SourcesScene.ts");
  const canvas = document.createElement("canvas"); canvas.width = 240; canvas.height = 180; const screen = new Screen(canvas); const scene = new SourcesScene(new SceneStack(), new Input()); scene.draw(screen); return canvas.toDataURL("image/png");
});
mkdirSync("artifacts/screens", { recursive: true }); writeFileSync("artifacts/screens/p6_sources.png", Buffer.from(image.split(",")[1], "base64")); console.log("salvato screenshot fonti"); await browser.close();
