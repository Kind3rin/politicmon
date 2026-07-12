const STEPS = 1_000;
const MIN_FREE_STEPS = 8;
const bands = [
  ["TUTORIAL", 0.10],
  ["PERCORSI", 0.14],
  ["GROTTE", 0.16],
  ["CITTA MID", 0.18],
  ["CITTA LATE", 0.20]
];

function rng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function simulate(rate, seed) {
  const random = rng(seed);
  let cooldown = 0;
  const interruptions = [];
  for (let step = 1; step <= STEPS; step += 1) {
    const blocked = cooldown > 0;
    if (blocked) cooldown -= 1;
    if (!blocked && random() < rate) {
      interruptions.push(step);
      cooldown = MIN_FREE_STEPS;
    }
  }
  const gaps = interruptions.slice(1).map((step, i) => step - interruptions[i] - 1);
  return {
    interruptions: interruptions.length,
    minimumFreeGap: gaps.length ? Math.min(...gaps) : STEPS
  };
}

let failed = false;
console.log(`RITMO ESPLORAZIONE — ${STEPS} PASSI, TREGUA ${MIN_FREE_STEPS}`);
for (const [label, rate] of bands) {
  const runs = Array.from({ length: 100 }, (_, seed) => simulate(rate, seed + 1));
  const average = runs.reduce((sum, run) => sum + run.interruptions, 0) / runs.length;
  const worstGap = Math.min(...runs.map((run) => run.minimumFreeGap));
  console.log(`${label.padEnd(12)} ${average.toFixed(1).padStart(5)} incontri/1000 | gap minimo ${worstGap}`);
  if (worstGap < MIN_FREE_STEPS) failed = true;
}

console.log("SFIDE VAGANTI: 0 interruzioni automatiche (NPC visibile, avvio con A)");
if (failed) {
  console.error("FAIL: sequenza con meno di 8 passi liberi.");
  process.exit(1);
}
