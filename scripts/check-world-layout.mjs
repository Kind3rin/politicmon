// Guardrail mirato per i bug di layout segnalati:
// - niente Wang grass/path che sembra scarpata attraversabile
// - porte outdoor->interni solo dal fronte, con ritorno davanti alla porta
// - nessun ingresso laterale attiva un warp
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5179";
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(BASE, { waitUntil: "networkidle" });

const staticProblems = [];
for (const file of ["src/main.ts", "scripts/shot-buildings.mjs", "scripts/shot-zorder.mjs"]) {
  const text = readFileSync(file, "utf8");
  if (text.includes('loadWangSet(registerWangSet, "grass_path"')) {
    staticProblems.push(`${file}: riattiva il Wang grass_path`);
  }
}

const runtimeProblems = await page.evaluate(async () => {
  const { MAPS } = await import("/src/data/maps.ts");
  const { TILES } = await import("/src/art/tiles.ts");
  const { SceneStack } = await import("/src/engine/scene.ts");
  const { Input } = await import("/src/engine/input.ts");
  const { WorldScene } = await import("/src/game/world/WorldScene.ts");
  const { newGameState } = await import("/src/game/state.ts");

  const out = [];
  const input = new Input();
  const stack = new SceneStack();
  const tileAt = (map, x, y) => map.tiles[y]?.[x] ?? "T";

  for (const [mapId, map] of Object.entries(MAPS)) {
    if (!map.outdoor) {
      continue;
    }
    for (const warp of map.warps ?? []) {
      const target = MAPS[warp.toMap];
      const ch = tileAt(map, warp.x, warp.y);
      if (!target || target.outdoor || !["d", "D", "g"].includes(ch)) {
        continue;
      }

      const front = tileAt(map, warp.x, warp.y + 1);
      const frontDef = TILES[front];
      if (!frontDef || frontDef.solid || frontDef.water) {
        out.push(`${mapId}->${warp.toMap}: fronte porta non libero (${warp.x},${warp.y + 1}) '${front}'`);
      }

      const returnsToFront = (target.warps ?? []).some(
        (back) => back.toMap === mapId && back.toX === warp.x && back.toY === warp.y + 1
      );
      if (!returnsToFront) {
        out.push(`${mapId}->${warp.toMap}: uscita interna non torna al fronte (${warp.x},${warp.y + 1})`);
      }

      for (const side of [
        { fromX: warp.x - 1, fromY: warp.y, facing: "right" },
        { fromX: warp.x + 1, fromY: warp.y, facing: "left" }
      ]) {
        const state = newGameState();
        state.flags["intro-done"] = true;
        state.flags["veh-traghetto"] = true;
        state.badges = ["auditel", "spread", "dazio"];
        state.pos = { mapId, x: warp.x, y: warp.y, facing: side.facing };
        const scene = new WorldScene(stack, input, state);
        scene.fromX = side.fromX;
        scene.fromY = side.fromY;
        scene.onStepComplete();
        if (scene.fadeOut > 0 || scene.pendingWarp || state.pos.x !== side.fromX || state.pos.y !== side.fromY) {
          out.push(`${mapId}->${warp.toMap}: ingresso laterale da (${side.fromX},${side.fromY}) non respinto`);
        }
      }
    }
  }
  return out;
});

const problems = [...staticProblems, ...runtimeProblems];
if (problems.length === 0) {
  console.log("OK — layout world: terreno piatto, porte frontali, ingressi laterali respinti.");
} else {
  console.log(`TROVATI ${problems.length} problemi world layout:`);
  for (const p of problems) console.log("  " + p);
  process.exitCode = 1;
}

await browser.close();
