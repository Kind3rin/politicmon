// Screenshot dello SPAWN quando arrivi allo Stretto (warp atterra a 13,6).
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";
const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5179";
mkdirSync("artifacts/screens", { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 720, height: 540 } });
await page.goto(BASE, { waitUntil: "networkidle" });

for (const [x, y, name] of [[13, 6, "stretto_spawn"], [10, 6, "stretto_molo_lato"]]) {
  const png = await page.evaluate(async ([px, py]) => {
    const { Screen } = await import("/src/engine/screen.ts");
    const { Input } = await import("/src/engine/input.ts");
    const { SceneStack } = await import("/src/engine/scene.ts");
    const S = await import("/src/game/state.ts");
    const { WorldScene } = await import("/src/game/world/WorldScene.ts");
    const { audio } = await import("/src/engine/audio.ts");
    audio.enabled = false;
    const st = S.newGameState();
    st.flags["dex-received"] = true; st.flags["starter-chosen"] = true; st.flags["intro-done"] = true;
    st.flags["hint-offshore"] = true; st.badges = ["auditel","spread","dazio"]; st.flags["veh-traghetto"] = true;
    st.party = [{ id: "x", speciesId: "renzino", uid: "u1", level: 40, exp: 0, hp: 30, moves: [], status: null }];
    st.pos = { mapId: "stretto", x: px, y: py, facing: "down" };
    st.repellentSteps = 99999;
    const canvas = document.createElement("canvas");
    canvas.width = 240; canvas.height = 180;
    const screen = new Screen(canvas);
    const input = new Input();
    const stack = new SceneStack();
    stack.push(new WorldScene(stack, input, st));
    const frame = () => { stack.update(1/30); stack.draw(screen); input.endFrame(); };
    for (let i = 0; i < 6; i++) frame();
    for (let r = 0; r < 10; r++) { document.dispatchEvent(new KeyboardEvent("keydown",{code:"Enter",bubbles:true})); for(let i=0;i<3;i++)frame(); document.dispatchEvent(new KeyboardEvent("keyup",{code:"Enter",bubbles:true})); for(let i=0;i<3;i++)frame(); }
    for (let i = 0; i < 10; i++) frame();
    return canvas.toDataURL("image/png");
  }, [x, y]);
  writeFileSync(`artifacts/screens/${name}.png`, Buffer.from(png.slice("data:image/png;base64,".length), "base64"));
  console.log("salvato", name);
}
await browser.close();
