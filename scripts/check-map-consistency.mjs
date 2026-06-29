// Audit strutturale mappe: becca incoerenze invisibili agli screenshot.
// Richiede dev server su BASE_URL (default http://127.0.0.1:5179).
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5179";
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(BASE, { waitUntil: "networkidle" });

const report = await page.evaluate(async () => {
  const { MAPS } = await import("/src/data/maps.ts");
  const { TILES } = await import("/src/art/tiles.ts");

  const problems = [];
  const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
  const key = (x, y) => `${x},${y}`;
  const isDoor = (ch) => ch === "d" || ch === "D" || ch === "g";
  const tileAt = (map, x, y) => map.tiles[y]?.[x] ?? "";
  const inBounds = (map, x, y) => y >= 0 && y < map.tiles.length && x >= 0 && x < (map.tiles[y]?.length ?? 0);
  const defAt = (map, x, y) => TILES[tileAt(map, x, y)];
  const standable = (map, x, y, allowWater = false) => {
    const d = defAt(map, x, y);
    return Boolean(d && !d.solid && (allowWater || !d.water));
  };

  for (const [mapId, map] of Object.entries(MAPS)) {
    if (!map.tiles.length) {
      problems.push(`${mapId}: mappa senza righe`);
      continue;
    }

    const width = map.tiles[0].length;
    map.tiles.forEach((row, y) => {
      if (row.length !== width) {
        problems.push(`${mapId}: riga ${y} larga ${row.length}, atteso ${width}`);
      }
      [...row].forEach((ch, x) => {
        const def = TILES[ch];
        if (!def) {
          problems.push(`${mapId}: tile sconosciuto '${ch}' a (${x},${y})`);
        }
        if (ch === "^" && !def?.solid) {
          problems.push(`${mapId}: scoglio '^' non solido a (${x},${y})`);
        }
        if (ch === "l" && (def?.solid || def?.water)) {
          problems.push(`${mapId}: gradino 'l' non attraversabile a (${x},${y})`);
        }
      });
    });

    const warpByCell = new Map((map.warps ?? []).map((w) => [key(w.x, w.y), w]));
    const occupied = new Map();
    const claim = (x, y, who) => {
      const k = key(x, y);
      if (occupied.has(k)) {
        problems.push(`${mapId}: ${who} sovrapposto a ${occupied.get(k)} @(${x},${y})`);
      } else {
        occupied.set(k, who);
      }
    };

    for (let y = 0; y < map.tiles.length; y += 1) {
      for (let x = 0; x < map.tiles[y].length; x += 1) {
        const ch = tileAt(map, x, y);
        const d = TILES[ch];
        if (map.outdoor && isDoor(ch) && !warpByCell.has(key(x, y))) {
          problems.push(`${mapId}: porta '${ch}' senza warp a (${x},${y})`);
        }

        if (d && !d.solid && !d.water && !warpByCell.has(key(x, y))) {
          const visiblePickupHere = (map.pickups ?? []).some((p) => !p.hidden && p.x === x && p.y === y);
          const openAdj = dirs.filter(([dx, dy]) => standable(map, x + dx, y + dy)).length;
          if (openAdj === 0 && !visiblePickupHere) {
            problems.push(`${mapId}: cella calpestabile isolata '${ch}' a (${x},${y})`);
          }
        }
      }
    }

    for (const warp of map.warps ?? []) {
      const target = MAPS[warp.toMap];
      const ch = tileAt(map, warp.x, warp.y);
      const d = TILES[ch];
      claim(warp.x, warp.y, `warp->${warp.toMap}`);

      if (!inBounds(map, warp.x, warp.y)) {
        problems.push(`${mapId}->${warp.toMap}: warp fuori mappa (${warp.x},${warp.y})`);
      }
      if (!target) {
        problems.push(`${mapId}: warp a (${warp.x},${warp.y}) verso mappa mancante '${warp.toMap}'`);
        continue;
      }
      if (!inBounds(target, warp.toX, warp.toY)) {
        problems.push(`${mapId}->${warp.toMap}: target fuori mappa (${warp.toX},${warp.toY})`);
      }

      const ferryWarp = Boolean(map.outdoor && target.outdoor && d?.water);
      if (!d || (d.water ? !ferryWarp : d.solid)) {
        problems.push(`${mapId}->${warp.toMap}: warp su tile non valido '${ch}' a (${warp.x},${warp.y})`);
      }

      const targetDef = defAt(target, warp.toX, warp.toY);
      const targetFerry = Boolean(map.outdoor && target.outdoor && targetDef?.water);
      if (!targetDef || (targetDef.water ? !targetFerry : targetDef.solid)) {
        problems.push(`${mapId}->${warp.toMap}: arrivo su tile non valido '${tileAt(target, warp.toX, warp.toY)}' a (${warp.toX},${warp.toY})`);
      }

      if (map.outdoor && !target.outdoor && isDoor(ch)) {
        const frontX = warp.x;
        const frontY = warp.y + 1;
        if (!standable(map, frontX, frontY)) {
          problems.push(`${mapId}->${warp.toMap}: fronte porta bloccato a (${frontX},${frontY})`);
        }
        if (tileAt(map, frontX, frontY) !== "=") {
          problems.push(`${mapId}->${warp.toMap}: manca sentiero '=' davanti alla porta (${frontX},${frontY})`);
        }
        const connected =
          tileAt(map, frontX - 1, frontY) === "=" ||
          tileAt(map, frontX + 1, frontY) === "=" ||
          tileAt(map, frontX, frontY + 1) === "=";
        if (!connected) {
          problems.push(`${mapId}->${warp.toMap}: sentiero porta isolato a (${frontX},${frontY})`);
        }
        const returnsToFront = (target.warps ?? []).some(
          (back) => back.toMap === mapId && back.toX === frontX && back.toY === frontY
        );
        if (!returnsToFront) {
          problems.push(`${mapId}->${warp.toMap}: uscita interna non torna davanti alla porta (${frontX},${frontY})`);
        }
        const entersAboveExit = (target.warps ?? []).some(
          (back) =>
            back.toMap === mapId &&
            back.toX === frontX &&
            back.toY === frontY &&
            warp.toX === back.x &&
            warp.toY === back.y - 1
        );
        if (!entersAboveExit) {
          problems.push(`${mapId}->${warp.toMap}: ingresso interno non arriva sopra lo zerbino di uscita (${warp.toX},${warp.toY})`);
        }
      }
    }

    const npcCells = new Set();
    for (const npc of map.npcs ?? []) {
      npcCells.add(key(npc.x, npc.y));
      const d = defAt(map, npc.x, npc.y);
      const allowedCounter = npc.healer || npc.box;
      if (!allowedCounter && (!d || d.solid || d.water)) {
        problems.push(`${mapId}: NPC ${npc.id} su tile non calpestabile '${tileAt(map, npc.x, npc.y)}' @(${npc.x},${npc.y})`);
      }
      if (!npc.transport && warpByCell.has(key(npc.x, npc.y))) {
        problems.push(`${mapId}: NPC ${npc.id} sovrapposto a warp @(${npc.x},${npc.y})`);
      }
      claim(npc.x, npc.y, `NPC ${npc.id}`);
    }

    for (const pickup of map.pickups ?? []) {
      const d = defAt(map, pickup.x, pickup.y);
      if (!pickup.hidden) {
        claim(pickup.x, pickup.y, `pickup ${pickup.id}`);
        if (!d || d.solid || d.water) {
          problems.push(`${mapId}: pickup ${pickup.id} su tile non calpestabile '${tileAt(map, pickup.x, pickup.y)}' @(${pickup.x},${pickup.y})`);
        }
      } else if (!d || d.solid || d.water) {
        problems.push(`${mapId}: pickup nascosto ${pickup.id} su tile non calpestabile '${tileAt(map, pickup.x, pickup.y)}' @(${pickup.x},${pickup.y})`);
      }
    }

    for (const sign of map.signs ?? []) {
      if (npcCells.has(key(sign.x, sign.y))) {
        problems.push(`${mapId}: cartello coperto da NPC a (${sign.x},${sign.y})`);
      }
      const readable = dirs.some(([dx, dy]) =>
        standable(map, sign.x + dx, sign.y + dy) && !npcCells.has(key(sign.x + dx, sign.y + dy))
      );
      if (!readable) {
        problems.push(`${mapId}: cartello illeggibile a (${sign.x},${sign.y})`);
      }
    }
  }

  return problems;
});

if (report.length === 0) {
  console.log("OK - map consistency: tile noti, warps validi, porte/fronti coerenti, placement pulito.");
} else {
  console.log(`TROVATI ${report.length} problemi map consistency:`);
  for (const problem of report) {
    console.log(`  ${problem}`);
  }
  process.exitCode = 1;
}

await browser.close();
