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
  const { createMonster } = await import("/src/game/monster.ts");
  const { ACHIEVEMENTS } = await import("/src/game/achievements.ts");
  const { WorldScene } = await import("/src/game/world/WorldScene.ts");
  const { audio } = await import("/src/engine/audio.ts");
  audio.enabled = false;

  const render = (mapId, x, y, facing) => {
    const canvas = document.createElement("canvas"); canvas.width = 240; canvas.height = 180;
    const screen = new Screen(canvas); const input = new Input(); const stack = new SceneStack();
    const state = newGameState();
    state.party = [createMonster("giorgiagon", 48)];
    state.badges = ["auditel", "spread", "dazio"];
    Object.assign(state.flags, {
      "intro-done": true, "dex-received": true, "starter-chosen": true,
      "boss-beaten": true, "garante-beaten": true, "ponte-beaten": true,
      "hint-offshore": true, "hint-ue": true, "hint-brux-arrivo": true,
      "veh-traghetto": true
    });
    for (const achievement of ACHIEVEMENTS) state.flags[`ach:${achievement.id}`] = true;
    state.vehicle = "traghetto";
    state.pos = { mapId, x, y, facing };
    stack.push(new WorldScene(stack, input, state));
    // Lascia terminare gli annunci giornalieri: lo screenshot deve validare il
    // varco, non una sovrapposizione transitoria.
    for (let i = 0; i < 180; i += 1) { stack.update(1 / 60); stack.draw(screen); input.endFrame(); }
    return canvas.toDataURL("image/png");
  };
  return {
    strettoOffshore: render("stretto", 27, 10, "right"),
    offshoreBruxelles: render("offshore", 27, 9, "right"),
    offshoreStretto: render("offshore", 3, 9, "left")
  };
});

const out = "artifacts/screens/maritime-routes"; mkdirSync(out, { recursive: true });
for (const [name, dataUrl] of Object.entries(shots)) {
  writeFileSync(`${out}/${name}.png`, Buffer.from(dataUrl.slice("data:image/png;base64,".length), "base64"));
  console.log(`salvato ${out}/${name}.png`);
}
await browser.close();
