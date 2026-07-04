// Screenshot: player FERMO davanti a una porta ESTERNA (edificio), colonna sx
// della coppia `dd`. Deve apparire centrato davanti alla porta (offset +8px).
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";
const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5179";
mkdirSync("artifacts/screens", { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 720, height: 540 } });
await page.goto(BASE, { waitUntil: "networkidle" });

// Trova a runtime la prima porta `dd` di mediopoli e piazza il player una riga sopra
// la cella SINISTRA. Un secondo shot sulla cella DESTRA per confronto.
for (const [side, name] of [["left", "porta_ext_sx"], ["right", "porta_ext_dx"]]) {
  const png = await page.evaluate(async (side) => {
    const { Screen } = await import("/src/engine/screen.ts");
    const { Input } = await import("/src/engine/input.ts");
    const { SceneStack } = await import("/src/engine/scene.ts");
    const S = await import("/src/game/state.ts");
    const { MAPS } = await import("/src/data/maps.ts");
    const { WorldScene } = await import("/src/game/world/WorldScene.ts");
    const { audio } = await import("/src/engine/audio.ts");
    audio.enabled = false;
    const m = MAPS["mediopoli"];
    // cerca la prima coppia "dd"
    let dx = -1, dy = -1;
    for (let y = 0; y < m.tiles.length && dx < 0; y++) {
      const r = m.tiles[y];
      const i = r.indexOf("dd");
      if (i >= 0) { dx = i; dy = y; }
    }
    const col = side === "left" ? dx : dx + 1;
    const st = S.newGameState();
    st.flags["dex-received"] = true; st.flags["starter-chosen"] = true; st.flags["intro-done"] = true;
    st.party = [{ id: "x", speciesId: "renzino", uid: "u1", level: 10, exp: 0, hp: 20, moves: [], status: null }];
    // Davanti al portone = SOTTO la porta (l'edificio ha la porta in fondo, si entra da sud).
    st.pos = { mapId: "mediopoli", x: col, y: dy + 1, facing: "up" };
    st.repellentSteps = 99999;
    const canvas = document.createElement("canvas");
    canvas.width = 240; canvas.height = 180;
    const screen = new Screen(canvas);
    const input = new Input();
    const stack = new SceneStack();
    stack.push(new WorldScene(stack, input, st));
    for (let i = 0; i < 8; i++) { stack.update(1/30); stack.draw(screen); input.endFrame(); }
    return canvas.toDataURL("image/png");
  }, side);
  writeFileSync(`artifacts/screens/${name}.png`, Buffer.from(png.slice("data:image/png;base64,".length), "base64"));
  console.log("salvato", name);
}
await browser.close();
