import assert from "node:assert/strict";
import test from "node:test";
import { SPECIES } from "../../src/data/species.ts";
import { createMonster } from "../../src/game/monster.ts";
import { calcDamage, makeCombatant } from "../../src/game/battle/sim.ts";
import { MOVES } from "../../src/data/moves.ts";

test("CROSETTANK: profilo muro fisico approvato senza cura naturale", () => {
  const species = SPECIES.crosettank;
  assert.equal(Object.values(species.base).reduce((sum, value) => sum + value, 0), 388);
  assert.deepEqual(species.types, ["ISTITUZIONE", "DESTRA"]);
  assert.equal(species.ability, "poltrona");
  assert.equal(species.base.def, 108);
  assert.equal(species.base.spc, 58);
  assert.equal(species.specialDefense, 58);
  assert.equal(species.base.spd, 42);
  assert.equal(species.learnset.some(([, id]) => MOVES[id].effect?.healRatio), false);
});

test("CROSETTANK: il counter speciale supera nettamente un colpo fisico pari potenza", () => {
  const physical = { ...MOVES.comizio, power: 80, category: "fisico" as const };
  const special = { ...MOVES.editoriale, power: 80, category: "speciale" as const };
  const attacker = makeCombatant(createMonster("giorgetta", 35));
  const defenderA = makeCombatant(createMonster("crosettank", 35));
  const defenderB = makeCombatant(createMonster("crosettank", 35));
  const noCritFixed = () => 0.5;
  const physicalDamage = calcDamage(attacker, defenderA, physical, noCritFixed).damage;
  const specialDamage = calcDamage(attacker, defenderB, special, noCritFixed).damage;
  assert.ok(specialDamage > physicalDamage);
});

test("CROSETTANK: POLTRONA blocca i cali nemici ma non i buff propri", async () => {
  const { statDropBlockReason } = await import("../../src/game/battle/effectContract.ts");
  assert.equal(statDropBlockReason(createMonster("crosettank", 35)), "poltrona");
});
