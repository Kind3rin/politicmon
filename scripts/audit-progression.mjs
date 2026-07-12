import { ITEMS } from "../src/data/items.ts";
import { SPECIES } from "../src/data/species.ts";
import { catchChance } from "../src/game/battle/sim.ts";
import { createMonster, expForLevel, expYield, LEVEL_CAP } from "../src/game/monster.ts";

const species = Object.values(SPECIES);
const yields = species.map((entry) => entry.expYield).sort((a, b) => a - b);
const medianYield = yields[Math.floor(yields.length / 2)];
const representative = species.reduce((best, entry) =>
  Math.abs(entry.expYield - medianYield) < Math.abs(best.expYield - medianYield) ? entry : best
);

let failed = false;
const fail = (message) => { failed = true; console.error(`FAIL: ${message}`); };

console.log("PROGRESSIONE EXP");
let worstWild = 0;
let fastestTrainer = Number.POSITIVE_INFINITY;
for (let level = 5; level < LEVEL_CAP; level += 5) {
  const mon = createMonster(representative.id, level);
  const required = expForLevel(level + 1) - expForLevel(level);
  const wildKos = required / expYield(mon, false);
  const trainerKos = required / expYield(mon, true);
  worstWild = Math.max(worstWild, wildKos);
  fastestTrainer = Math.min(fastestTrainer, trainerKos);
  console.log(`LV ${String(level).padStart(2)} -> ${level + 1}: ${wildKos.toFixed(1)} KO wild | ${trainerKos.toFixed(1)} KO trainer`);
}
if (worstWild > 5) fail(`dead zone EXP: servono ${worstWild.toFixed(1)} KO per un livello`);
if (fastestTrainer < 0.5) fail(`power spike EXP: un KO concede oltre due livelli (${fastestTrainer.toFixed(1)})`);

console.log("\nCATTURA A 25% PV + STATUS");
const groups = [
  { name: "COMUNI", entries: species.filter((entry) => entry.catchRate >= 60), ball: "scheda", maxAttempts: 2 },
  { name: "RARI", entries: species.filter((entry) => entry.catchRate >= 15 && entry.catchRate < 60), ball: "scheda", maxAttempts: 3 },
  { name: "ULTRA RARI", entries: species.filter((entry) => entry.catchRate < 15), ball: "schedona", maxAttempts: 6 }
];
for (const group of groups) {
  let worst = { attempts: 0, name: "" };
  for (const entry of group.entries) {
    const mon = createMonster(entry.id, 30);
    mon.hp = Math.max(1, Math.floor(mon.hp * 0.25));
    mon.status = "scandalo";
    const attempts = 1 / catchChance(mon, group.ball);
    if (attempts > worst.attempts) worst = { attempts, name: entry.name };
  }
  console.log(`${group.name.padEnd(10)} ${group.entries.length} specie | peggiore ${worst.name}: ${worst.attempts.toFixed(1)} tentativi con ${ITEMS[group.ball].name}`);
  if (worst.attempts > group.maxAttempts) fail(`${group.name}: ${worst.attempts.toFixed(1)} tentativi > ${group.maxAttempts}`);
}

if (failed) process.exit(1);
console.log("\nOK: curva EXP senza dead zone e cattura entro i budget dichiarati.");
