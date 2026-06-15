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

  const canvas = document.createElement("canvas");
  canvas.width = 240; canvas.height = 180;
  const screen = new Screen(canvas);
  const input = new Input();
  const stack = new SceneStack();
  stack.push(new TitleScene(stack, input));
  const frame = () => { stack.update(1 / 30); stack.draw(screen); input.endFrame(); };
  // Lascia caricare lo splash AI (Image.onload è async): frame con attesa reale.
  for (let i = 0; i < 40; i++) { frame(); await new Promise((r) => setTimeout(r, 30)); }
  const a = canvas.toDataURL("image/png");
  for (let i = 0; i < 90; i++) frame(); // slogan successivo
  const b = canvas.toDataURL("image/png");
  return { t0: a, t6: b };
});

function save(name, dataUrl) {
  writeFileSync(`artifacts/screens/${name}.png`,
    Buffer.from(dataUrl.slice("data:image/png;base64,".length), "base64"));
}
save("title_v3_a", shots.t0);
save("title_v3_b", shots.t6);
console.log("salvati title_v3_a, title_v3_b");
await browser.close();
