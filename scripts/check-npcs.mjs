// Valida le posizioni NPC: niente su tile solidi, niente sovrapposizioni tra
// NPC/pickup visibili/warp sulla stessa mappa.
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5179";
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(BASE, { waitUntil: "networkidle" });

const report = await page.evaluate(async () => {
  const { MAPS } = await import("/src/data/maps.ts");
  const { TILES } = await import("/src/art/tiles.ts");
  const problems = [];
  let npcCount = 0;
  // NPC ambientali aggiunti in questa sessione: devono stare su tile
  // calpestabili e liberi (a differenza di healer/shop, spesso dietro un bancone).
  const NEW_AMBIENT = new Set([
    "turista-cap", "influencer-cap", "euroburocrate", "pensionato-euro", "talkshow-fan"
  ]);
  for (const [mapId, map] of Object.entries(MAPS)) {
    const occupied = new Map(); // "x,y" -> chi
    const claim = (x, y, who) => {
      const k = `${x},${y}`;
      if (occupied.has(k)) {
        problems.push(`${mapId}: ${who} sovrapposto a ${occupied.get(k)} @(${x},${y})`);
      } else {
        occupied.set(k, who);
      }
    };
    for (const w of map.warps ?? []) claim(w.x, w.y, `warp->${w.toMap}`);
    for (const p of map.pickups ?? []) if (!p.hidden) claim(p.x, p.y, `pickup ${p.id}`);
    for (const n of map.npcs ?? []) {
      npcCount++;
      const isNew = NEW_AMBIENT.has(n.id);
      if (isNew) {
        const ch = map.tiles[n.y]?.[n.x] ?? "?";
        const tile = TILES[ch];
        if (!tile || tile.solid) {
          problems.push(`${mapId}: NPC ${n.id} @(${n.x},${n.y}) su tile '${ch}' SOLIDO`);
        }
      }
      // Tutti gli NPC occupano una cella: così rileviamo se un nuovo NPC
      // si sovrappone a un NPC esistente (oltre che a warp/pickup).
      const k = `${n.x},${n.y}`;
      if (occupied.has(k) && (isNew || occupied.get(k).startsWith("NPC*"))) {
        problems.push(`${mapId}: NPC ${n.id} sovrapposto a ${occupied.get(k)} @(${n.x},${n.y})`);
      } else if (!occupied.has(k)) {
        occupied.set(k, `${isNew ? "NPC*" : "NPC "}${n.id}`);
      }
    }
  }
  return { problems, npcCount };
});

console.log(`NPC totali: ${report.npcCount}`);
if (report.problems.length === 0) {
  console.log("OK: nessun NPC su tile solido o sovrapposto.");
} else {
  console.log("PROBLEMI:");
  for (const p of report.problems) console.log("  - " + p);
}
await browser.close();
process.exit(report.problems.length === 0 ? 0 : 1);
