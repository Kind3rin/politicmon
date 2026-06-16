// Valida che le posizioni di "risveglio"/teletrasporto hardcoded nel codice
// (state.pos = {...}) cadano su tile calpestabili e aperti, non dentro i muri.
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5179";

// Posizioni note impostate via state.pos nel codice (mapId, x, y, contesto).
const SPOTS = [
  ["borgo", 19, 18, "risveglio dopo KO totale (BAR SPORT)"],
  ["lab", 5, 6, "risveglio dopo sconfitta primo rivale"]
];

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(BASE, { waitUntil: "networkidle" });

const report = await page.evaluate(async (spots) => {
  const { MAPS } = await import("/src/data/maps.ts");
  const { TILES } = await import("/src/art/tiles.ts");
  const problems = [];
  for (const [mapId, x, y, ctx] of spots) {
    const map = MAPS[mapId];
    const ch = map.tiles[y]?.[x] ?? "?";
    const tile = TILES[ch];
    if (!tile || tile.solid) {
      problems.push(`${mapId} @(${x},${y}) [${ctx}]: tile '${ch}' SOLIDO/assente`);
      continue;
    }
    // Conta le 4 celle adiacenti calpestabili: se 0-1, è un angolo claustrofobico.
    const dirs = [[0,-1],[0,1],[-1,0],[1,0]];
    const openAdj = dirs.filter(([dx,dy]) => {
      const t = TILES[map.tiles[y+dy]?.[x+dx] ?? "?"];
      return t && !t.solid;
    }).length;
    if (openAdj < 2) {
      problems.push(`${mapId} @(${x},${y}) [${ctx}]: solo ${openAdj} celle adiacenti libere (claustrofobico)`);
    }
  }
  return problems;
}, SPOTS);

if (report.length === 0) {
  console.log("OK: tutte le posizioni di risveglio sono calpestabili e aperte.");
} else {
  console.log("PROBLEMI:");
  for (const p of report) console.log("  - " + p);
}
await browser.close();
process.exit(report.length === 0 ? 0 : 1);
