import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
await page.goto(process.env.BASE_URL ?? "http://127.0.0.1:5179", { waitUntil: "load" });
await page.waitForTimeout(700);
const image = await page.evaluate(async () => {
  const { Screen } = await import("/src/engine/screen.ts");
  const { Input } = await import("/src/engine/input.ts");
  const { SceneStack } = await import("/src/engine/scene.ts");
  const { newElectionState, calculateElectionResult } = await import("/src/game/election.ts");
  const { ElectionResultsScene } = await import("/src/scenes/ElectionResultsScene.ts");
  const canvas = document.createElement("canvas"); canvas.width = 240; canvas.height = 180;
  const screen = new Screen(canvas); const input = new Input(); const stack = new SceneStack();
  const base = newElectionState(true);
  const locals = [50, 55, 47, 50, 62];
  const districts = base.districts.map((district, i) => ({ ...district, localConsensus: locals[i] }));
  stack.push(new ElectionResultsScene(stack, input, calculateElectionResult(districts, true), () => undefined));
  for (let i = 0; i < 210; i += 1) { stack.update(1 / 60); stack.draw(screen); input.endFrame(); }
  return canvas.toDataURL("image/png");
});
mkdirSync("artifacts/screens", { recursive: true });
writeFileSync("artifacts/screens/p5_election_night_results.png", Buffer.from(image.split(",")[1], "base64"));
console.log("salvato screenshot Election Night");
await browser.close();
