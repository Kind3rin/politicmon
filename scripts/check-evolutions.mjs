import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tsImport } from "tsx/esm/api";

const root = process.cwd();
// Validate the actual exported registries, independent of source formatting.
const [{SPECIES},{MOVES},{MONSTERS_WITH_PNG:pngIds}] = await Promise.all([
  tsImport("../src/data/species.ts", import.meta.url),
  tsImport("../src/data/moves.ts", import.meta.url),
  tsImport("../src/art/monsters.ts", import.meta.url)
]);
const battleText = readFileSync(join(root, "src", "game", "battle", "BattleScene.ts"), "utf8");

const problems = [];

const speciesIds = new Set(Object.keys(SPECIES));
const moveIds = new Set(Object.keys(MOVES));

let levelEvolutionRules = 0;
let itemEvolutionRules = 0;
const evolvedTargets = new Set();

for (const [id,species] of Object.entries(SPECIES)) {
  for (const [,move] of species.learnset) {
    if (!moveIds.has(move)) problems.push(`${id}: learnset references missing move '${move}'`);
  }
  for (const rule of species.evolutions ?? []) {
    const target = rule.id;
    if (!target) {
      problems.push(`${id}: evolution rule without target id`);
      continue;
    }
    evolvedTargets.add(target);
    if (!speciesIds.has(target)) {
      problems.push(`${id}: evolves to missing species '${target}'`);
    }
    const pngExists = pngIds.has(target) && existsSync(join(root, "public", "sprites", "monsters", `${target}.png`));
    if (!pngExists) problems.push(`${id}: evolution target '${target}' is missing its registered PNG`);
    if (pngIds.has(target) && !pngExists) {
      problems.push(`${id}: evolution target '${target}' is in MONSTERS_WITH_PNG but PNG is missing`);
    }
    if (typeof rule.level === "number") {
      levelEvolutionRules += 1;
    }
    if (typeof rule.item === "string") {
      itemEvolutionRules += 1;
    }
  }
}

for (const id of speciesIds) {
  if (!pngIds.has(id)) problems.push(`Species ${id} has no PNG registry entry`);
}

for (const id of pngIds) {
  if (!speciesIds.has(id)) {
    problems.push(`MONSTERS_WITH_PNG references missing species '${id}'`);
  }
  if (!existsSync(join(root, "public", "sprites", "monsters", `${id}.png`))) {
    problems.push(`MONSTERS_WITH_PNG references missing PNG '${id}.png'`);
  }
}

if (!battleText.includes("levelEvolution(") || !battleText.includes("evolveStepsFor(")) {
  problems.push("BattleScene does not route level-up/retroactive evolution checks through levelEvolution/evolveStepsFor");
}

if (levelEvolutionRules < 10) {
  problems.push(`Only ${levelEvolutionRules} level evolution rules found; expected at least 10`);
}

if (problems.length > 0) {
  console.log(`TROVATI ${problems.length} problemi evoluzioni:`);
  for (const problem of problems) {
    console.log(`  ${problem}`);
  }
  process.exitCode = 1;
} else {
  console.log(
    `OK - evoluzioni: ${speciesIds.size} species, ${levelEvolutionRules} level rules, ${itemEvolutionRules} item rules, ${evolvedTargets.size} targets validi.`
  );
}
