// Guardrail: verifica che nessun NPC/pickup stia su un tile SOLIDO o su un warp.
// Esegue contro il dev server (usa i moduli reali, niente duplicazione di dati).
// Uso: dev server attivo su :5179, poi `node scripts/check-placement.mjs`.
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5179";
const browser = await chromium.launch();
const page = await browser.newPage();
page.on("pageerror", (e) => console.error("PAGEERR:", e.message));
await page.goto(BASE, { waitUntil: "networkidle" });

const problems = await page.evaluate(async () => {
  const { MAPS } = await import("/src/data/maps.ts");
  const { TILES } = await import("/src/art/tiles.ts");
  const out = [];
  // NPC che stanno legittimamente su tile "speciali" o dietro banchi.
  const SKIP_SOLID_OK = new Set(); // nessuno per ora
  for (const [mapId, map] of Object.entries(MAPS)) {
    const tileAt = (x, y) => map.tiles[y]?.[x] ?? "T";
    const warpAt = (x, y) => (map.warps ?? []).some((w) => w.x === x && w.y === y);
    const check = (kind, id, x, y, allowWarp) => {
      const ch = tileAt(x, y);
      const def = TILES[ch];
      if (!def || def.solid) {
        out.push(`${mapId} | ${kind} | ${id} | (${x},${y}) | tile '${ch}' SOLID`);
      } else if (!allowWarp && warpAt(x, y)) {
        out.push(`${mapId} | ${kind} | ${id} | (${x},${y}) | su WARP`);
      }
    };
    for (const n of map.npcs ?? []) {
      // healer/box/shop/casino/mafia possono stare dietro un banco/su tile speciale
      const behindCounter = n.healer || n.box;
      if (behindCounter) continue;
      check("npc", n.id, n.x, n.y, n.transport === true);
    }
    for (const p of map.pickups ?? []) {
      if (p.hidden) continue;
      check("pickup", p.id, p.x, p.y, false);
    }
  }
  return out;
});

if (problems.length === 0) {
  console.log("OK — nessun NPC/pickup su tile solido o warp.");
} else {
  console.log(`TROVATI ${problems.length} problemi di placement:`);
  for (const p of problems) console.log("  " + p);
  process.exitCode = 1;
}
await browser.close();
