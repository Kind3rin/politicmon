// Guardrail interazioni: importa la VERA tabella MAPS dal dev server (così copre
// anche le mappe generate da template: gym/bar/house/market). Verifica che ogni
// CARTELLO sia leggibile (cella ortogonale libera, non occupata da un NPC), che
// nessun NPC copra un cartello (interact() controlla gli NPC PRIMA dei cartelli),
// e che nessun warp non-porta cada sul fronte (cella sotto) di una porta outdoor.
// Uso: dev server su :5179, poi `node scripts/check-interactables.mjs`.
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5179";
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(BASE, { waitUntil: "networkidle" });

const problems = await page.evaluate(async () => {
  const { MAPS } = await import("/src/data/maps.ts");
  const { TILES } = await import("/src/art/tiles.ts");
  const out = [];
  const standable = (ch) => {
    const d = TILES[ch];
    return !!d && !d.solid && !d.water; // a piedi
  };
  for (const [id, map] of Object.entries(MAPS)) {
    const at = (x, y) => map.tiles[y]?.[x] ?? "T";
    const npcSet = new Set((map.npcs ?? []).map((n) => `${n.x},${n.y}`));
    // 1. cartelli
    for (const s of map.signs ?? []) {
      if (npcSet.has(`${s.x},${s.y}`)) {
        out.push(`${id}: cartello (${s.x},${s.y}) COPERTO da un NPC.`);
      }
      const neigh = [[0, -1], [0, 1], [-1, 0], [1, 0]];
      const readable = neigh.some(([dx, dy]) =>
        standable(at(s.x + dx, s.y + dy)) && !npcSet.has(`${s.x + dx},${s.y + dy}`)
      );
      if (!readable) {
        out.push(`${id}: cartello (${s.x},${s.y})='${at(s.x, s.y)}' ILLEGGIBILE (nessuna cella libera attorno).`);
      }
    }
    // 2. warp non-porta sul fronte di una porta outdoor
    if (map.outdoor) {
      const fronts = new Map();
      for (const w of map.warps ?? []) {
        const ch = at(w.x, w.y);
        if (["d", "D", "g"].includes(ch)) fronts.set(`${w.x},${w.y + 1}`, `${w.x},${w.y}`);
      }
      for (const w of map.warps ?? []) {
        const ch = at(w.x, w.y);
        const key = `${w.x},${w.y}`;
        if (!["d", "D", "g"].includes(ch) && fronts.has(key)) {
          out.push(`${id}: warp->${w.toMap} a (${w.x},${w.y}) cade sul FRONTE della porta ${fronts.get(key)} → porta irraggiungibile.`);
        }
      }
    }
  }
  return out;
});

if (problems.length === 0) {
  console.log("OK — cartelli leggibili, niente NPC su cartelli, niente warp sul fronte porta.");
} else {
  console.log(`TROVATI ${problems.length} problemi di interazione:`);
  for (const p of problems) console.log("  " + p);
  process.exitCode = 1;
}
await browser.close();
