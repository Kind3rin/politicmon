import { mkdirSync, writeFileSync } from "node:fs";
import { TRAINERS } from "../src/data/trainers.ts";
import { MOVES } from "../src/data/moves.ts";
import { typeMultiplier } from "../src/data/poltypes.ts";
import { createMonster, speciesOf, statsOf } from "../src/game/monster.ts";
import { AI_COMPETENT, calcDamage, chooseFoeMove, effectiveStat, makeCombatant } from "../src/game/battle/sim.ts";

const RUNS = Number(process.env.BOSS_SIM_RUNS ?? 1000);
const TARGET_MIN = 55; const TARGET_MAX = 75;
const CONFIGS = [
  { id: "emittenza", level: 12, size: 2, pool: ["giorgetta", "ellyna", "renzino", "grillix", "salvinott"] },
  { id: "ladydirettiva", level: 17, size: 2, pool: ["giorgiagon", "schleinix", "renzilla", "contemorfo", "calendauro"] },
  { id: "tycoon", level: 22, size: 3, pool: ["giorgiagon", "schleinix", "renzilla", "salvinator", "tajanide", "macronfox"] },
  { id: "boss", level: 22, size: 4, pool: ["giorgiagon", "schleinix", "renzilla", "salvinator", "draghimon", "tajanide"] },
  { id: "garante", level: 32, size: 5, pool: ["giorgiagon", "schleinix", "renzilla", "salvinator", "draghimon", "trumpon"] },
  { id: "futuro-anteriore", level: 50, size: 3, pool: ["salistrobo", "gianimago", "crosettank", "campocorno", "referendodo", "futurorso"] },
  { id: "partner-perfetto", level: 53, size: 3, pool: ["salistrobo", "quasimagiani", "crosettank", "campocorno", "referendodo", "futurorso"] },
  { id: "commissione", level: 54, size: 6, pool: ["salistrobo", "quasimagiani", "crosettank", "campocorno", "referendodo", "futurorso"] },
  { id: "algoritmo-sovrano", level: 55, size: 6, pool: ["salistrobo", "quasimagiani", "crosettank", "campocorno", "referendodo", "futurorso"] }
];

function mulberry32(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function playerMove(self, target) {
  const usable = self.mon.moves.filter((slot) => slot.pp > 0).map((slot) => MOVES[slot.id]);
  return usable.reduce((best, move) => {
    const score = move.power > 0 ? move.power * (speciesOf(self.mon).types.includes(move.type) ? 1.5 : 1) * typeMultiplier(move.type, speciesOf(target.mon).types) * move.accuracy / 100 : (move.effect?.healRatio && self.mon.hp / statsOf(self.mon).hp < .42 ? 115 : 8);
    return score > best.score ? { move, score } : best;
  }, { move: usable[0] ?? MOVES.comizio, score: -1 }).move;
}
function applyMove(attacker, defender, move, rng) {
  const slot = attacker.mon.moves.find((entry) => entry.id === move.id); if (slot?.pp > 0) slot.pp -= 1;
  if (rng() * 100 >= move.accuracy) return;
  if (move.power > 0) defender.mon.hp = Math.max(0, defender.mon.hp - calcDamage(attacker, defender, move, rng, { sondaggi: 50 }).damage);
  const fx = move.effect;
  if (fx?.healRatio) attacker.mon.hp = Math.min(statsOf(attacker.mon).hp, attacker.mon.hp + Math.floor(statsOf(attacker.mon).hp * fx.healRatio));
  if (fx?.stat && (fx.stat.chance === undefined || rng() * 100 < fx.stat.chance)) { const target = fx.stat.target === "self" ? attacker : defender; target.stages[fx.stat.key] = Math.max(-6, Math.min(6, target.stages[fx.stat.key] + fx.stat.stages)); }
  if (fx?.status && defender.mon.hp > 0 && !defender.mon.status && rng() * 100 < fx.status.chance && fx.status.id !== "gaffe") defender.mon.status = fx.status.id;
}
function teamFromTrainer(id) { return TRAINERS[id].team.map(([speciesId, level, moves, held]) => { const mon = createMonster(speciesId, level); if (moves) mon.moves = moves.map((moveId) => ({ id: moveId, pp: MOVES[moveId].pp })); if (held) mon.heldItem = held; return mon; }); }
function playerTeam(config, run) { return Array.from({ length: config.size }, (_, i) => createMonster(config.pool[(run + i * 3) % config.pool.length], Math.max(1, config.level + ((run + i) % 3) - 1))); }
function battle(playerMons, foeMons, rng) {
  let pi = 0; let fi = 0; let turns = 0; let player = makeCombatant(playerMons[0]); let foe = makeCombatant(foeMons[0]);
  while (turns++ < 180) {
    const pm = playerMove(player, foe); const fm = chooseFoeMove(foe, player, AI_COMPETENT);
    const pp = pm.effect?.priority ?? 0; const fp = fm.effect?.priority ?? 0; const playerFirst = pp !== fp ? pp > fp : effectiveStat(player, "spd") === effectiveStat(foe, "spd") ? rng() < .5 : effectiveStat(player, "spd") > effectiveStat(foe, "spd");
    for (const [atk, def, move] of playerFirst ? [[player, foe, pm], [foe, player, fm]] : [[foe, player, fm], [player, foe, pm]]) { if (atk.mon.hp > 0 && def.mon.hp > 0) applyMove(atk, def, move, rng); }
    if (player.mon.status === "scandalo" && player.mon.hp > 0) player.mon.hp = Math.max(0, player.mon.hp - Math.max(1, Math.floor(statsOf(player.mon).hp / 8)));
    if (foe.mon.status === "scandalo" && foe.mon.hp > 0) foe.mon.hp = Math.max(0, foe.mon.hp - Math.max(1, Math.floor(statsOf(foe.mon).hp / 8)));
    if (player.mon.hp <= 0) { pi += 1; if (pi >= playerMons.length) return { win: false, turns }; player = makeCombatant(playerMons[pi]); }
    if (foe.mon.hp <= 0) { fi += 1; if (fi >= foeMons.length) return { win: true, turns }; foe = makeCombatant(foeMons[fi]); }
  }
  return { win: playerMons.slice(pi).reduce((n, m) => n + Math.max(0, m.hp), 0) >= foeMons.slice(fi).reduce((n, m) => n + Math.max(0, m.hp), 0), turns };
}

const realRandom = Math.random; const rows = [];
for (const config of CONFIGS) {
  let wins = 0; let turns = 0;
  for (let run = 0; run < RUNS; run += 1) { const rng = mulberry32(0x51a7 + run * 97 + config.id.length * 1009); Math.random = rng; const result = battle(playerTeam(config, run), teamFromTrainer(config.id), rng); wins += Number(result.win); turns += result.turns; }
  const winRate = wins / RUNS * 100; rows.push({ boss: config.id, runs: RUNS, winRate, avgTurns: turns / RUNS, target: winRate >= TARGET_MIN && winRate <= TARGET_MAX });
}
Math.random = realRandom;
const lines = ["# P7-T01 — Simulazione boss", "", `Run per boss: ${RUNS}. Target vittorie primo tentativo: ${TARGET_MIN}-${TARGET_MAX}%.`, "", "| Boss | Run | Vittorie | Turni medi | Esito |", "|---|---:|---:|---:|---|"];
for (const row of rows) lines.push(`| ${row.boss} | ${row.runs} | ${row.winRate.toFixed(1)}% | ${row.avgTurns.toFixed(1)} | ${row.target ? "OK" : "FUORI TARGET"} |`);
mkdirSync("design/balance", { recursive: true }); writeFileSync("design/balance/p7-boss-simulations.md", `${lines.join("\n")}\n`); console.log(lines.join("\n"));
if (rows.some((row) => !row.target)) process.exitCode = 1;
