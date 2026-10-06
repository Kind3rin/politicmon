/** Headless difficulty curve: every trainer against a fixed three-companion team, greedy on both sides.
 * Ignores status moves, stages, items, postures and switching on purpose: it measures raw stat and type pressure,
 * to compare data changes (learnsets, stats) before and after, never to predict a real player.
 *
 *   npx tsx scripts/sim-trainers.ts            # table
 */
import { MOVES } from "../src/data/moves";
import { TRAINERS } from "../src/data/trainers";
import { createMonster, statsOf, LEVEL_CAP } from "../src/game/monster";
import { makeCombatant, calcDamage, moveOrder, type Combatant } from "../src/game/battle/sim";
import { damageRange } from "../src/game/battle/tactics";

const PARTY = ["schleinix", "giorgiagon", "renzilla"];
const RUNS = Number(process.env.RUNS ?? 60);

function pick(attacker: Combatant, defender: Combatant) {
  let best: { id: string; e: number } | null = null;
  for (const slot of attacker.mon.moves) {
    const move = MOVES[slot.id];
    if (!move || move.power <= 0 || slot.pp <= 0) continue;
    const range = damageRange(attacker, defender, move);
    const e = (range.min + range.max) / 2 * move.accuracy / 100;
    if (!best || e > best.e) best = { id: slot.id, e };
  }
  return best ? MOVES[best.id] : null;
}

function duel(team: Combatant[], foes: Combatant[]): boolean {
  let p = 0, f = 0;
  for (let turn = 0; turn < 400 && p < team.length && f < foes.length; turn += 1) {
    const a = team[p], b = foes[f];
    const am = pick(a, b), bm = pick(b, a);
    const order = am && bm ? moveOrder(a, b, am, bm) : am ? "player" : "foe";
    const strike = (x: Combatant, y: Combatant, move: typeof am) => {
      if (!move || x.mon.hp <= 0 || y.mon.hp <= 0) return;
      const slot = x.mon.moves.find(s => s.id === move.id); if (slot) slot.pp = Math.max(0, slot.pp - 1);
      if (Math.random() * 100 >= move.accuracy) return;
      y.mon.hp = Math.max(0, y.mon.hp - calcDamage(x, y, move).damage);
    };
    if (order === "foe") { strike(b, a, bm); strike(a, b, am); } else { strike(a, b, am); strike(b, a, bm); }
    if (a.mon.hp <= 0) p += 1;
    if (b.mon.hp <= 0) f += 1;
  }
  return f >= foes.length;
}

const rows = Object.values(TRAINERS).map(t => ({ t, avg: t.team.reduce((s, m) => s + m[1], 0) / t.team.length }))
  .filter(r => !r.t.id.startsWith("coppa:")).sort((x, y) => x.avg - y.avg);
console.log("trainer".padEnd(22), "avgLv  win% at player level -2 / 0 / +3");
for (const { t, avg } of rows) {
  const wins = [-2, 0, 3].map(delta => {
    let won = 0;
    for (let run = 0; run < RUNS; run += 1) {
      const level = Math.max(2, Math.min(LEVEL_CAP, Math.round(avg) + delta));
      const team = PARTY.map(id => makeCombatant(createMonster(id, level)));
      const foes = t.team.map(([id, lv, moves]) => {
        const mon = createMonster(id, lv);
        if (moves) mon.moves = moves.filter(m => MOVES[m]).map(m => ({ id: m, pp: MOVES[m].pp }));
        mon.hp = statsOf(mon).hp;
        return makeCombatant(mon);
      });
      if (duel(team, foes)) won += 1;
    }
    return Math.round(100 * won / RUNS);
  });
  console.log(t.id.padEnd(22), avg.toFixed(0).padStart(5), "  ", wins.map(w => String(w).padStart(3)).join(" / "));
}
