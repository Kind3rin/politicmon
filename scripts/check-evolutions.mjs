import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const speciesText = readFileSync(join(root, "src", "data", "species.ts"), "utf8");
const movesText = readFileSync(join(root, "src", "data", "moves.ts"), "utf8");
const monstersText = readFileSync(join(root, "src", "art", "monsters.ts"), "utf8");
const battleText = readFileSync(join(root, "src", "game", "battle", "BattleScene.ts"), "utf8");

const problems = [];

function matches(text, regex) {
  return [...text.matchAll(regex)];
}

const speciesStarts = matches(speciesText, /^\s{2}([A-Za-z0-9_]+): S\(\{/gm);
const speciesIds = new Set(speciesStarts.map((m) => m[1]));
const moveIds = new Set(matches(movesText, /^\s{2}([A-Za-z0-9_]+): M\(\{/gm).map((m) => m[1]));

const artStart = monstersText.indexOf("export const MONSTER_ART");
const actionStart = monstersText.indexOf("export const MONSTER_ACTION_ART");
const artText = artStart >= 0 && actionStart > artStart ? monstersText.slice(artStart, actionStart) : "";
const artIds = new Set(matches(artText, /^\s{2}([A-Za-z0-9_]+): caricature\(\{/gm).map((m) => m[1]));

const pngSetStart = monstersText.indexOf("new Set<string>([");
const pngSetEnd = monstersText.indexOf("]);", pngSetStart);
const pngText = pngSetStart >= 0 && pngSetEnd > pngSetStart ? monstersText.slice(pngSetStart, pngSetEnd) : "";
const pngIds = new Set(matches(pngText, /"([^"]+)"/g).map((m) => m[1]));

let levelEvolutionRules = 0;
let itemEvolutionRules = 0;
const evolvedTargets = new Set();

for (let i = 0; i < speciesStarts.length; i += 1) {
  const id = speciesStarts[i][1];
  const start = speciesStarts[i].index;
  const end = i + 1 < speciesStarts.length ? speciesStarts[i + 1].index : speciesText.indexOf("};", start);
  const block = speciesText.slice(start, end);

  for (const move of matches(block, /\[\s*\d+\s*,\s*"([^"]+)"/g).map((m) => m[1])) {
    if (!moveIds.has(move)) {
      problems.push(`${id}: learnset references missing move '${move}'`);
    }
  }

  const evoMatch = block.match(/evolutions:\s*\[([\s\S]*?)\]/);
  if (!evoMatch) {
    continue;
  }
  for (const rule of matches(evoMatch[1], /\{([^}]+)\}/g).map((m) => m[1])) {
    const target = rule.match(/id:\s*"([^"]+)"/)?.[1];
    if (!target) {
      problems.push(`${id}: evolution rule without target id`);
      continue;
    }
    evolvedTargets.add(target);
    if (!speciesIds.has(target)) {
      problems.push(`${id}: evolves to missing species '${target}'`);
    }
    const pngExists = pngIds.has(target) && existsSync(join(root, "public", "sprites", "monsters", `${target}.png`));
    // PixelLab reboot: un PNG registrato e presente è una sorgente completa.
    // Il fallback testuale è obbligatorio solo finché la migrazione non esiste.
    if (!artIds.has(target) && !pngExists) {
      problems.push(`${id}: evolution target '${target}' has neither MONSTER_ART nor PixelLab PNG`);
    }
    if (pngIds.has(target) && !pngExists) {
      problems.push(`${id}: evolution target '${target}' is in MONSTERS_WITH_PNG but PNG is missing`);
    }
    if (/level:\s*\d+/.test(rule)) {
      levelEvolutionRules += 1;
    }
    if (/item:\s*"[^"]+"/.test(rule)) {
      itemEvolutionRules += 1;
    }
  }
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
