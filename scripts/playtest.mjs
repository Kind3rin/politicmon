// Playtest reale nel MONDO (salta onboarding): inietta stato, cammina con input
// reali, cattura una sequenza per giudicare il gioco in movimento.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5179";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 720, height: 540 } });
await page.goto(BASE, { waitUntil: "load" });
await page.waitForTimeout(4500);

// Inietta una WorldScene giocabile via lo stack esposto in DEV (window.stack).
await page.evaluate(async () => {
  const { SceneStack } = await import("/src/engine/scene.ts");
  const { WorldScene } = await import("/src/game/world/WorldScene.ts");
  const { newGameState } = await import("/src/game/state.ts");
  const { createMonster } = await import("/src/game/monster.ts");
  const { Input } = await import("/src/engine/input.ts");
  const stack = window.stack;
  // Svuota lo stack e mette il mondo.
  while (stack.scenes && stack.scenes.length) stack.pop();
  const state = newGameState();
  state.flags["intro-done"] = true;
  state.flags["starter-chosen"] = true;
  state.party = [createMonster("salvinator", 12), createMonster("giorgetta", 10)];
  state.badges = ["auditel"];
  state.pos = { mapId: "mediopoli", x: 14, y: 10, facing: "down" };
  // riusa l'input globale del gioco (gia agganciato alla tastiera)
  stack.push(new WorldScene(stack, window.__input ?? new Input(), state));
});
await page.waitForTimeout(2500);

const canvas = await page.$("#game-canvas");
let n = 0;
async function shot(label) {
  writeFileSync(`artifacts/screens/pt_${String(n).padStart(2,"0")}_${label}.png`, await canvas.screenshot());
  n++;
}
async function key(code, times = 1, gap = 200) {
  for (let i = 0; i < times; i++) {
    await page.keyboard.down(code); await page.waitForTimeout(70); await page.keyboard.up(code);
    await page.waitForTimeout(gap);
  }
}
await shot("world");
await key("ArrowDown", 4); await shot("walk_down");
await key("ArrowLeft", 4); await shot("walk_left");
await key("ArrowUp", 5); await shot("walk_up");
await key("ArrowRight", 3); await shot("walk_right");
console.log("playtest mondo:", n, "frame");
await browser.close();
