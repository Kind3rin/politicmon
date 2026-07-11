import { chromium } from "playwright"; import { mkdirSync, writeFileSync } from "node:fs";
const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
await page.goto(process.env.BASE_URL ?? "http://127.0.0.1:5179", { waitUntil: "load" }); await page.waitForTimeout(700);
const image = await page.evaluate(async () => {
  const { Screen } = await import("/src/engine/screen.ts"); const { Input } = await import("/src/engine/input.ts"); const { SceneStack } = await import("/src/engine/scene.ts");
  const { newGameState } = await import("/src/game/state.ts"); const { initTournament, COPPA_RULES } = await import("/src/game/tournament.ts"); const { TournamentScene } = await import("/src/scenes/TournamentScene.ts");
  const canvas = document.createElement("canvas"); canvas.width = 240; canvas.height = 180; const screen = new Screen(canvas); const input = new Input(); const stack = new SceneStack(); const state = newGameState();
  stack.push(new TournamentScene(stack, input, state, initTournament("2026-07-11"), () => undefined, () => undefined, COPPA_RULES[3]));
  stack.update(1 / 60); stack.draw(screen); return canvas.toDataURL("image/png");
});
mkdirSync("artifacts/screens", { recursive: true }); writeFileSync("artifacts/screens/p6_coppa_rule.png", Buffer.from(image.split(",")[1], "base64"));
console.log("salvato screenshot regola COPPA"); await browser.close();
