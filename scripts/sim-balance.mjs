// Monte Carlo balance harness per Politicmon — usa il VERO codice di gioco.
// Niente copie di formule: la pagina importa /src/game/battle/sim.ts,
// /src/game/monster.ts, /src/data/* via il dev server Vite (:5179) e gira
// le simulazioni nel browser (pattern dei guardrail, vedi check-duel.mjs).
// RNG deterministico: Math.random è rimpiazzato da mulberry32 con seed fisso,
// così due run producono gli stessi numeri.
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5179";
const browser = await chromium.launch();
const page = await browser.newPage();
try {
  await page.goto(BASE, { waitUntil: "networkidle" });
} catch {
  console.error(`sim-balance: dev server non raggiungibile su ${BASE} (npm run dev:local -- --port 5179)`);
  await browser.close();
  process.exit(1);
}

const report = await page.evaluate(async () => {
  const { makeCombatant, calcDamage, chooseFoeMove, effectiveStat } = await import("/src/game/battle/sim.ts");
  const { createMonster, statsOf, speciesOf } = await import("/src/game/monster.ts");
  const { MOVES } = await import("/src/data/moves.ts");
  const { typeMultiplier } = await import("/src/data/poltypes.ts");

  // RNG deterministico: sim.ts/chooseFoeMove usano Math.random internamente,
  // quindi lo si sostituisce globalmente per la durata della simulazione.
  function mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const realRandom = Math.random;
  Math.random = mulberry32(0xc0ffee);

  const AI_NORMAL = { whiff: 0.48, canHeal: false, finisher: false }; // wild/comune
  const rng = () => Math.random();

  function makeMon(speciesId, level) {
    return createMonster(speciesId, level);
  }

  // "Giocatore ragionevole": massimizza il danno atteso del turno.
  function choosePlayerMove(self, target) {
    const usable = self.mon.moves.filter((s) => s.pp > 0).map((s) => MOVES[s.id]);
    if (usable.length === 0) return MOVES.comizio;
    let best = null, bestScore = -1;
    for (const move of usable) {
      if (move.power <= 0) continue;
      const tMult = typeMultiplier(move.type, speciesOf(target.mon).types);
      const stab = speciesOf(self.mon).types.includes(move.type) ? 1.5 : 1;
      const score = move.power * stab * tMult * (move.accuracy / 100);
      if (score > bestScore) { bestScore = score; best = move; }
    }
    return best ?? usable[0];
  }

  // Applica una mossa (semantica di moveSteps semplificata: niente presentazione).
  function applyMove(attacker, defender, move) {
    if (attacker.mon.status === "indagato" && rng() < 0.25) return;
    if (attacker.gaffeTurns > 0) {
      attacker.gaffeTurns -= 1;
      if (rng() < 0.33) {
        const self = Math.max(1, Math.floor((attacker.mon.level * 2) / 3) + 2);
        attacker.mon.hp = Math.max(0, attacker.mon.hp - self);
        return;
      }
    }
    const selfTargeted = move.power === 0 && !move.effect?.status && move.effect?.stat?.target !== "foe";
    if (!selfTargeted && rng() * 100 >= move.accuracy) return;
    if (move.power > 0) {
      const res = calcDamage(attacker, defender, move); // VERO calcDamage di sim.ts
      defender.mon.hp = Math.max(0, defender.mon.hp - res.damage);
      if (move.effect?.drainRatio) {
        const max = statsOf(attacker.mon).hp;
        attacker.mon.hp = Math.min(max, attacker.mon.hp + Math.max(1, Math.floor(res.damage * move.effect.drainRatio)));
      }
      if (move.effect?.recoilRatio) {
        attacker.mon.hp = Math.max(0, attacker.mon.hp - Math.max(1, Math.floor(res.damage * move.effect.recoilRatio)));
      }
    }
    const fx = move.effect;
    if (fx?.healRatio) {
      const max = statsOf(attacker.mon).hp;
      attacker.mon.hp = Math.min(max, attacker.mon.hp + Math.floor(max * fx.healRatio));
      if (fx.cureStatus) attacker.mon.status = null;
    }
    if (fx?.stat) {
      const tgt = fx.stat.target === "self" ? attacker : defender;
      if (fx.stat.chance === undefined || rng() * 100 < fx.stat.chance) {
        tgt.stages[fx.stat.key] = Math.max(-6, Math.min(6, tgt.stages[fx.stat.key] + fx.stat.stages));
      }
    }
    if (fx?.status && defender.mon.hp > 0 && rng() * 100 < fx.status.chance) {
      const id = fx.status.id;
      if (!(defender.mon.status || (id === "gaffe" && defender.gaffeTurns > 0))) {
        if (id === "gaffe") defender.gaffeTurns = 2 + Math.floor(rng() * 3);
        else defender.mon.status = id;
      }
    }
  }

  function endOfTurnScandalo(c) {
    if (c.mon.hp > 0 && c.mon.status === "scandalo") {
      c.mon.hp = Math.max(0, c.mon.hp - Math.max(1, Math.floor(statsOf(c.mon).hp / 8)));
    }
  }

  function runBattle(playerSpec, playerLv, foeSpec, foeLv) {
    const player = makeCombatant(makeMon(playerSpec, playerLv));
    const foe = makeCombatant(makeMon(foeSpec, foeLv));
    const maxTurns = 60;
    for (let turn = 1; turn <= maxTurns; turn++) {
      const pMove = choosePlayerMove(player, foe);
      const fMove = chooseFoeMove(foe, player, AI_NORMAL);
      const pPri = pMove.effect?.priority ?? 0;
      const fPri = fMove.effect?.priority ?? 0;
      let playerFirst;
      if (pPri !== fPri) playerFirst = pPri > fPri;
      else {
        const ps = effectiveStat(player, "spd"), fs = effectiveStat(foe, "spd");
        playerFirst = ps === fs ? rng() < 0.5 : ps > fs;
      }
      const order = playerFirst ? [[player, foe, pMove], [foe, player, fMove]]
                                : [[foe, player, fMove], [player, foe, pMove]];
      for (const [atk, def, mv] of order) {
        if (atk.mon.hp <= 0 || def.mon.hp <= 0) continue;
        applyMove(atk, def, mv);
        if (def.mon.hp <= 0) return { winner: atk === player ? "player" : "foe", turns: turn };
      }
      endOfTurnScandalo(player);
      endOfTurnScandalo(foe);
      if (player.mon.hp <= 0) return { winner: "foe", turns: turn };
      if (foe.mon.hp <= 0) return { winner: "player", turns: turn };
    }
    const ph = player.mon.hp / statsOf(player.mon).hp;
    const fh = foe.mon.hp / statsOf(foe.mon).hp;
    return { winner: ph >= fh ? "player" : "foe", turns: maxTurns };
  }

  const N = 2000;
  const out = { evenTurns: [], winRates: [], early: [] };

  const EVEN_PAIRS = [
    ["giorgiagon", "giorgiagon"], ["schleinix", "schleinix"], ["renzilla", "renzilla"],
    ["salvinator", "salvinator"], ["draghimon", "draghimon"], ["tajanide", "tajanide"],
    ["giorgiagon", "schleinix"], ["renzilla", "tajanide"], ["draghimon", "trumpon"]
  ];
  for (const lv of [10, 20, 30]) {
    let total = 0, count = 0;
    for (const [a, b] of EVEN_PAIRS) {
      for (let i = 0; i < N; i++) { total += runBattle(a, lv, b, lv).turns; count++; }
    }
    out.evenTurns.push({ lv, avg: total / count });
  }

  const MID_POOL = ["giorgiagon", "schleinix", "renzilla", "salvinator", "draghimon", "tajanide", "trumpon", "macronfox", "vannaccix", "muskrat"];
  for (const d of [-2, 0, 2]) {
    let wins = 0, turnsSum = 0;
    for (let i = 0; i < N; i++) {
      const ps = MID_POOL[Math.floor(rng() * MID_POOL.length)];
      const fs = MID_POOL[Math.floor(rng() * MID_POOL.length)];
      const r = runBattle(ps, 20, fs, 20 + d);
      if (r.winner === "player") wins++;
      turnsSum += r.turns;
    }
    out.winRates.push({ delta: d, wr: (wins / N) * 100, avgTurns: turnsSum / N });
  }

  const STARTERS = ["giorgetta", "ellyna", "renzino"];
  const EARLY_WILD = ["salvinott", "grillix", "contemorfo", "tajanide", "vannaccix", "calendauro"];
  for (const lv of [5, 8, 12]) {
    let foePctSum = 0, playerPctSum = 0, ttdSum = 0, n = 0;
    for (const p of STARTERS) {
      for (const w of EARLY_WILD) {
        const pC = makeCombatant(makeMon(p, lv));
        const wC = makeCombatant(makeMon(w, lv));
        const pMax = statsOf(pC.mon).hp, wMax = statsOf(wC.mon).hp;
        let foeDmg = 0, plDmg = 0;
        const S = 800;
        for (let i = 0; i < S; i++) {
          const fm = chooseFoeMove(wC, pC);
          if (fm.power > 0) foeDmg += calcDamage(wC, pC, fm).damage;
          const pm = choosePlayerMove(pC, wC);
          if (pm.power > 0) plDmg += calcDamage(pC, wC, pm).damage;
        }
        foePctSum += (foeDmg / S / pMax) * 100;
        playerPctSum += (plDmg / S / wMax) * 100;
        ttdSum += pMax / Math.max(1, foeDmg / S);
        n++;
      }
    }
    out.early.push({ lv, foeHitPct: foePctSum / n, playerHitPct: playerPctSum / n, playerTTD: ttdSum / n });
  }

  Math.random = realRandom;
  return out;
});

await browser.close();

console.log("=== POLITICMON BALANCE (VERO sim.ts, RNG deterministico seed 0xc0ffee) ===\n");
console.log("--- 1. TURNI MEDI PER KO (scontro alla pari, stesso livello) ---");
for (const r of report.evenTurns) console.log(`  Livello ${r.lv}: ${r.avg.toFixed(2)} turni medi`);
console.log("\n--- 2. WIN-RATE GIOCATORE (mossa piu forte) vs IA comune, lv 20 ---");
for (const r of report.winRates) {
  console.log(`  delta ${r.delta >= 0 ? "+" : ""}${r.delta}: win-rate ${r.wr.toFixed(1)}%  (${r.avgTurns.toFixed(1)} turni)`);
}
console.log("\n--- 3. EARLY GAME (starter vs wild, stesso livello) ---");
for (const r of report.early) {
  console.log(`  Lv ${r.lv}: wild colpisce ${r.foeHitPct.toFixed(1)}% HP/colpo, giocatore ${r.playerHitPct.toFixed(1)}%; muori in ~${r.playerTTD.toFixed(1)} colpi`);
}

// Verdetto target ~5-8 turni a parità di livello.
const avgAll = report.evenTurns.reduce((s, r) => s + r.avg, 0) / report.evenTurns.length;
const inTarget = avgAll >= 4 && avgAll <= 9;
console.log(`\nMedia complessiva scontri alla pari: ${avgAll.toFixed(2)} turni — target 5-8: ${inTarget ? "OK" : "FUORI TARGET"}`);
process.exit(0);
