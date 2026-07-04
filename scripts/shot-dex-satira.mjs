// Screenshot DexScene per le dexLine più lunghe (verifica wrap/overflow satira).
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";
const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5179";
mkdirSync("artifacts/screens", { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 720, height: 540 } });
await page.goto(BASE, { waitUntil: "networkidle" });

for (const id of ["conteblob", "berlusconix", "mattarellux", "movimenton"]) {
  const png = await page.evaluate(async (speciesId) => {
    const { Screen } = await import("/src/engine/screen.ts");
    const { Input } = await import("/src/engine/input.ts");
    const { SceneStack } = await import("/src/engine/scene.ts");
    const S = await import("/src/game/state.ts");
    const { DexScene } = await import("/src/scenes/DexScene.ts");
    const { DEX_ORDER } = await import("/src/data/species.ts");
    const { audio } = await import("/src/engine/audio.ts");
    audio.enabled = false;
    const st = S.newGameState();
    st.flags["dex-received"] = true;
    st.dex[speciesId] = "caught";
    const canvas = document.createElement("canvas");
    canvas.width = 240; canvas.height = 180;
    const screen = new Screen(canvas);
    const input = new Input();
    const stack = new SceneStack();
    const dex = new DexScene(stack, input, st);
    // Forza la scheda dettaglio della specie voluta (campi privati a runtime JS).
    dex.index = DEX_ORDER.indexOf(speciesId);
    dex.detail = true;
    stack.push(dex);
    for (let i = 0; i < 6; i++) { stack.update(1/30); stack.draw(screen); input.endFrame(); }
    return canvas.toDataURL("image/png");
  }, id);
  writeFileSync(`artifacts/screens/dex_${id}.png`, Buffer.from(png.slice("data:image/png;base64,".length), "base64"));
  console.log("salvato dex_" + id);
}
await browser.close();
