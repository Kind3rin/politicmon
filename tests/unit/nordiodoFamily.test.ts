import assert from "node:assert/strict";
import test from "node:test";
import { MOVES } from "../../src/data/moves.ts";
import { SPECIES } from "../../src/data/species.ts";
import { createMonster, levelEvolution } from "../../src/game/monster.ts";

test("NORDIODO: curva controller approvata ed evoluzione al livello 32", () => {
  const base = SPECIES.nordiodo;
  const evolved = SPECIES.referendodo;
  const bst = (stats: typeof base.base) => Object.values(stats).reduce((sum, value) => sum + value, 0);
  assert.equal(bst(base.base), 304);
  assert.equal(bst(evolved.base), 390);
  assert.deepEqual(base.types, ["POPULISMO", "VERDE"]);
  assert.deepEqual(evolved.types, ["POPULISMO", "ISTITUZIONE"]);
  assert.equal(evolved.ability, "caimano");
  assert.equal(levelEvolution(createMonster("nordiodo", 32), 50), "referendodo");
});

test("AUTONOMIA: contratto status ISTITUZIONE con SPD nemica -2", () => {
  const move = MOVES.autonomia;
  assert.equal(move.type, "ISTITUZIONE");
  assert.equal(move.category, "status");
  assert.equal(move.power, 0);
  assert.equal(move.accuracy, 85);
  assert.equal(move.pp, 10);
  assert.deepEqual(move.effect?.stat, { key: "spd", stages: -2, target: "foe" });
});

test("REFERENDODO: evita la combinazione hard-control vietata", () => {
  const ids = SPECIES.referendodo.learnset.map(([, id]) => id);
  assert.equal(ids.includes("telepromessa"), false);
  assert.equal(ids.includes("covfefe"), false);
  assert.equal(ids.includes("autonomia"), true);
});
