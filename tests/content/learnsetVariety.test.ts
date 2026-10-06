import assert from "node:assert/strict";
import test from "node:test";
import { MOVES } from "../../src/data/moves";
import { SPECIES } from "../../src/data/species";
import { MAPS } from "../../src/data/maps";
import { movesAtLevel } from "../../src/game/monster";

// The rule behind scripts/balance-learnsets.ts: a real choice of attacks at every checkpoint, so type matchups matter.
const CHECKPOINTS = [8, 14, 22, 32, 42];
const damaging = (id: string, level: number) => movesAtLevel(id, level).map(slot => MOVES[slot.id]).filter(move => move.power > 0);

test("every species has 3 damaging moves of 2 types where the player first meets it, and at each checkpoint", () => {
  const met = new Map<string, number>();
  for (const map of Object.values(MAPS) as any[]) for (const e of map.encounters ?? []) met.set(e.speciesId, Math.min(met.get(e.speciesId) ?? 99, e.maxLv));
  const thin: string[] = [];
  for (const id of Object.keys(SPECIES)) {
    for (const level of [...(met.has(id) ? [met.get(id)!] : []), ...CHECKPOINTS]) {
      const dmg = damaging(id, level);
      if (dmg.length < 3 || new Set(dmg.map(move => move.type)).size < 2) thin.push(`${id}@${level}`);
    }
  }
  assert.deepEqual(thin, []);
});

test("a learnset never holds the same move twice and only knows moves that exist", () => {
  for (const [id, species] of Object.entries(SPECIES)) {
    const ids = species.learnset.map(([, move]) => move);
    assert.equal(new Set(ids).size, ids.length, `${id} learns a move twice`);
    for (const move of ids) assert.ok(MOVES[move], `${id} learns the unknown move ${move}`);
    assert.deepEqual(species.learnset.map(([level]) => level), [...species.learnset.map(([level]) => level)].sort((a, b) => a - b), `${id} learnset is in level order`);
  }
});
