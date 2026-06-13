// Screenshot della nuova schermata titolo (con e senza salvataggio).
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
  const { TitleScene } = await import("/src/scenes/TitleScene.ts");
  const { audio } = await import("/src/engine/audio.ts");
  audio.enabled = false;

  function render(t) {
    const canvas = document.createElement("canvas");
    canvas.width = 240; canvas.height = 180;
    const screen = new Screen(canvas);
    const input = new Input();
    const stack = new SceneStack();
    const title = new TitleScene(stack, input);
    stack.push(title);
    for (let i = 0; i < Math.round(t * 30); i++) { stack.update(1 / 30); input.endFrame(); }
    stack.draw(screen);
    return canvas.toDataURL("image/png");
  }
  return { t0: render(0.1), t6: render(6.2) };
});

function save(name, dataUrl) {
  writeFileSync(`artifacts/screens/${name}.png`,
    Buffer.from(dataUrl.slice("data:image/png;base64,".length), "base64"));
}
save("title_v3_a", shots.t0);
save("title_v3_b", shots.t6);
console.log("salvati title_v3_a, title_v3_b");
await browser.close();
