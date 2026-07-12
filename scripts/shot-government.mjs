import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5179";
const browser = await chromium.launch();

async function capture(mode) {
  // Una pagina per fixture: evita contaminazione del backing store/caching dei
  // glyph tra due canvas offscreen consecutivi nello stesso contesto.
  const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
  await page.goto(BASE, { waitUntil: "networkidle" });
  const data = await page.evaluate(async (fixtureMode) => {
    const { Screen } = await import("/src/engine/screen.ts");
    const { Input } = await import("/src/engine/input.ts");
    const { SceneStack } = await import("/src/engine/scene.ts");
    const { newGameState } = await import("/src/game/state.ts");
    const { createMonster } = await import("/src/game/monster.ts");
    const { assegnaMinistro } = await import("/src/game/governo.ts");
    const { GovScene } = await import("/src/scenes/GovScene.ts");
    const { audio } = await import("/src/engine/audio.ts");
    audio.enabled = false;

    const state = newGameState();
    state.sondaggi = fixtureMode === "ko" ? 34 : 63;
    state.flags["hint-governo"] = true;
    state.party = [createMonster("giorgiagon", 28), createMonster("schleinix", 27)];
    if (fixtureMode === "ko") state.party[0].hp = 0;
    assegnaMinistro(state, "economia", state.party[0]);

    const canvas = document.createElement("canvas"); canvas.width = 240; canvas.height = 180;
    const screen = new Screen(canvas); const input = new Input(); const stack = new SceneStack();
    stack.push(new GovScene(stack, input, state));
    stack.update(1 / 60); stack.draw(screen); input.endFrame();
    return canvas.toDataURL("image/png");
  }, mode);
  await page.close();
  return data;
}

const active = await capture("active");
const ko = await capture("ko");
mkdirSync("artifacts/screens", { recursive: true });
for (const [name, data] of Object.entries({ government_active: active, government_ko: ko })) {
  writeFileSync(`artifacts/screens/${name}.png`, Buffer.from(data.split(",")[1], "base64"));
}
console.log("salvati governo attivo e ministro KO");
await browser.close();
