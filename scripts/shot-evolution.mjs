// Screenshot delle fasi della EvolutionScene (intro, morph, flash, reveal).
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
  const { EvolutionScene } = await import("/src/scenes/EvolutionScene.ts");
  const { audio } = await import("/src/engine/audio.ts");
  audio.enabled = false;

  const canvas = document.createElement("canvas");
  canvas.width = 240; canvas.height = 180;
  const screen = new Screen(canvas);
  const input = new Input();
  const stack = new SceneStack();
  stack.push(new EvolutionScene(stack, input, "giorgetta", "giorgiagon", () => {}));

  // Avanza fino a un tempo target (s) e cattura.
  const out = {};
  let elapsed = 0;
  const stepTo = (t, name) => {
    while (elapsed < t) { stack.update(1 / 30); elapsed += 1 / 30; }
    stack.draw(screen);
    out[name] = canvas.toDataURL("image/png");
  };
  stepTo(0.8, "intro");   // fase 0
  stepTo(3.0, "morph");   // fase 1 (alterna forme)
  stepTo(4.55, "flash");  // fase 2 (flash bianco)
  stepTo(5.6, "reveal");  // fase 3 (nuova forma)
  return out;
});

function save(name, dataUrl) {
  writeFileSync(`artifacts/screens/evo_${name}.png`,
    Buffer.from(dataUrl.slice("data:image/png;base64,".length), "base64"));
}
for (const [k, v] of Object.entries(shots)) save(k, v);
console.log("salvati evo_intro, evo_morph, evo_flash, evo_reveal");
await browser.close();
