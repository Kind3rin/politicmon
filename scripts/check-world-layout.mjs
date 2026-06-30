// Guardrail mirato per i bug di layout segnalati:
// - niente Wang grass/path che sembra scarpata attraversabile
// - niente PNG edificio 3/4 nelle mappe città/location
// - ogni porta outdoor->interno deve avere un sentiero `=` davanti
// - porte outdoor->interni solo dal centro sotto la porta, guardando la porta
// - nessun ingresso laterale o con facing sbagliato attiva un warp
import { chromium } from "playwright";
import { existsSync, readFileSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5179";
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(BASE, { waitUntil: "networkidle" });

const staticProblems = [];
for (const file of ["src/main.ts", "scripts/shot-buildings.mjs", "scripts/shot-zorder.mjs", "scripts/shot-terrain.mjs"]) {
  const text = readFileSync(file, "utf8");
  if (text.includes('loadWangSet(registerWangSet, "grass_path"')) {
    staticProblems.push(`${file}: riattiva il Wang grass_path`);
  }
  if (text.includes('loadWangSet(registerWangSet, "water_sand"')) {
    staticProblems.push(`${file}: riattiva il Wang water_sand invece dei tile PixelLab cartoon`);
  }
}
{
  const text = readFileSync("src/art/tiles.ts", "utf8");
  for (const forbidden of [
    "build_house.png",
    "build_house_blue.png",
    "build_house_green.png",
    "build_house_brick.png",
    "build_lab.png",
    "build_bar.png",
    "build_gym.png",
    "build_casino.png"
  ]) {
    if (text.includes(`"${forbidden}"`) || text.includes(`"tiles/${forbidden}"`)) {
      staticProblems.push(`src/art/tiles.ts: PNG 3/4 ancora mappato (${forbidden})`);
    }
  }
  for (const terrain of ["grass_flat.png", "path_flat.png", "sand.png", "water.png"]) {
    if (!text.includes(`"tiles/${terrain}"`)) {
      staticProblems.push(`src/art/tiles.ts: terrain PixelLab mancante (${terrain})`);
    }
    if (!existsSync(`public/sprites/tiles/${terrain}`)) {
      staticProblems.push(`public/sprites/tiles/${terrain}: PNG PixelLab mancante`);
    }
  }
}
{
  const text = readFileSync("src/game/world/WorldScene.ts", "utf8");
  if (text.includes('this.map.tiles[y]?.[x] ?? "T"')) {
    staticProblems.push("WorldScene.tileAt: fallback fuori mappa usa sempre alberi outdoor anche negli interni");
  }
}

const runtimeProblems = await page.evaluate(async () => {
  const { MAPS } = await import("/src/data/maps.ts");
  const { TILES } = await import("/src/art/tiles.ts");
  const { SceneStack } = await import("/src/engine/scene.ts");
  const { Input } = await import("/src/engine/input.ts");
  const { WorldScene } = await import("/src/game/world/WorldScene.ts");
  const { newGameState } = await import("/src/game/state.ts");
  const { ACHIEVEMENTS } = await import("/src/game/achievements.ts");

  const out = [];
  const input = new Input();
  const stack = new SceneStack();
  const tileAt = (map, x, y) => map.tiles[y]?.[x] ?? "T";
  const primeState = (mapId, x, y, facing) => {
    const state = newGameState();
    state.flags["intro-done"] = true;
    state.flags["veh-traghetto"] = true;
    state.flags["hint-casino"] = true;
    for (const achievement of ACHIEVEMENTS) {
      state.flags[`ach:${achievement.id}`] = true;
    }
    state.badges = ["auditel", "spread", "dazio"];
    state.pos = { mapId, x, y, facing };
    return state;
  };
  const makeStepInput = (dir) => ({
    heldDirection: () => dir,
    wasPressed: () => false,
    isHeld: () => false,
    consumeTap: () => null,
    tapInRect: () => false,
    clearTap: () => {},
    endFrame: () => {}
  });
  const runStep = (state, dir) => {
    const scene = new WorldScene(stack, makeStepInput(dir), state);
    scene.update(1 / 60);
    scene.update(1);
    return scene;
  };

  const stretto = MAPS.stretto;
  if (stretto) {
    const stair = tileAt(stretto, 24, 5);
    if (stair !== "l" || TILES[stair]?.solid || TILES[stair]?.water) {
      out.push("stretto: lo scoglio sopraelevato deve avere un gradino attraversabile a (24,5)");
    }
    for (let y = 2; y <= 5; y += 1) {
      for (let x = 22; x <= 26; x += 1) {
        const edge = y === 2 || y === 5 || x === 22 || x === 26;
        if (!edge || (x === 24 && y === 5)) {
          continue;
        }
        const ch = tileAt(stretto, x, y);
        const def = TILES[ch];
        if (ch !== "^" || !def?.solid) {
          out.push(`stretto: bordo scoglio non bloccante a (${x},${y}) '${ch}'`);
        }
      }
    }
  }

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
      if (front !== "=") {
        out.push(`${mapId}->${warp.toMap}: manca sentiero davanti alla porta (${warp.x},${warp.y + 1}) '${front}'`);
      }
      const connected =
        tileAt(map, warp.x - 1, warp.y + 1) === "=" ||
        tileAt(map, warp.x + 1, warp.y + 1) === "=" ||
        tileAt(map, warp.x, warp.y + 2) === "=";
      if (!connected) {
        out.push(`${mapId}->${warp.toMap}: sentiero porta isolato (${warp.x},${warp.y + 1})`);
      }

      const returnsToFront = (target.warps ?? []).some(
        (back) => back.toMap === mapId && back.toX === warp.x && back.toY === warp.y + 1
      );
      if (!returnsToFront) {
        out.push(`${mapId}->${warp.toMap}: uscita interna non torna al fronte (${warp.x},${warp.y + 1})`);
      }
      const entersAboveExit = (target.warps ?? []).some(
        (back) =>
          back.toMap === mapId &&
          back.toX === warp.x &&
          back.toY === warp.y + 1 &&
          warp.toX === back.x &&
          warp.toY === back.y - 1
      );
      if (!entersAboveExit) {
        out.push(`${mapId}->${warp.toMap}: ingresso interno non arriva sopra lo zerbino (${warp.toX},${warp.toY})`);
      }

      {
        const state = primeState(mapId, warp.x, warp.y, "up");
        const scene = new WorldScene(stack, input, state);
        scene.fromX = warp.x;
        scene.fromY = warp.y + 1;
        scene.onStepComplete();
        if (!(scene.fadeOut > 0 || scene.pendingWarp)) {
          out.push(`${mapId}->${warp.toMap}: ingresso dal centro sotto porta (${warp.x},${warp.y + 1}) non attiva il warp`);
        }
      }

      {
        const state = primeState(mapId, warp.x, warp.y, "down");
        const scene = new WorldScene(stack, input, state);
        scene.fromX = warp.x;
        scene.fromY = warp.y + 1;
        scene.onStepComplete();
        if (scene.fadeOut > 0 || scene.pendingWarp || state.pos.x !== warp.x || state.pos.y !== warp.y + 1) {
          out.push(`${mapId}->${warp.toMap}: ingresso con porta non davanti non respinto`);
        }
      }

      for (const side of [
        { fromX: warp.x - 1, fromY: warp.y, facing: "right" },
        { fromX: warp.x + 1, fromY: warp.y, facing: "left" }
      ]) {
        const state = primeState(mapId, warp.x, warp.y, side.facing);
        const scene = new WorldScene(stack, input, state);
        scene.fromX = side.fromX;
        scene.fromY = side.fromY;
        scene.onStepComplete();
        if (scene.fadeOut > 0 || scene.pendingWarp || state.pos.x !== side.fromX || state.pos.y !== side.fromY) {
          out.push(`${mapId}->${warp.toMap}: ingresso laterale da (${side.fromX},${side.fromY}) non respinto`);
        }
      }

      {
        const state = primeState(mapId, warp.x, warp.y + 1, "up");
        const scene = runStep(state, "up");
        if (!(scene.fadeOut > 0 || scene.pendingWarp)) {
          out.push(`${mapId}->${warp.toMap}: passo reale dal centro porta (${warp.x},${warp.y + 1}) non entra`);
        }
      }

      {
        const state = primeState(mapId, warp.x, warp.y + 1, "down");
        const scene = new WorldScene(stack, makeStepInput("up"), state);
        scene.update(1 / 60);
        if (scene.fadeOut > 0 || scene.pendingWarp || state.pos.x !== warp.x || state.pos.y !== warp.y + 1 || state.pos.facing !== "up") {
          out.push(`${mapId}->${warp.toMap}: primo input da girato male deve solo voltarsi verso la porta`);
        }
      }

      for (const side of [
        { x: warp.x - 1, y: warp.y, facing: "right", dir: "right" },
        { x: warp.x + 1, y: warp.y, facing: "left", dir: "left" }
      ]) {
        const state = primeState(mapId, side.x, side.y, side.facing);
        const scene = runStep(state, side.dir);
        if (scene.fadeOut > 0 || scene.pendingWarp || state.pos.x !== side.x || state.pos.y !== side.y) {
          out.push(`${mapId}->${warp.toMap}: passo reale laterale da (${side.x},${side.y}) non respinto`);
        }
      }
    }
  }
  return out;
});

const problems = [...staticProblems, ...runtimeProblems];
if (problems.length === 0) {
  console.log("OK - layout world: edifici ortogonali, ingressi solo dal centro porta, laterali/facing sbagliato respinti, scoglio solo dal gradino.");
} else {
  console.log(`TROVATI ${problems.length} problemi world layout:`);
  for (const p of problems) console.log("  " + p);
  process.exitCode = 1;
}

await browser.close();
