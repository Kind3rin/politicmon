// Verifica: menu titolo con SPOSTA SAVE + apertura BackupScene.
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
  const frame = () => { stack.update(1/30); stack.draw(screen); input.endFrame(); };
  const press = (code) => {
    document.dispatchEvent(new KeyboardEvent("keydown", { code, bubbles: true }));
    frame();
    document.dispatchEvent(new KeyboardEvent("keyup", { code, bubbles: true }));
    for (let i=0;i<4;i++) frame();
  };
  for (let i=0;i<10;i++) frame();
  const menu = canvas.toDataURL("image/png");
  // Scendi fino a SPOSTA SAVE (ultima voce) e aprila.
  for (let i=0;i<6;i++) press("ArrowDown");
  // trova e apri: premi giù finche' l'ultima voce, poi A
  press("KeyZ");
  for (let i=0;i<6;i++) frame();
  const backup = canvas.toDataURL("image/png");
  return { menu, backup };
});
function save(n,d){ writeFileSync(`artifacts/screens/${n}.png`, Buffer.from(d.slice("data:image/png;base64,".length),"base64")); }
save("title_menu", shots.menu);
save("transfer_backup", shots.backup);
console.log("salvati title_menu, transfer_backup");
await browser.close();
