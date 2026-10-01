import { mkdirSync, writeFileSync } from "node:fs";
import { TRAINERS } from "../src/data/trainers.ts";
import { MOVES } from "../src/data/moves.ts";
import { typeMultiplier } from "../src/data/poltypes.ts";
import { createMonster, speciesOf, statsOf } from "../src/game/monster.ts";
import { chooseFoeMove, makeCombatant, foeMoveScore } from "../src/game/battle/sim.ts";
import { makeDuelSim, resolveTurn, applySwitch, aliveCount } from "../src/game/battle/duelsim.ts";
import { resolveFuturoPhase } from "../src/game/battle/effectContract.ts";
import { trainerAi } from "../src/game/battle/trainerStyle.ts";

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
function teamFromTrainer(id) { return TRAINERS[id].team.map(([speciesId, level, moves, held]) => { const mon = createMonster(speciesId, level); if (moves) mon.moves = moves.map((moveId) => ({ id: moveId, pp: MOVES[moveId].pp })); if (held) mon.heldItem = held; return mon; }); }
function playerTeam(config, run) { return Array.from({ length: config.size }, (_, i) => createMonster(config.pool[(run + i * 3) % config.pool.length], Math.max(1, config.level + ((run + i) % 3) - 1))); }
function battle(playerMons, foeMons, rng, config) {
  // Il briefing consente di scegliere il leader prima della sfida. Il modello
  // sceglie tra i membri della fixture; non aggiunge livelli, mostri o cure.
  const opening = makeCombatant(foeMons[0]);
  const prepared = playerMons.map((mon, index) => ({ index, score: Math.max(...mon.moves.map((slot) => foeMoveScore(makeCombatant(mon), opening, MOVES[slot.id]))) }));
  const lead = prepared.sort((a,b) => b.score-a.score)[0].index;
  if(lead) { const mon=playerMons.splice(lead,1)[0];playerMons.unshift(mon); }
  const sim=makeDuelSim(playerMons,foeMons);
  const ai=trainerAi(config.id,Boolean(TRAINERS[config.id].badge),false,3);
  let turns=0, phase=false;
  while(turns++<180 && aliveCount(sim.host) && aliveCount(sim.guest)) {
    const nextFoe=sim.guest.active.mon.hp<=0;
    if(nextFoe) applySwitch(sim,'guest',sim.guest.party.findIndex(m=>m.hp>0),[]);
    // In PVE il rimpasto dopo un KO avversario non concede un contrattacco.
    // Si considerano danno effettivo, salute rimasta e risposta del nuovo tipo.
    if(nextFoe || sim.host.active.mon.hp<=0) {
      const candidates=sim.host.party.map((mon,index)=> {
        if(mon.hp<=0) return {index,score:-Infinity};
        const own=mon.uid===sim.host.active.mon.uid?sim.host.active:makeCombatant(mon);
        const attack=Math.max(...mon.moves.filter(s=>s.pp>0).map(s=>foeMoveScore(own,sim.guest.active,MOVES[s.id])),0);
        const threat=Math.max(...sim.guest.active.mon.moves.filter(s=>s.pp>0).map(s=>foeMoveScore(sim.guest.active,own,MOVES[s.id])),0);
        return {index,score:attack-threat*.45+mon.hp/statsOf(mon).hp*12};
      }).sort((a,b)=>b.score-a.score);
      if(sim.host.party[candidates[0].index].uid!==sim.host.active.mon.uid) applySwitch(sim,'host',candidates[0].index,[]);
    }
    if(config.id==='futuro-anteriore') {
      const change=resolveFuturoPhase(sim.guest.active,phase);
      if(change.triggered) {phase=true;sim.guest.active.stages=change.stages;}
    }
    const pm=playerMove(sim.host.active,sim.guest.active);
    const fm=chooseFoeMove(sim.guest.active,sim.host.active,ai,rng);
    resolveTurn(sim,{kind:'move',moveId:pm.id},{kind:'move',moveId:fm.id},rng);
    // Gli hold non viaggiano in PvP; il modello PVE aggiunge qui solo la moka.
    for(const side of [sim.host,sim.guest]) {
      const mon=side.active.mon,max=statsOf(mon).hp;
      if(mon.hp>0 && mon.heldItem==='caffettiera') mon.hp=Math.min(max,mon.hp+Math.max(1,Math.floor(max/16)));
    }
  }
  return {win:aliveCount(sim.host)>0 && aliveCount(sim.guest)===0,turns:Math.min(turns,180)};
}

const realRandom = Math.random; const rows = [];
for (const config of CONFIGS) {
  let wins = 0; let turns = 0;
  for (let run = 0; run < RUNS; run += 1) { const rng = mulberry32(0x51a7 + run * 97 + config.id.length * 1009); Math.random = rng; const result = battle(playerTeam(config, run), teamFromTrainer(config.id), rng, config); wins += Number(result.win); turns += result.turns; }
  const winRate = wins / RUNS * 100; rows.push({ boss: config.id, runs: RUNS, winRate, avgTurns: turns / RUNS, target: winRate >= TARGET_MIN && winRate <= TARGET_MAX });
}
Math.random = realRandom;
const lines = ["# Boss — simulazione con briefing e IA tattica", "", `Run per boss: ${RUNS}. Target vittorie primo tentativo: ${TARGET_MIN}-${TARGET_MAX}%.`, "", "Regole condivise reali: status, immunità, precisione, cure, PP, rinculo, abilità e KO. IA contestuale normale e leader scelto nel briefing, senza consumabili. Sondaggi neutrali; dottrina della finale non simulata. Le fixture sono squadre plausibili, non telemetria umana.", "", "| Boss | Run | Vittorie | Turni medi | Esito |", "|---|---:|---:|---:|---|"];
for (const row of rows) lines.push(`| ${row.boss} | ${row.runs} | ${row.winRate.toFixed(1)}% | ${row.avgTurns.toFixed(1)} | ${row.target ? "OK" : "FUORI TARGET"} |`);
mkdirSync("design/balance", { recursive: true }); writeFileSync("design/balance/p7-boss-simulations.md", `${lines.join("\n")}\n`); console.log(lines.join("\n"));
if (rows.some((row) => !row.target)) process.exitCode = 1;
