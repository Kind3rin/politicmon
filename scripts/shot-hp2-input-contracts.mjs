import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5179";
const browser = await chromium.launch();

async function capture(kind) {
  const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
  await page.goto(BASE, { waitUntil: "networkidle" });
  const data = await page.evaluate(async (sceneKind) => {
    const { Screen } = await import("/src/engine/screen.ts");
    const { Input } = await import("/src/engine/input.ts");
    const { SceneStack } = await import("/src/engine/scene.ts");
    const { newGameState } = await import("/src/game/state.ts");
    const { AchievementsScene } = await import("/src/scenes/AchievementsScene.ts");
    const { StarterPreviewScene } = await import("/src/scenes/StarterPreviewScene.ts");
    const { audio } = await import("/src/engine/audio.ts");
    audio.enabled = false;
    const canvas = document.createElement("canvas"); canvas.width = 240; canvas.height = 180;
    const screen = new Screen(canvas); const input = new Input(); const stack = new SceneStack();
    const state = newGameState(); state.defeatedTrainers = ["qa"];
    const scene = sceneKind === "achievements"
      ? new AchievementsScene(stack, input, state)
      : new StarterPreviewScene(stack, input, "giorgetta", () => undefined);
    stack.push(scene);
    for (let i = 0; i < 20; i += 1) { stack.update(1 / 60); stack.draw(screen); input.endFrame(); }
    return canvas.toDataURL("image/png");
  }, kind);
  await page.close();
  return data;
}

mkdirSync("artifacts/screens", { recursive: true });
for (const kind of ["achievements", "starter-preview"]) {
  const data = await capture(kind);
  writeFileSync(`artifacts/screens/hp2_${kind}.png`, Buffer.from(data.split(",")[1], "base64"));
}
console.log("salvati contratti input TRAGUARDI e STARTER");
await browser.close();
