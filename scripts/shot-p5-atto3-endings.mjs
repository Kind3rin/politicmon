import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
await page.goto(process.env.BASE_URL ?? "http://127.0.0.1:5179", { waitUntil: "load" });
await page.waitForTimeout(700);
const shots = await page.evaluate(async () => {
  const { Screen } = await import("/src/engine/screen.ts"); const { Input } = await import("/src/engine/input.ts");
  const { SceneStack } = await import("/src/engine/scene.ts"); const { newGameState } = await import("/src/game/state.ts");
  const { newElectionState, calculateElectionResult } = await import("/src/game/election.ts");
  const { Atto3EndingScene } = await import("/src/scenes/Atto3EndingScene.ts");
  const canvas = document.createElement("canvas"); canvas.width = 240; canvas.height = 180; const screen = new Screen(canvas); const input = new Input();
  const render = (government, fractured) => {
    const state = newGameState(); const base = newElectionState(true);
    const local = government ? [60, 60, 60, 40, 40] : [60, 60, 40, 40, 40];
    state.election = { ...base, phase: "resolved", result: calculateElectionResult(base.districts.map((d, i) => ({ ...d, localConsensus: local[i] })), true) };
    if (fractured) state.flags["coalition-broken:generorso"] = true;
    const stack = new SceneStack(); stack.push(new Atto3EndingScene(stack, input, state, () => undefined)); stack.update(1 / 60); stack.draw(screen); input.endFrame();
    return canvas.toDataURL("image/png");
  };
  return { government_cohesive: render(true, false), opposition_fractured: render(false, true) };
});
mkdirSync("artifacts/screens", { recursive: true });
for (const [name, data] of Object.entries(shots)) writeFileSync(`artifacts/screens/p5_ending_${name}.png`, Buffer.from(data.split(",")[1], "base64"));
console.log("salvati screenshot finali Atto 3"); await browser.close();
