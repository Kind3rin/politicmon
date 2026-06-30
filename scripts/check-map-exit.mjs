// Guardrail: nessuna mappa deve essere una trappola senza uscita (autosave-trap).
// - Ogni mappa raggiungibile deve avere almeno un'uscita (warp verso un'altra
//   mappa oppure un edge nord/sud).
// - Ogni interno (outdoor:false) deve avere almeno un warp che riporta a una
//   mappa outdoor (direttamente o attraverso una catena di interni).
// Uso: dev server attivo su :5179, poi `node scripts/check-map-exit.mjs`.
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5179";
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(BASE, { waitUntil: "networkidle" });

const problems = await page.evaluate(async () => {
  const { MAPS } = await import("/src/data/maps.ts");
  const out = [];

  const exitsOf = (map) => {
    const targets = new Set();
    for (const w of map.warps ?? []) {
      if (MAPS[w.toMap]) targets.add(w.toMap);
    }
    for (const dir of ["north", "south"]) {
      const edge = map.edges?.[dir];
      if (edge && MAPS[edge.toMap]) targets.add(edge.toMap);
    }
    return targets;
  };

  for (const [mapId, map] of Object.entries(MAPS)) {
    const exits = exitsOf(map);
    // 1) Ogni mappa deve avere almeno un'uscita verso un'altra mappa.
    if (exits.size === 0) {
      out.push(`${mapId}: nessuna uscita (0 warp/edge validi) → trappola autosave`);
      continue;
    }

    // 2) Un interno deve poter tornare all'aperto: BFS sulle uscite finché si
    //    raggiunge una mappa outdoor (gli interni concatenati sono ammessi).
    if (!map.outdoor) {
      const seen = new Set([mapId]);
      const queue = [...exits];
      let reachesOutdoor = false;
      while (queue.length) {
        const next = queue.shift();
        if (seen.has(next)) continue;
        seen.add(next);
        const target = MAPS[next];
        if (!target) continue;
        if (target.outdoor) {
          reachesOutdoor = true;
          break;
        }
        for (const t of exitsOf(target)) {
          if (!seen.has(t)) queue.push(t);
        }
      }
      if (!reachesOutdoor) {
        out.push(`${mapId}: interno senza ritorno verso una mappa outdoor`);
      }
    }
  }

  return out;
});

if (problems.length === 0) {
  console.log("OK — ogni mappa ha un'uscita e ogni interno torna all'aperto.");
} else {
  console.log(`TROVATI ${problems.length} problemi di uscita mappa:`);
  for (const p of problems) console.log("  " + p);
  process.exitCode = 1;
}
await browser.close();
