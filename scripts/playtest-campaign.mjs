import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { MOVES } from "../src/data/moves.ts";
import { typeMultiplier } from "../src/data/poltypes.ts";
import { TRAINERS } from "../src/data/trainers.ts";
import { createMonster, speciesOf, statsOf } from "../src/game/monster.ts";
import { aliveCount, applySwitch, makeDuelSim, resolveTurn, usableMoves } from "../src/game/battle/duelsim.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const RUNS = 400;
const MAX_TURNS = 180;
const MAX_JOURNEY_ATTEMPTS = 8;

const SCENARIOS = [
  { id: "badge-auditel", trainerId: "emittenza", target: [0.55, 0.85], turns: [3, 16], heals: 1,
    player: [["giorgetta", 12], ["renzino", 11], ["salvinott", 11]] },
  { id: "badge-spread", trainerId: "ladydirettiva", target: [0.85, 1.00], turns: [4, 20], heals: 2,
    player: [["giorgiagon", 18], ["renzilla", 17], ["salvinott", 17]] },
  { id: "badge-dazio", trainerId: "tycoon", target: [0.85, 1.00], turns: [7, 28], heals: 3,
    player: [["giorgiagon", 23], ["renzilla", 22], ["salvinator", 22], ["grillix", 21]] },
  { id: "palazzo", trainerId: "boss", target: [0.85, 1.00], turns: [10, 36], heals: 4,
    player: [["giorgiagon", 27], ["renzilla", 26], ["salvinator", 26], ["grillix", 25], ["contemorfo", 25]] },
  { id: "garante", trainerId: "garante", target: [0.85, 1.00], turns: [14, 48], heals: 5,
    player: [["giorgiagon", 33], ["renzilla", 32], ["salvinator", 32], ["grillix", 31], ["conteblob", 31], ["berlusconix", 30]] },
  { id: "offshore", trainerId: "tesoriere", target: [0.85, 1.00], turns: [10, 42], heals: 5,
    player: [["giorgiagon", 50], ["renzilla", 49], ["salvinator", 49], ["conteblob", 48], ["berlusconix", 48], ["draghimon", 47]] },
  { id: "bruxelles", trainerId: "commissione", target: [0.85, 1.00], turns: [14, 52], heals: 6,
    player: [["giorgiagon", 55], ["renzilla", 54], ["salvinator", 54], ["conteblob", 53], ["berlusconix", 53], ["draghimon", 52]] }
];

const JOURNEY_PROFILES = [
  { id: "standard-a" },
  { id: "standard-b" },
  { id: "standard-c" },
  { id: "starter-sinistra", rotate: 1 },
  { id: "starter-centro", rotate: 2 },
  { id: "ordine-inverso", reverse: true },
  { id: "sinistra-parsimonioso", rotate: 1, healDelta: -1 },
  { id: "sopra-livello", levelDelta: 1 },
  { id: "parsimonioso", healDelta: -2 },
  { id: "rifornito", healDelta: 1 }
];

function rngFor(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeTeam(defs, trainer = false) {
  return defs.map((entry) => {
    const [speciesId, level, moves, heldItem] = entry;
    const mon = createMonster(speciesId, level);
    if (moves) mon.moves = moves.map((id) => ({ id, pp: MOVES[id].pp }));
    if (trainer && heldItem) mon.heldItem = heldItem;
    return mon;
  });
}

function moveScore(mon, defender, slot) {
  const move = MOVES[slot.id];
  const stab = speciesOf(mon).types.includes(move.type) ? 1.5 : 1;
  const effectiveness = move.power > 0 ? typeMultiplier(move.type, speciesOf(defender).types) : 1;
  const utility = move.power === 0 ? (move.effect?.healRatio ? 42 : 12) : move.power;
  return utility * stab * effectiveness * (move.accuracy / 100);
}

function chooseMove(side, opposingSide) {
  const moves = usableMoves(side.active.mon);
  if (!moves.length) return "comizio";
  return [...moves].sort((a, b) =>
    moveScore(side.active.mon, opposingSide.active.mon, b) - moveScore(side.active.mon, opposingSide.active.mon, a)
  )[0].id;
}

function nextAlive(side) {
  return side.party.findIndex((mon, index) => index !== side.activeIdx && mon.hp > 0);
}

function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))];
}

function runOnce(scenario, seed) {
  const trainer = TRAINERS[scenario.trainerId];
  const sim = makeDuelSim(makeTeam(scenario.player), makeTeam(trainer.team, true));
  const rng = rngFor(seed);
  let turns = 0;
  let healsLeft = scenario.heals;
  let consumables = 0;
  let playerDamage = 0;
  let enemyDamage = 0;
  let winner = null;

  while (turns < MAX_TURNS && aliveCount(sim.host) && aliveCount(sim.guest)) {
    if (sim.host.active.mon.hp <= 0) applySwitch(sim, "host", nextAlive(sim.host), []);
    if (sim.guest.active.mon.hp <= 0) applySwitch(sim, "guest", nextAlive(sim.guest), []);
    if (sim.host.active.mon.hp <= 0 || sim.guest.active.mon.hp <= 0) break;

    turns += 1;
    const maxHp = statsOf(sim.host.active.mon).hp;
    const shouldHeal = healsLeft > 0 && sim.host.active.mon.hp / maxHp <= 0.28;
    if (shouldHeal) {
      sim.host.active.mon.hp = Math.min(maxHp, sim.host.active.mon.hp + Math.floor(maxHp * 0.6));
      healsLeft -= 1;
      consumables += 1;
    }
    const hostCmd = shouldHeal
      ? { kind: "switch", index: sim.host.activeIdx }
      : { kind: "move", moveId: chooseMove(sim.host, sim.guest) };
    const guestCmd = { kind: "move", moveId: chooseMove(sim.guest, sim.host) };
    const beforeHost = sim.host.active.mon.hp;
    const beforeGuest = sim.guest.active.mon.hp;
    const events = resolveTurn(sim, hostCmd, guestCmd, rng);
    playerDamage += Math.max(0, beforeGuest - sim.guest.active.mon.hp);
    enemyDamage += Math.max(0, beforeHost - sim.host.active.mon.hp);
    const end = events.find((event) => event.e === "end");
    if (end) winner = end.winner;
  }
  if (!winner) {
    winner = aliveCount(sim.host) && !aliveCount(sim.guest) ? "host" : !aliveCount(sim.host) && aliveCount(sim.guest) ? "guest" : null;
  }
  return {
    won: winner === "host", turns, consumables, playerDamage, enemyDamage,
    playerKOs: scenario.player.length - aliveCount(sim.host),
    enemyKOs: TRAINERS[scenario.trainerId].team.length - aliveCount(sim.guest),
    stalled: winner === null
  };
}

function round(value, digits = 1) { return Number(value.toFixed(digits)); }
function avg(rows, key) { return rows.reduce((sum, row) => sum + row[key], 0) / rows.length; }

function summarize(scenario, index) {
  const rows = Array.from({ length: RUNS }, (_, run) => runOnce(scenario, 0x51f15e + index * 10000 + run));
  const winRate = rows.filter((row) => row.won).length / RUNS;
  const avgTurns = avg(rows, "turns");
  const flags = [];
  if (winRate < scenario.target[0]) flags.push("troppo difficile");
  if (winRate > scenario.target[1]) flags.push("troppo facile");
  if (avgTurns < scenario.turns[0]) flags.push("troppo breve");
  if (avgTurns > scenario.turns[1]) flags.push("troppo lunga");
  if (rows.some((row) => row.stalled)) flags.push("stallo");
  return {
    id: scenario.id, trainerId: scenario.trainerId, trainer: TRAINERS[scenario.trainerId].name,
    playerLevels: scenario.player.map(([, level]) => level), enemyLevels: TRAINERS[scenario.trainerId].team.map(([, level]) => level),
    targetWinRate: scenario.target, targetAvgTurns: scenario.turns,
    winRate: round(winRate * 100), avgTurns: round(avgTurns), p50Turns: percentile(rows.map((r) => r.turns), 0.5),
    p90Turns: percentile(rows.map((r) => r.turns), 0.9), avgPlayerKOs: round(avg(rows, "playerKOs")),
    avgEnemyKOs: round(avg(rows, "enemyKOs")), avgConsumables: round(avg(rows, "consumables")),
    avgDamageDealt: round(avg(rows, "playerDamage")), avgDamageTaken: round(avg(rows, "enemyDamage")),
    stalledRuns: rows.filter((row) => row.stalled).length, status: flags.length ? "OUT_OF_RANGE" : "OK", flags
  };
}

function scenarioForProfile(scenario, profile) {
  let player = scenario.player.map(([speciesId, level, moves, heldItem]) => [
    speciesId,
    Math.max(1, level + (profile.levelDelta ?? 0)),
    moves,
    heldItem
  ]);
  if (profile.rotate) {
    const shift = profile.rotate % player.length;
    player = [...player.slice(shift), ...player.slice(0, shift)];
  }
  if (profile.reverse) player.reverse();
  return {
    ...scenario,
    player,
    heals: Math.max(0, scenario.heals + (profile.healDelta ?? 0))
  };
}

function runJourney(profile, profileIndex) {
  const checkpoints = [];
  let defeats = 0;
  let totalTurns = 0;
  let totalConsumables = 0;
  for (let scenarioIndex = 0; scenarioIndex < SCENARIOS.length; scenarioIndex += 1) {
    const scenario = scenarioForProfile(SCENARIOS[scenarioIndex], profile);
    let result = null;
    let attempts = 0;
    while (attempts < MAX_JOURNEY_ATTEMPTS && !result?.won) {
      attempts += 1;
      const seed = 0x7a11ce + profileIndex * 100_000 + scenarioIndex * 1_000 + attempts;
      result = runOnce(scenario, seed);
      totalTurns += result.turns;
      totalConsumables += result.consumables;
      if (!result.won) defeats += 1;
    }
    checkpoints.push({
      id: scenario.id,
      won: Boolean(result?.won),
      attempts,
      turnsLastAttempt: result?.turns ?? 0,
      playerKOsLastAttempt: result?.playerKOs ?? scenario.player.length
    });
    if (!result?.won) break;
  }
  return {
    id: profile.id,
    complete: checkpoints.length === SCENARIOS.length && checkpoints.every((checkpoint) => checkpoint.won),
    checkpointsCompleted: checkpoints.filter((checkpoint) => checkpoint.won).length,
    attempts: checkpoints.reduce((sum, checkpoint) => sum + checkpoint.attempts, 0),
    defeats,
    totalTurns,
    totalConsumables,
    checkpoints
  };
}

function markdown(report) {
  const lines = [
    "# Baseline campagna automatizzata", "",
    `Simulazioni deterministiche: **${report.runsPerScenario} per checkpoint**. Seed schema: \`${report.seedSchema}\`.`, "",
    "| Checkpoint | Avversario | Win | Turni avg (p90) | KO giocatore | Cure | Esito |", "|---|---|---:|---:|---:|---:|---|"
  ];
  for (const row of report.scenarios) {
    lines.push(`| ${row.id} | ${row.trainer} | ${row.winRate}% | ${row.avgTurns} (${row.p90Turns}) | ${row.avgPlayerKOs} | ${row.avgConsumables} | ${row.status}${row.flags.length ? `: ${row.flags.join(", ")}` : ""} |`);
  }
  lines.push("", "## Matrice di 10 campagne complete", "",
    `Ogni profilo attraversa i ${SCENARIOS.length} checkpoint in ordine e può riprovare un boss fino a ${MAX_JOURNEY_ATTEMPTS} volte dopo il recupero della squadra.`, "",
    "| Profilo | Checkpoint | Tentativi | Sconfitte | Turni | Cure | Esito |", "|---|---:|---:|---:|---:|---:|---|");
  for (const journey of report.journeys) {
    lines.push(`| ${journey.id} | ${journey.checkpointsCompleted}/${SCENARIOS.length} | ${journey.attempts} | ${journey.defeats} | ${journey.totalTurns} | ${journey.totalConsumables} | ${journey.complete ? "COMPLETA" : "INCOMPLETA"} |`);
  }
  lines.push("", "## Limiti del modello", "", ...report.limitations.map((item) => `- ${item}`), "",
    "Le anomalie sono diagnostiche: lo script non modifica livelli, statistiche o mosse.", "");
  return lines.join("\n");
}

const scenarios = SCENARIOS.map(summarize);
const journeys = JOURNEY_PROFILES.map(runJourney);
const report = {
  schemaVersion: 2, runsPerScenario: RUNS, maxTurns: MAX_TURNS, seedSchema: "0x51f15e + scenario*10000 + run",
  model: "duelsim-v2-type-aware-greedy", profile: "prepared-party-with-consumables",
  limitations: [
    "Usa calcDamage e resolveTurn reali, ma non l'intera BattleScene.",
    "SONDAGGI e IA contestuale PVE non sono simulati.",
    "Gli hold item influenzano calcDamage; gli effetti hold di fine turno non sono simulati.",
    "Il giocatore usa fino al budget indicato di SPRITZ al 28% PV; ogni cura consuma il turno.",
    "Entrambi i lati scelgono per potenza, STAB, efficacia dei tipi e precisione; non pianificano switch o setup.",
    "I boss sono simulati isolati e a squadra integra: il modello non riproduce l'attrito di route e gauntlet.",
    "Le squadre checkpoint sono fixture plausibili, non telemetria di una partita umana.",
    `Le campagne fixture consentono fino a ${MAX_JOURNEY_ATTEMPTS} tentativi per boss e ripartono a squadra integra dopo una sconfitta.`,
    "Questo profilo misura la sicurezza anti-grind di un party preparato; balance:bosses copre separatamente il primo tentativo senza consumabili."
  ],
  scenarios,
  journeys
};
const jsonPath = resolve(ROOT, "artifacts/reports/campaign-playtest.json");
const mdPath = resolve(ROOT, "docs/baseline-campaign-auto.md");
await mkdir(dirname(jsonPath), { recursive: true });
await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(mdPath, markdown(report));
console.log(`Campaign playtest: ${scenarios.filter((s) => s.status === "OK").length}/${scenarios.length} checkpoint nei range.`);
for (const row of scenarios.filter((s) => s.status !== "OK")) console.log(`- ${row.id}: ${row.flags.join(", ")} (win ${row.winRate}%, turni ${row.avgTurns})`);
console.log(`Journey matrix: ${journeys.filter((journey) => journey.complete).length}/${journeys.length} campagne fixture complete.`);
for (const journey of journeys.filter((row) => !row.complete)) console.log(`- ${journey.id}: ${journey.checkpointsCompleted}/${SCENARIOS.length} checkpoint completati`);
console.log(mdPath);
if (journeys.some((journey) => !journey.complete)) process.exitCode = 1;
