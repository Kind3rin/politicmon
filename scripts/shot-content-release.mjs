import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5179";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 720, height: 540 } });
await page.goto(BASE, { waitUntil: "networkidle" });

const shots = await page.evaluate(async () => {
  const { Screen } = await import("/src/engine/screen.ts");
  const { Input } = await import("/src/engine/input.ts");
  const { SceneStack } = await import("/src/engine/scene.ts");
  const { newGameState } = await import("/src/game/state.ts");
  const { ContentScene } = await import("/src/scenes/ContentScene.ts");
  const { WeeklyCampaignScene } = await import("/src/scenes/WeeklyCampaignScene.ts");
  const { audio } = await import("/src/engine/audio.ts");
  audio.enabled = false;

  const render = (build) => {
    const canvas = document.createElement("canvas");
    canvas.width = 240; canvas.height = 180;
    const screen = new Screen(canvas);
    const input = new Input();
    const stack = new SceneStack();
    const state = newGameState();
    state.flags["intro-done"] = true;
    state.flags["ue-beaten"] = true;
    state.flags.atto3Complete = true;
    state.money = 2400;
    stack.push(build(stack, input, state));
    for (let i = 0; i < 6; i += 1) { stack.update(1 / 60); stack.draw(screen); input.endFrame(); }
    return canvas.toDataURL("image/png");
  };

  return {
    contents: render((stack, input, state) => new ContentScene(stack, input, state)),
    weeklyMeme: render((stack, input, state) => new WeeklyCampaignScene(stack, input, state, () => undefined))
  };
});

const out = "artifacts/screens/release-all";
mkdirSync(out, { recursive: true });
for (const [name, dataUrl] of Object.entries(shots)) {
  writeFileSync(`${out}/${name}.png`, Buffer.from(dataUrl.slice("data:image/png;base64,".length), "base64"));
  console.log(`salvato ${out}/${name}.png`);
}
await browser.close();
