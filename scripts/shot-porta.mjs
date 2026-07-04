// Screenshot: player appena entrato in un interno (casa/bar/negozio), per vedere
// il disallineamento rispetto alla porta 'cc'.
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";
const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5179";
mkdirSync("artifacts/screens", { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 720, height: 540 } });
await page.goto(BASE, { waitUntil: "networkidle" });

for (const [mapId, name] of [["salotto", "porta_casa"], ["bar-cap", "porta_bar"], ["market3", "porta_market"]]) {
  const png = await page.evaluate(async (mapId) => {
    const { Screen } = await import("/src/engine/screen.ts");
    const { Input } = await import("/src/engine/input.ts");
    const { SceneStack } = await import("/src/engine/scene.ts");
    const S = await import("/src/game/state.ts");
    const { MAPS } = await import("/src/data/maps.ts");
    const { WorldScene } = await import("/src/game/world/WorldScene.ts");
    const { audio } = await import("/src/engine/audio.ts");
    audio.enabled = false;
    const m = MAPS[mapId];
    if (!m) return null;
    // trova la riga uscita 'c' e la cella su cui atterra il player
    const exitY = m.tiles.length - 2;
    const cx = Math.max(0, m.tiles[exitY].indexOf("c"));
    const st = S.newGameState();
    st.flags["dex-received"] = true; st.flags["starter-chosen"] = true; st.flags["intro-done"] = true;
    st.party = [{ id: "x", speciesId: "renzino", level: 10, exp: 0, hp: 20, moves: [], status: null }];
    st.pos = { mapId, x: cx, y: Math.max(1, exitY - 1), facing: "up" };
    const canvas = document.createElement("canvas");
    canvas.width = 240; canvas.height = 180;
    const screen = new Screen(canvas);
    const input = new Input();
    const stack = new SceneStack();
    stack.push(new WorldScene(stack, input, st));
    for (let i = 0; i < 8; i++) { stack.update(1/30); stack.draw(screen); input.endFrame(); }
    return canvas.toDataURL("image/png");
  }, mapId);
  if (png) { writeFileSync(`artifacts/screens/${name}.png`, Buffer.from(png.slice("data:image/png;base64,".length), "base64")); console.log("salvato", name); }
  else console.log("MAP non trovata:", mapId);
}
await browser.close();
