// Valida che ogni pickup (visibile e nascosto) cada su un tile calpestabile.
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5179";
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(BASE, { waitUntil: "networkidle" });

const report = await page.evaluate(async () => {
  const { MAPS } = await import("/src/data/maps.ts");
  const { TILES } = await import("/src/art/tiles.ts");
  const problems = [];
  let total = 0, hidden = 0;
  for (const [mapId, map] of Object.entries(MAPS)) {
    for (const p of map.pickups ?? []) {
      total++;
      if (p.hidden) hidden++;
      const ch = map.tiles[p.y]?.[p.x] ?? "?";
      const tile = TILES[ch];
      // I tesori nascosti si raccolgono CALPESTANDOLI: devono stare su tile
      // calpestabili. I pickup visibili invece si esaminano da davanti, quindi
      // possono stare su un mobile (letto, scaffale) — non è un errore.
      if (p.hidden && (!tile || tile.solid)) {
        problems.push(`${mapId} tesoro NASCOSTO ${p.id} @(${p.x},${p.y}) su tile '${ch}' non calpestabile!`);
      }
    }
  }
  return { problems, total, hidden };
});

console.log(`Pickup totali: ${report.total} (di cui nascosti: ${report.hidden})`);
if (report.problems.length === 0) {
  console.log("OK: tutti i pickup sono su tile calpestabili.");
} else {
  console.log("PROBLEMI:");
  for (const p of report.problems) console.log("  - " + p);
}
await browser.close();
process.exit(report.problems.length === 0 ? 0 : 1);
