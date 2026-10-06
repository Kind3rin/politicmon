/** How much of a fight is a choice? Plays the checkpoint fights with the greedy policy of `playtest:campaign`
 * and reports, per fight: turns, how many different moves were used, how often a turn repeats the last move,
 * and how often the best move leads the second best by more than 40% (a "dominant" turn: nothing to think about).
 * It measures the choice of moves only: postures, items, switching and the field are not simulated. */
import { MOVES } from "../src/data/moves.ts";
import { typeMultiplier } from "../src/data/poltypes.ts";
import { TRAINERS } from "../src/data/trainers.ts";
import { createMonster, speciesOf, statsOf } from "../src/game/monster.ts";
import { aliveCount, applySwitch, makeDuelSim, resolveTurn, usableMoves } from "../src/game/battle/duelsim.ts";

const RUNS = Number(process.env.RUNS ?? 200);
const SCENARIOS = [
  { id: "Nino, allenatore comune (Percorso 1)", trainerId: "praticante", player: [["ellyna", 7]] },
  { id: "Mara, prova facoltativa", trainerId: "stagista", player: [["schleinix", 9], ["grillix", 7]] },
  { id: "Sua Emittenza (1ª medaglia)", trainerId: "emittenza", player: [["giorgetta", 12], ["renzino", 11], ["salvinott", 11]] },
  { id: "Lady Direttiva (2ª)", trainerId: "ladydirettiva", player: [["giorgiagon", 18], ["renzilla", 17], ["salvinott", 17]] },
  { id: "Mr. Tycoon (3ª)", trainerId: "tycoon", player: [["giorgiagon", 23], ["renzilla", 22], ["salvinator", 22], ["grillix", 21]] },
  { id: "Presidente Ombra", trainerId: "boss", player: [["giorgiagon", 27], ["renzilla", 26], ["salvinator", 26], ["grillix", 25], ["contemorfo", 25]] },
  { id: "Il Garante", trainerId: "garante", player: [["giorgiagon", 33], ["renzilla", 32], ["salvinator", 32], ["grillix", 31], ["conteblob", 31], ["berlusconix", 30]] }
] as const;

function rngFor(seed: number) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const team = (defs: readonly (readonly [string, number] | readonly [string, number, any, any])[]) => defs.map(([id, level]) => createMonster(id, level));
function score(mon: any, defender: any, slot: { id: string }) {
  const move = MOVES[slot.id];
  const stab = speciesOf(mon).types.includes(move.type) ? 1.5 : 1;
  const eff = move.power > 0 ? typeMultiplier(move.type, speciesOf(defender).types) : 1;
  return (move.power === 0 ? (move.effect?.healRatio ? 42 : 12) : move.power) * stab * eff * (move.accuracy / 100);
}
const ranked = (side: any, other: any) => usableMoves(side.active.mon).map((m: any) => ({ id: m.id, s: score(side.active.mon, other.active.mon, m) })).sort((a: any, b: any) => b.s - a.s);
const nextAlive = (side: any) => side.party.findIndex((m: any, i: number) => i !== side.activeIdx && m.hp > 0);

console.log("Scontro".padEnd(30), "turni", "mosse diverse", "ripete", "dominante");
for (const sc of SCENARIOS) {
  const trainer = (TRAINERS as any)[sc.trainerId];
  let turnsSum = 0, distinctSum = 0, repeat = 0, dominant = 0, decisions = 0, fights = 0;
  for (let run = 0; run < RUNS; run++) {
    const sim = makeDuelSim(team(sc.player as any), team(trainer.team));
    const rng = rngFor(0xabc + run);
    const used = new Set<string>(), last = new Map<string, string>();
    let turns = 0;
    while (turns < 120 && aliveCount(sim.host) && aliveCount(sim.guest)) {
      if (sim.host.active.mon.hp <= 0) applySwitch(sim, "host", nextAlive(sim.host), []);
      if (sim.guest.active.mon.hp <= 0) applySwitch(sim, "guest", nextAlive(sim.guest), []);
      if (sim.host.active.mon.hp <= 0 || sim.guest.active.mon.hp <= 0) break;
      turns++;
      const mine = ranked(sim.host, sim.guest), theirs = ranked(sim.guest, sim.host);
      if (!mine.length) break;
      const pick = mine[0].id, uid = (sim.host.active.mon as any).uid ?? sim.host.activeIdx.toString();
      used.add(pick);
      decisions++;
      if (last.get(uid) === pick) repeat++;
      last.set(uid, pick);
      if (mine.length > 1 && mine[0].s > mine[1].s * 1.4) dominant++;
      else if (mine.length === 1) dominant++;
      resolveTurn(sim, { kind: "move", moveId: pick }, { kind: "move", moveId: theirs[0]?.id ?? "comizio" }, rng);
    }
    turnsSum += turns; distinctSum += used.size; fights++;
  }
  console.log(sc.id.padEnd(30), (turnsSum / fights).toFixed(1).padStart(5), (distinctSum / fights).toFixed(1).padStart(13), (100 * repeat / decisions).toFixed(0).padStart(5) + "%", (100 * dominant / decisions).toFixed(0).padStart(8) + "%");
}
