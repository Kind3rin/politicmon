/** Learnset pass: every species keeps a real choice of attacks as it grows.
 *
 * Rule (also enforced by tests/content/learnsetVariety.test.ts):
 *   at each checkpoint level a species' moveset, picked the way the game picks it (`movesAtLevel`),
 *   holds at least 3 damaging moves of at least 2 different types.
 * A missing move is added to the learnset one level below the checkpoint, from the common move pool,
 * preferring a type that sits next to the species' own in the satire (so Salvinott gets a tweet, not a compost heap)
 * and that hits what its own type hits badly. Nothing already in a learnset is removed or moved.
 *
 *   npx tsx scripts/balance-learnsets.ts          # print the plan
 *   npx tsx scripts/balance-learnsets.ts --write  # patch src/data/roster.json
 */
import { readFileSync, writeFileSync } from "node:fs";
import { MOVES } from "../src/data/moves";
import { SPECIES } from "../src/data/species";
import { MAPS } from "../src/data/maps";
import { typeMultiplier, TYPE_ORDER, type PolType } from "../src/data/poltypes";
import { movesAtLevel } from "../src/game/monster";

const CHECKPOINTS = [8, 14, 22, 32, 42];
const NEIGHBOURS: Record<PolType, PolType[]> = {
  POPULISMO: ["MEDIA", "DESTRA"], DESTRA: ["POPULISMO", "ISTITUZIONE"], SINISTRA: ["VERDE", "POPULISMO"], VERDE: ["SINISTRA", "CENTRO"],
  CENTRO: ["ISTITUZIONE", "TECNO"], ISTITUZIONE: ["CENTRO", "DESTRA"], TECNO: ["MEDIA", "CENTRO"], MEDIA: ["POPULISMO", "TECNO"]
};

// First level a species is met in the wild: that is where a thin moveset hurts most.
const met = new Map<string, number>();
for (const map of Object.values(MAPS) as any[]) for (const e of map.encounters ?? []) met.set(e.speciesId, Math.min(met.get(e.speciesId) ?? 99, e.maxLv));

// Common pool: damaging, accurate, no recoil, and learned by at least two species (never a signature move).
const learners = new Map<string, number>();
for (const sp of Object.values(SPECIES) as any[]) for (const [, id] of sp.learnset) learners.set(id, (learners.get(id) ?? 0) + 1);
const pool = Object.values(MOVES).filter((m: any) => m.power > 0 && m.accuracy >= 90 && !m.effect?.recoilRatio && (learners.get(m.id) ?? 0) >= 2) as any[];

const capFor = (level: number) => level < 10 ? 56 : level < 18 ? 65 : level < 28 ? 80 : 100;
const reach = (type: PolType) => new Set(TYPE_ORDER.filter(d => typeMultiplier(type, [d]) > 1));

function damaging(speciesId: string, level: number) {
  return movesAtLevel(speciesId, level).map(slot => MOVES[slot.id]).filter(m => m.power > 0);
}
const ok = (speciesId: string, level: number) => {
  const dmg = damaging(speciesId, level);
  return dmg.length >= 3 && new Set(dmg.map(m => m.type)).size >= 2;
};

const roster = JSON.parse(readFileSync("src/data/roster.json", "utf8"));
const plan: string[] = [];
let added = 0;
const usage = new Map<string, number>();
for (const entry of roster.species) {
  const sp = (SPECIES as any)[entry.id];
  const checkpoints = [...new Set([...(met.has(entry.id) ? [met.get(entry.id)!] : []), ...CHECKPOINTS])].sort((a, b) => a - b);
  for (const level of checkpoints) {
    for (let guard = 0; guard < 3 && !ok(entry.id, level); guard += 1) {
      const have = damaging(entry.id, level);
      const haveTypes = new Set(have.map(m => m.type));
      const known = new Set(sp.learnset.map(([, id]: [number, string]) => id));
      const covered = new Set<PolType>();
      for (const type of haveTypes) for (const d of reach(type as PolType)) covered.add(d);
      const mine = (sp.types as PolType[]);
      const cap = capFor(level);
      // Theme first (a type next to the species' own), then reach, then the species' own type once it has two, then spread the pool.
      const score = (m: any) => {
        const t = m.type as PolType;
        return [...reach(t)].filter(d => !covered.has(d)).length * 1.5 + (mine.some(own => NEIGHBOURS[own].includes(t)) ? 6 : 0)
          + (mine.includes(t) && haveTypes.size >= 2 ? 5 : 0) + m.power / 40 - (usage.get(m.id) ?? 0) * 1.3;
      };
      const options = pool.filter(m => m.power <= cap && !known.has(m.id) && (haveTypes.size >= 2 || !haveTypes.has(m.type))).sort((a, b) => score(b) - score(a));
      const pick = options[0];
      if (!pick) break;
      const at = Math.max(2, level - 1);
      sp.learnset.push([at, pick.id]); sp.learnset.sort((a: [number, string], b: [number, string]) => a[0] - b[0]);
      entry.learnset = sp.learnset; usage.set(pick.id, (usage.get(pick.id) ?? 0) + 1);
      plan.push(`${entry.id.padEnd(12)} checkpoint ${String(level).padStart(2)}: + ${pick.id} (${pick.type} ${pick.power}) at ${at}`);
      added += 1;
    }
  }
}
console.log(plan.join("\n"));
console.log(`${added} moves added across ${new Set(plan.map(l => l.split(" ")[0])).size} species`);
if (process.argv.includes("--write")) {
  writeFileSync("src/data/roster.json", JSON.stringify(roster, null, 2) + "\n");
  console.log("src/data/roster.json updated");
}
