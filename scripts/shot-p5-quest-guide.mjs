import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
await page.goto(process.env.BASE_URL ?? "http://127.0.0.1:5179", { waitUntil: "load" }); await page.waitForTimeout(700);
const image = await page.evaluate(async () => {
  const { Screen } = await import("/src/engine/screen.ts"); const { Input } = await import("/src/engine/input.ts");
  const { SceneStack } = await import("/src/engine/scene.ts"); const { newGameState } = await import("/src/game/state.ts");
  const { QuestScene } = await import("/src/scenes/QuestScene.ts");
  const state = newGameState(); state.badges = ["auditel", "spread", "dazio"]; state.defeatedTrainers = ["rival1", "giudice1", "giudice2", "giudice3"];
  Object.assign(state.flags, { "starter-chosen": true, "rival1-beaten": true, "dex-received": true, "boss-beaten": true, "garante-beaten": true,
    "hint-offshore": true, "offshore-beaten": true, "hint-brux-arrivo": true, "hint-ue": true, "ue-beaten": true, atto3Started: true,
    "campo-photo-choice-complete": true, "campo-photo-complete": true, "future-badge-received": true, "future-choice-complete": true,
    futureResolved: true, "diplomacy-checked-in": true, "diplomacy-choice-complete": true, diplomacyComplete: true });
  const canvas = document.createElement("canvas"); canvas.width = 240; canvas.height = 180; const screen = new Screen(canvas); const input = new Input(); const stack = new SceneStack();
  stack.push(new QuestScene(stack, input, state)); stack.update(1 / 60); stack.draw(screen); return canvas.toDataURL("image/png");
});
mkdirSync("artifacts/screens", { recursive: true }); writeFileSync("artifacts/screens/p5_quest_guide.png", Buffer.from(image.split(",")[1], "base64"));
console.log("salvato screenshot quest guide"); await browser.close();
