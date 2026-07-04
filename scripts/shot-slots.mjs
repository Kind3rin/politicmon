// Screenshot del selettore SLOT (SlotScene) con slot pieni e vuoti misti.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5179";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
await page.goto(BASE, { waitUntil: "networkidle" });

const png = await page.evaluate(async () => {
  const { Screen } = await import("/src/engine/screen.ts");
  const { Input } = await import("/src/engine/input.ts");
  const { SceneStack } = await import("/src/engine/scene.ts");
  const S = await import("/src/game/state.ts");
  const { SlotScene } = await import("/src/scenes/SlotScene.ts");
  const { audio } = await import("/src/engine/audio.ts");
  audio.enabled = false;

  // Prepara: slot 0 pieno (2 medaglie), slot 1 pieno hard, slot 2 vuoto.
  for (let i = 0; i < 3; i++) {
    localStorage.removeItem(`politicmon-save-v13__s${i}`);
    localStorage.removeItem(`politicmon-save-v13__s${i}.bak`);
  }
  localStorage.removeItem("politicmon-save-v13");
  const mk = (badges, money, hard, mapId) => {
    const st = S.newGameState();
    st.badges = badges; st.money = money; st.hardMode = hard;
    st.pos = { mapId, x: 5, y: 5, facing: "down" };
    st.party = [{ id: "x", speciesId: "renzino", level: badges.length * 6 + 8, exp: 0, hp: 10, moves: [], status: null }];
    st.sondaggi = 62;
    return st;
  };
  S.setActiveSlot(0); S.saveGame(mk(["auditel","spread"], 1240, false, "eurotown"));
  S.setActiveSlot(1); S.saveGame(mk(["auditel"], 640, true, "mediopoli"));

  const canvas = document.createElement("canvas");
  canvas.width = 240; canvas.height = 180;
  const screen = new Screen(canvas);
  const input = new Input();
  const stack = new SceneStack();
  const slot = new SlotScene(stack, input, "load", () => {});
  stack.push(slot);
  for (let i = 0; i < 4; i++) { stack.update(1/30); stack.draw(screen); input.endFrame(); }
  return canvas.toDataURL("image/png");
});

writeFileSync("artifacts/screens/slots.png", Buffer.from(png.slice("data:image/png;base64,".length), "base64"));
console.log("salvato slots.png");
await browser.close();
