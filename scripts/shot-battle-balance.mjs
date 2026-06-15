// Verifica del ribilanciamento battaglie: conta i turni fino al KO in scontri
// a pari livello e cattura uno screenshot della scena di lotta.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5179";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
await page.goto(BASE, { waitUntil: "networkidle" });

const out = await page.evaluate(async () => {
  const { calcDamage, makeCombatant, chooseFoeMove } = await import("/src/game/battle/sim.ts");
  const { createMonster, statsOf } = await import("/src/game/monster.ts");
  const { MOVES } = await import("/src/data/moves.ts");
  const { SPECIES } = await import("/src/data/species.ts");

  // Simula uno scontro: A attacca con la mossa-danno più forte che ha, B idem.
  // Conta i turni finché uno dei due va KO. Niente Math.random nel conteggio
  // medio: ripetiamo molte volte e facciamo la media.
  function bestDamageMove(mon) {
    const dmg = mon.moves.map((s) => MOVES[s.id]).filter((m) => m.power > 0);
    return dmg.sort((a, b) => b.power - a.power)[0] ?? MOVES.comizio;
  }
  function duel(idA, idB, level) {
    const a = makeCombatant(createMonster(idA, level));
    const b = makeCombatant(createMonster(idB, level));
    const mvA = bestDamageMove(a.mon);
    let turns = 0;
    while (a.mon.hp > 0 && b.mon.hp > 0 && turns < 50) {
      turns++;
      // A colpisce B
      b.mon.hp = Math.max(0, b.mon.hp - calcDamage(a, b, mvA).damage);
      if (b.mon.hp <= 0) break;
      // B risponde con la scelta dell'IA
      const mvB = chooseFoeMove(b, a);
      if (mvB.power > 0) a.mon.hp = Math.max(0, a.mon.hp - calcDamage(b, a, mvB).damage);
    }
    return turns;
  }
  function avgTurns(idA, idB, level, runs = 200) {
    let sum = 0;
    for (let i = 0; i < runs; i++) sum += duel(idA, idB, level);
    return (sum / runs).toFixed(1);
  }

  // Campioni rappresentativi a vari livelli e matchup.
  const samples = [
    ["giorgetta", "salvinott", 6, "starter vs early (lv6)"],
    ["salvinott", "giorgetta", 10, "neutro (lv10)"],
    ["giorgiagon", "schleinix", 18, "DESTRA vs SIN/VERDE 4x (lv18)"],
    ["giorgiagon", "renzilla", 18, "neutro evoluti (lv18)"],
    ["renzilla", "giorgiagon", 25, "neutro tardo (lv25)"],
    ["renzilla", "salvinator", 25, "tardo gioco (lv25)"]
  ];
  const results = samples.map(([a, b, lv, label]) => ({
    label, turns: avgTurns(a, b, lv)
  }));

  // HP/def a vari livelli per la specie starter, per riferimento.
  const refLevels = [5, 10, 18, 25];
  const ref = refLevels.map((lv) => {
    const m = createMonster("giorgetta", lv);
    const s = statsOf(m);
    return { lv, hp: s.hp, def: s.def, spc: s.spc };
  });

  return { results, ref };
});

console.log("=== TURNI MEDI PER KO (target: 4-8) ===");
for (const r of out.results) console.log(`  ${r.label}: ${r.turns} turni`);
console.log("\n=== STAT GIORGETTA per livello ===");
for (const r of out.ref) console.log(`  lv${r.lv}: HP ${r.hp}, DEF ${r.def}, RETORICA ${r.spc}`);

await browser.close();
