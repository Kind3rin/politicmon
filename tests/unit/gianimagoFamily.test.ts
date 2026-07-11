import assert from "node:assert/strict";
import test from "node:test";
import { MOVES } from "../../src/data/moves.ts";
import { SPECIES } from "../../src/data/species.ts";
import { createMonster, levelEvolution, statsOf } from "../../src/game/monster.ts";
import { calcDamage, dynamicMovePower, makeCombatant } from "../../src/game/battle/sim.ts";

test("GIANIMAGO: curve approvate ed evoluzione al livello 32", () => {
  const base = SPECIES.gianimago;
  const evolved = SPECIES.quasimagiani;
  const bst = (stats: typeof base.base) => Object.values(stats).reduce((sum, value) => sum + value, 0);
  assert.equal(bst(base.base), 304);
  assert.equal(bst(evolved.base), 395);
  assert.equal(evolved.base.spc, 112);
  assert.deepEqual(evolved.types, ["MEDIA", "TECNO"]);
  assert.equal(evolved.ability, "forchettasondaggi");
  assert.equal(levelEvolution(createMonster("gianimago", 32), 50), "quasimagiani");
});

test("EXIT POLL: 60 sotto metà PV, 100 dal 50% esatto", () => {
  const mon = createMonster("gianimago", 35);
  const attacker = makeCombatant(mon);
  const maxHp = statsOf(mon).hp;
  mon.hp = Math.ceil(maxHp / 2) - 1;
  assert.ok(mon.hp * 2 < maxHp);
  assert.equal(dynamicMovePower(attacker, MOVES.exit_poll), 60);
  mon.hp = Math.ceil(maxHp / 2);
  assert.ok(mon.hp * 2 >= maxHp);
  assert.equal(dynamicMovePower(attacker, MOVES.exit_poll), 100);
});

test("FORCHETTA SONDAGGI: sostituisce il roll standard con stima bassa o alta", () => {
  const defender = makeCombatant(createMonster("generorso", 35));
  const lowAttacker = makeCombatant(createMonster("quasimagiani", 35));
  const lowRolls = [1, 0]; // niente critico, forchetta bassa
  const low = calcDamage(lowAttacker, defender, MOVES.editoriale, () => lowRolls.shift() ?? 0);

  const highDefender = makeCombatant(createMonster("generorso", 35));
  const highAttacker = makeCombatant(createMonster("quasimagiani", 35));
  const highRolls = [1, 1]; // niente critico, forchetta alta
  const high = calcDamage(highAttacker, highDefender, MOVES.editoriale, () => highRolls.shift() ?? 1);

  assert.equal(low.pollEstimate, "low");
  assert.equal(high.pollEstimate, "high");
  assert.ok(high.damage > low.damage);
});
