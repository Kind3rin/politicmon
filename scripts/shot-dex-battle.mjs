// Screenshot lotta WILD contro specie GIÀ CATTURATA: deve mostrare la SCHEDA
// nel box nemico (indicatore "già eletto"). Confronto con specie NON catturata.
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";
const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5179";
mkdirSync("artifacts/screens", { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 720, height: 540 } });
await page.goto(BASE, { waitUntil: "networkidle" });

for (const [caught, name] of [[true, "battle_dex_caught"], [false, "battle_dex_new"]]) {
  const png = await page.evaluate(async (isCaught) => {
    const { Screen } = await import("/src/engine/screen.ts");
    const { Input } = await import("/src/engine/input.ts");
    const { SceneStack } = await import("/src/engine/scene.ts");
    const S = await import("/src/game/state.ts");
    const { BattleScene } = await import("/src/game/battle/BattleScene.ts");
    const { createMonster } = await import("/src/game/monster.ts");
    const { audio } = await import("/src/engine/audio.ts");
    audio.enabled = false;
    const st = S.newGameState();
    st.flags["dex-received"] = true; st.flags["starter-chosen"] = true;
    st.party = [createMonster("renzino", 20)];
    // Il nemico wild è "putingrad"; lo marchiamo caught o no.
    if (isCaught) st.dex["putingrad"] = "caught";
    const canvas = document.createElement("canvas");
    canvas.width = 240; canvas.height = 180;
    const screen = new Screen(canvas);
    const input = new Input();
    const stack = new SceneStack();
    // Battaglia WILD (nessun trainer) contro putingrad lv 18.
    const b = new BattleScene(stack, input, {
      state: st, foeTeam: [createMonster("putingrad", 18)], onEnd: () => {}
    });
    stack.push(b);
    for (let i = 0; i < 30; i++) { stack.update(1/30); stack.draw(screen); input.endFrame(); }
    return canvas.toDataURL("image/png");
  }, caught);
  writeFileSync(`artifacts/screens/${name}.png`, Buffer.from(png.slice("data:image/png;base64,".length), "base64"));
  console.log("salvato", name);
}
await browser.close();
