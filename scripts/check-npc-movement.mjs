// Verifica che gli NPC ambientali si muovano davvero (wander) in una mappa.
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5179";
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(BASE, { waitUntil: "networkidle" });

const report = await page.evaluate(async () => {
  const { Screen } = await import("/src/engine/screen.ts");
  const { Input } = await import("/src/engine/input.ts");
  const { SceneStack } = await import("/src/engine/scene.ts");
  const { newGameState } = await import("/src/game/state.ts");
  const { WorldScene } = await import("/src/game/world/WorldScene.ts");
  const { createMonster } = await import("/src/game/monster.ts");
  const { audio } = await import("/src/engine/audio.ts");
  audio.enabled = false;

  const canvas = document.createElement("canvas");
  canvas.width = 240; canvas.height = 180;
  const screen = new Screen(canvas);
  const input = new Input();
  const stack = new SceneStack();
  const state = newGameState();
  state.flags["intro-done"] = true;
  state.party = [createMonster("giorgetta", 12)];
  state.pos = { mapId: "borgo", x: 14, y: 18, facing: "down" };
  const world = new WorldScene(stack, input, state);
  stack.push(world);

  const npcs = world["npcs"];
  const wanderers = npcs.filter((n) => n.canWander);
  const start = wanderers.map((n) => ({ id: n.id, x: n.x, y: n.y }));

  // Simula ~20s di gioco (solo update, niente input).
  for (let i = 0; i < 20 * 30; i++) { world.update(1 / 30); }

  const moved = wanderers.filter((n) => {
    const s = start.find((p) => p.id === n.id);
    return s && (s.x !== n.x || s.y !== n.y);
  });
  // Verifica che le posizioni restino entro 2 celle da casa.
  const strayed = wanderers.filter((n) => Math.abs(n.x - n.homeX) > 2 || Math.abs(n.y - n.homeY) > 2);

  return {
    totalNpcs: npcs.length,
    wanderers: wanderers.length,
    movedCount: moved.length,
    movedIds: moved.map((n) => n.id),
    strayed: strayed.map((n) => n.id)
  };
});

console.log(`NPC totali a borgo: ${report.totalNpcs}, di cui vaganti: ${report.wanderers}`);
console.log(`NPC che si sono mossi in ~20s: ${report.movedCount} (${report.movedIds.join(", ")})`);
if (report.strayed.length > 0) {
  console.log(`ATTENZIONE: usciti dal raggio di casa: ${report.strayed.join(", ")}`);
}
console.log(report.movedCount > 0 && report.strayed.length === 0 ? "OK: gli NPC si muovono entro il raggio." : "PROBLEMA: nessun movimento o NPC fuori raggio.");
await browser.close();
process.exit(report.movedCount > 0 && report.strayed.length === 0 ? 0 : 1);
