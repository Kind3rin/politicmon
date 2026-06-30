// Audit PNG: niente sprite vuoti e terrain core opachi/full-tile.
// Nota: i character PixelLab possono avere canvas grande, ma Screen.imageBounds
// croppa l'alpha in runtime; qui controlliamo il contenuto visibile, non il canvas.
import { readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { chromium } from "playwright";

const root = process.cwd();
const spriteRoot = join(root, "public", "sprites");
const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5179";

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(path));
    } else if (entry.name.endsWith(".png")) {
      out.push(relative(spriteRoot, path).split(sep).join("/"));
    }
  }
  return out;
}

const files = walk(spriteRoot);
const fullTileTerrain = new Set([
  "tiles/grass_flat.png",
  "tiles/path_flat.png",
  "tiles/sand.png",
  "tiles/water.png",
  "tiles/floor_wood.png",
  "tiles/wall_interior.png",
  "tiles/cave_floor.png",
  "tiles/cave_rock.png",
  "tiles/snow_floor.png",
  "tiles/snow_drift.png",
  "tiles/snow_path.png",
  "tiles/cave_mouth.png",
  "tiles/cave_boulder.png",
  "tiles/cave_stalagmite.png",
  "tiles/snow_pine.png",
  "tiles/deck_asphalt.png"
]);
const gridBuildings = new Map([
  ["tiles/build_house_front_red.png", [64, 48]],
  ["tiles/build_house_front_blue.png", [64, 48]],
  ["tiles/build_house_front_green.png", [64, 48]],
  ["tiles/build_house_front_brick.png", [64, 48]],
  ["tiles/build_circolo_front.png", [64, 32]],
  ["tiles/build_apartment_front.png", [64, 32]],
  ["tiles/build_kiosk_front.png", [64, 32]],
  ["tiles/build_lab_front.png", [64, 48]],
  ["tiles/build_bar_front.png", [64, 32]],
  ["tiles/build_studio_front.png", [64, 32]],
  ["tiles/build_bistro_front.png", [64, 32]],
  ["tiles/build_gym_front.png", [96, 48]],
  ["tiles/build_casino_front.png", [96, 48]]
]);

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(BASE, { waitUntil: "networkidle" });

const problems = await page.evaluate(async ({ files, fullTileTerrain, gridBuildings }) => {
  const fullTile = new Set(fullTileTerrain);
  const buildingDims = new Map(gridBuildings);
  const out = [];

  async function loadImage(path) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`load failed: ${path}`));
      img.src = `/sprites/${path}`;
    });
  }

  for (const path of files) {
    let img;
    try {
      img = await loadImage(path);
    } catch {
      out.push(`${path}: PNG non caricabile`);
      continue;
    }
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (w <= 0 || h <= 0) {
      out.push(`${path}: dimensioni invalide ${w}x${h}`);
      continue;
    }
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, w, h).data;
    let minX = w;
    let minY = h;
    let maxX = -1;
    let maxY = -1;
    let alphaPixels = 0;
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        if (data[(y * w + x) * 4 + 3] <= 8) {
          continue;
        }
        alphaPixels += 1;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
    if (alphaPixels === 0) {
      out.push(`${path}: sprite completamente trasparente`);
      continue;
    }
    const bw = maxX - minX + 1;
    const bh = maxY - minY + 1;
    if (path.startsWith("chars/") && (bw > 64 || bh > 64)) {
      out.push(`${path}: bounds character troppo grandi ${bw}x${bh}`);
    }
    if (fullTile.has(path)) {
      if (w !== 16 || h !== 16) {
        out.push(`${path}: terrain core deve essere 16x16, trovato ${w}x${h}`);
      }
      if (minX !== 0 || minY !== 0 || maxX !== w - 1 || maxY !== h - 1) {
        out.push(`${path}: terrain core non copre tutto il tile (bounds ${minX},${minY}-${maxX},${maxY})`);
      }
    }
    const expected = buildingDims.get(path);
    if (expected) {
      const [ew, eh] = expected;
      if (w !== ew || h !== eh) {
        out.push(`${path}: edificio grid deve essere ${ew}x${eh}, trovato ${w}x${h}`);
      }
      if (minX !== 0 || maxX !== w - 1 || maxY !== h - 1) {
        out.push(`${path}: edificio grid non copre footprint orizzontale/basso (bounds ${minX},${minY}-${maxX},${maxY})`);
      }
    }
  }
  return out;
}, { files, fullTileTerrain: [...fullTileTerrain], gridBuildings: [...gridBuildings] });

if (problems.length === 0) {
  console.log(`OK - sprite bounds: ${files.length} PNG non vuoti, terrain core full-tile.`);
} else {
  console.log(`TROVATI ${problems.length} problemi sprite bounds:`);
  for (const problem of problems) {
    console.log(`  ${problem}`);
  }
  process.exitCode = 1;
}

await browser.close();
