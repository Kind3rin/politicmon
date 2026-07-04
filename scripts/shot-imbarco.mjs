// Screenshot della zona IMBARCO di Caput Mundi (dove il giocatore dovrebbe capire
// che si va allo Stretto via mare) + vista larga della parte sud della città.
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";
const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5179";
mkdirSync("artifacts/screens", { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 720, height: 540 } });
await page.goto(BASE, { waitUntil: "networkidle" });

for (const [px, py, name] of [
  [6, 21, "porto_molo"],       // sulla punta del molo (imbarco)
  [6, 18, "porto_avvicino"],   // avvicinandosi da nord al porto
  [6, 20, "porto_darsena"],    // sul molo dentro la darsena
  [5, 19, "porto_cartello"]    // accanto al cartello + marinaio
]) {
  const dataUrl = await page.evaluate(async ([px, py]) => {
    const { Screen } = await import("/src/engine/screen.ts");
    const { Input } = await import("/src/engine/input.ts");
    const { SceneStack } = await import("/src/engine/scene.ts");
    const S = await import("/src/game/state.ts");
    const { WorldScene } = await import("/src/game/world/WorldScene.ts");
    const { audio } = await import("/src/engine/audio.ts");
    audio.enabled = false;
    const st = S.newGameState();
    st.flags["dex-received"] = true; st.flags["starter-chosen"] = true; st.flags["intro-done"] = true;
    st.badges = ["auditel", "spread", "dazio"]; st.flags["veh-traghetto"] = true;
    st.party = [{ id: "x", speciesId: "renzino", level: 40, exp: 999999, hp: 30, moves: [], status: null }];
    st.pos = { mapId: "capitale", x: px, y: py, facing: "down" };
    st.repellentSteps = 99999;
    const canvas = document.createElement("canvas");
    canvas.width = 240; canvas.height = 180;
    const screen = new Screen(canvas);
    const input = new Input();
    const stack = new SceneStack();
    stack.push(new WorldScene(stack, input, st));
    for (let i = 0; i < 8; i++) { stack.update(1/30); stack.draw(screen); input.endFrame(); }
    return canvas.toDataURL("image/png");
  }, [px, py]);
  writeFileSync(`artifacts/screens/${name}.png`, Buffer.from(dataUrl.slice("data:image/png;base64,".length), "base64"));
  console.log("salvato", name);
}
await browser.close();
