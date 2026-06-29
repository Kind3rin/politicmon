// Guardrail: i warp edificio outdoor devono essere sulla porta e accessibili
// dalla cella subito sotto. Evita ingressi laterali o porte senza fronte libero.
// Uso: dev server attivo su :5179, poi `node scripts/check-door-warps.mjs`.
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5179";
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(BASE, { waitUntil: "networkidle" });

const problems = await page.evaluate(async () => {
  const { MAPS } = await import("/src/data/maps.ts");
  const { TILES } = await import("/src/art/tiles.ts");
  const out = [];
  for (const [mapId, map] of Object.entries(MAPS)) {
    if (!map.outdoor) continue;
    const tileAt = (x, y) => map.tiles[y]?.[x] ?? "T";
    for (const w of map.warps ?? []) {
      const target = MAPS[w.toMap];
      const ch = tileAt(w.x, w.y);
      if (!target || target.outdoor || !["d", "D", "g"].includes(ch)) continue;
      const below = tileAt(w.x, w.y + 1);
      const belowDef = TILES[below];
      if (!belowDef || belowDef.solid || belowDef.water) {
        out.push(`${mapId}->${w.toMap} porta (${w.x},${w.y}) senza fronte libero sotto: '${below}'`);
      }
      const returnsToFront = (target.warps ?? []).some(
        (back) => back.toMap === mapId && back.toX === w.x && back.toY === w.y + 1
      );
      if (!returnsToFront) {
        out.push(`${mapId}->${w.toMap} porta (${w.x},${w.y}) non torna al fronte (${w.x},${w.y + 1})`);
      }
    }
  }
  return out;
});

if (problems.length === 0) {
  console.log("OK — porte outdoor allineate e accessibili solo dal fronte.");
} else {
  console.log(`TROVATI ${problems.length} problemi porte:`);
  for (const p of problems) console.log("  " + p);
  process.exitCode = 1;
}
await browser.close();
