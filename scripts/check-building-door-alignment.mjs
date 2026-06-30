// Verifica che asset-edificio, porta ASCII e warp siano sullo stesso tile.
// Richiede dev server attivo (come check-world-layout): BASE_URL opzionale.
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5179";
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(BASE, { waitUntil: "networkidle" });

const problems = await page.evaluate(async () => {
  const { MAPS } = await import("/src/data/maps.ts");
  const { TILES, isRoof, isFacade, buildingKey, buildingDoorOffset, buildingPath } = await import("/src/art/tiles.ts");
  const out = [];
  const doorChars = new Set(["d", "D", "g"]);
  const tileAt = (map, x, y) => map.tiles[y]?.[x] ?? "T";
  const images = new Map();

  async function loadImage(path) {
    if (images.has(path)) return images.get(path);
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error(path));
      el.src = `/sprites/${path}`;
    });
    images.set(path, img);
    return img;
  }

  function buildingFootprint(map, atx, aty, roofCh) {
    const groupKey = buildingKey(roofCh);
    const sameGroup = (x, y) => buildingKey(tileAt(map, x, y)) === groupKey;
    let w = 0;
    while (sameGroup(atx + w, aty)) w += 1;

    let roofRows = 0;
    while (sameGroup(atx, aty + roofRows)) roofRows += 1;

    let facadeRows = 0;
    for (let r = aty + roofRows; ; r += 1) {
      let any = false;
      for (let c = atx - 1; c < atx + w + 1; c += 1) {
        if (isFacade(tileAt(map, c, r))) {
          any = true;
          break;
        }
      }
      if (!any) break;
      facadeRows += 1;
      if (facadeRows > 2) break;
    }
    return { w, h: roofRows + facadeRows };
  }

  for (const [mapId, map] of Object.entries(MAPS)) {
    if (!map.outdoor) continue;
    for (let y = 0; y < map.tiles.length; y += 1) {
      for (let x = 0; x < map.tiles[y].length; x += 1) {
        const ch = tileAt(map, x, y);
        if (!isRoof(ch)) continue;
        const groupKey = buildingKey(ch);
        if (!groupKey) continue;
        if (buildingKey(tileAt(map, x - 1, y)) === groupKey || buildingKey(tileAt(map, x, y - 1)) === groupKey) {
          continue;
        }

        const fp = buildingFootprint(map, x, y, ch);
        const path = buildingPath(ch, fp);
        if (!path) {
          out.push(`${mapId}: edificio '${ch}' a (${x},${y}) senza PNG per footprint ${fp.w}x${fp.h}`);
          continue;
        }
        try {
          const img = await loadImage(path);
          const expectedW = fp.w * 16;
          const expectedH = fp.h * 16;
          const actualW = img.naturalWidth || img.width;
          const actualH = img.naturalHeight || img.height;
          if (actualW !== expectedW || actualH !== expectedH) {
            out.push(`${mapId}: ${path} per edificio '${ch}' a (${x},${y}) deve essere ${expectedW}x${expectedH}, trovato ${actualW}x${actualH}`);
          }
        } catch {
          out.push(`${mapId}: PNG edificio non caricabile ${path}`);
        }
        const doorOffset = buildingDoorOffset(ch);
        if (doorOffset == null) {
          const doors = [];
          for (let yy = y; yy < y + fp.h; yy += 1) {
            for (let xx = x - 1; xx < x + fp.w + 1; xx += 1) {
              if (doorChars.has(tileAt(map, xx, yy))) {
                doors.push({ x: xx, y: yy });
              }
            }
          }
          if (doors.length === 0) {
            out.push(`${mapId}: edificio '${ch}' a (${x},${y}) senza porte nella footprint`);
          }
          for (const door of doors) {
            const targetWarp = (map.warps ?? []).find((warp) => {
              const target = MAPS[warp.toMap];
              return warp.x === door.x && warp.y === door.y && target && !target.outdoor;
            });
            if (!targetWarp) {
              out.push(`${mapId}: edificio '${ch}' a (${x},${y}) senza warp interno sulla porta (${door.x},${door.y})`);
            }
            const front = tileAt(map, door.x, door.y + 1);
            const frontDef = TILES[front];
            if (front !== "=" || !frontDef || frontDef.solid || frontDef.water) {
              out.push(`${mapId}: fronte porta non coerente a (${door.x},${door.y + 1}), trovato '${front}'`);
            }
          }
          continue;
        }
        const doorX = x + doorOffset;
        const doorY = y + fp.h - 1;
        const expectedDoor = tileAt(map, doorX, doorY);
        if (!doorChars.has(expectedDoor)) {
          out.push(`${mapId}: edificio '${ch}' a (${x},${y}) porta attesa a (${doorX},${doorY}), trovato '${expectedDoor}'`);
        }

        for (let yy = y; yy < y + fp.h; yy += 1) {
          for (let xx = x - 1; xx < x + fp.w + 1; xx += 1) {
            const here = tileAt(map, xx, yy);
            if (doorChars.has(here) && (xx !== doorX || yy !== doorY)) {
              out.push(`${mapId}: edificio '${ch}' a (${x},${y}) ha porta fuori offset a (${xx},${yy})`);
            }
          }
        }

        const targetWarp = (map.warps ?? []).find((warp) => {
          const target = MAPS[warp.toMap];
          return warp.x === doorX && warp.y === doorY && target && !target.outdoor;
        });
        if (!targetWarp) {
          out.push(`${mapId}: edificio '${ch}' a (${x},${y}) senza warp interno sulla porta (${doorX},${doorY})`);
        } else if (!targetWarp.toMap.startsWith("bar-") && path === "tiles/build_bar_front.png") {
          out.push(`${mapId}->${targetWarp.toMap}: edificio non BAR usa ancora build_bar_front.png a (${x},${y})`);
        }

        const front = tileAt(map, doorX, doorY + 1);
        const frontDef = TILES[front];
        if (front !== "=" || !frontDef || frontDef.solid || frontDef.water) {
          out.push(`${mapId}: fronte porta non coerente a (${doorX},${doorY + 1}), trovato '${front}'`);
        }
      }
    }
  }

  return out;
});

if (problems.length === 0) {
  console.log("OK - building doors: porte visive, tile `d` e warp interni allineati su tutti gli edifici outdoor.");
} else {
  console.log(`TROVATI ${problems.length} problemi porte/building:`);
  for (const problem of problems) {
    console.log("  " + problem);
  }
  process.exitCode = 1;
}

await browser.close();
