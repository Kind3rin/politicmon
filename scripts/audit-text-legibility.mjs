import { SPECIES } from "../src/data/species.ts";
import { MOVES, moveSummary } from "../src/data/moves.ts";
import { ACHIEVEMENTS } from "../src/game/achievements.ts";
import { MEME_EVENTS } from "../src/data/memeevents.ts";

const CHAR_W = 6;
const MIN_SCALE = 0.8;
const checks = [];

function add(surface, value, width) {
  const natural = String(value).length * CHAR_W;
  const scale = natural <= 0 ? 1 : Math.min(1, width / natural);
  checks.push({ surface, value: String(value), width, scale });
}

for (const species of Object.values(SPECIES)) {
  add("battle/species", species.name, 65); // box nemico con badge laterale
  add("party/category", `L55  ${species.category}`, 156);
}
for (const move of Object.values(MOVES)) {
  add("battle/move-row", move.name, 166); // marker efficacia presente
  add("battle/move-detail", move.name, 150);
  add("battle/move-summary", moveSummary(move), 162); // spazio a B: ESCI
  add("battle/learn-new", `NUOVA: ${move.name}`, 145); // spazio a B: ANNULLA
}
for (const achievement of ACHIEVEMENTS) add("achievements/title", achievement.name, 168);
for (const event of MEME_EVENTS) add("sources/title", `► ${event.title}`, 204);

const failures = checks.filter((entry) => entry.scale < MIN_SCALE);
const worst = [...checks].sort((a, b) => a.scale - b.scale).slice(0, 8);
console.log(`Text legibility: ${checks.length} casi, soglia ${(MIN_SCALE * 100).toFixed(0)}%`);
for (const entry of worst) {
  console.log(`- ${(entry.scale * 100).toFixed(1)}% ${entry.surface}: ${entry.value}`);
}
if (failures.length) {
  console.error(`\n${failures.length} testi sotto soglia: usare riga intera, wrap o card espansa.`);
  process.exit(1);
}
