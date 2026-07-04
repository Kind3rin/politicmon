// Screenshot ravvicinato della BARCA nel porto (tile X a 5,21). Pre-carica l'asset
// con molti frame e smaltisce i banner d'ingresso.
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";
const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5179";
mkdirSync("artifacts/screens", { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 720, height: 540 } });
await page.goto(BASE, { waitUntil: "networkidle" });

// Pre-carica il PNG della barca prima di renderizzare.
await page.evaluate(() => fetch("/sprites/tiles/boat_moored.png").then(r => r.blob()));
await page.waitForTimeout(300);

const png = await page.evaluate(async () => {
  const { Screen } = await import("/src/engine/screen.ts");
  const { Input } = await import("/src/engine/input.ts");
  const { SceneStack } = await import("/src/engine/scene.ts");
  const S = await import("/src/game/state.ts");
  const { WorldScene } = await import("/src/game/world/WorldScene.ts");
  const { objectImage } = await import("/src/art/tiles.ts");
  const { audio } = await import("/src/engine/audio.ts");
  audio.enabled = false;
  objectImage("X"); // avvia il caricamento lazy dell'asset barca
  // Stato "vergine" per non far comparire quest/dialoghi: solo il minimo per stare
  // in mappa. Niente badge/garante → currentQuest resta sul tutorial, ma il banner
  // d'ingresso è già stato smaltito con hint-casino.
  const st = S.newGameState();
  st.flags["dex-received"] = true; st.flags["starter-chosen"] = true; st.flags["intro-done"] = true;
  st.flags["hint-casino"] = true; st.flags["rival1-beaten"] = true; st.rivalWins = 1;
  st.ministri = { economia: "u1" }; st.badges = ["auditel"];
  st.party = [{ id: "x", speciesId: "renzino", uid: "u1", level: 40, exp: 0, hp: 30, moves: [], status: null }];
  st.pos = { mapId: "capitale", x: 7, y: 20, facing: "down" }; // sul molo, la barca (5,21) è vicina a sx-basso
  st.repellentSteps = 99999;
  const canvas = document.createElement("canvas");
  canvas.width = 240; canvas.height = 180;
  const screen = new Screen(canvas);
  const input = new Input();
  const stack = new SceneStack();
  stack.push(new WorldScene(stack, input, st));
  const frame = () => { stack.update(1/30); stack.draw(screen); input.endFrame(); };
  // molti frame + A per smaltire i banner e lasciar caricare l'asset
  for (let r = 0; r < 15; r++) {
    document.dispatchEvent(new KeyboardEvent("keydown", { code: "Enter", bubbles: true }));
    for (let i = 0; i < 3; i++) frame();
    document.dispatchEvent(new KeyboardEvent("keyup", { code: "Enter", bubbles: true }));
    for (let i = 0; i < 3; i++) frame();
  }
  for (let i = 0; i < 30; i++) frame();
  return canvas.toDataURL("image/png");
});
writeFileSync("artifacts/screens/porto_barca.png", Buffer.from(png.slice("data:image/png;base64,".length), "base64"));
console.log("salvato porto_barca");
await browser.close();
