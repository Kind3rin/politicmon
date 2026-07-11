import assert from "node:assert/strict";
import test from "node:test";
import { MOVES } from "../../src/data/moves.ts";
import { SPECIES } from "../../src/data/species.ts";
import { createMonster, levelEvolution } from "../../src/game/monster.ts";
import { ATTO3_MAPS } from "../../src/data/maps/atto3.ts";
import { DEX_ZONES } from "../../src/data/dexzones.ts";

test("FRATOCORNO: curva support approvata ed evoluzione al livello 32", () => {
  const base = SPECIES.fratocorno;
  const evolved = SPECIES.campocorno;
  const bst = (stats: typeof base.base) => Object.values(stats).reduce((sum, value) => sum + value, 0);
  assert.equal(bst(base.base), 304);
  assert.equal(bst(evolved.base), 390);
  assert.deepEqual(base.types, ["SINISTRA", "ISTITUZIONE"]);
  assert.deepEqual(evolved.types, ["SINISTRA", "VERDE"]);
  assert.equal(base.ability, "poltrona");
  assert.equal(evolved.ability, "galleggiamento");
  assert.equal(levelEvolution(createMonster("fratocorno", 32), 50), "campocorno");
});

test("CAMPOCORNO: sustain limitato senza FIDUCIA o TAVOLO LUNGO", () => {
  const ids = SPECIES.campocorno.learnset.map(([, id]) => id);
  assert.equal(ids.includes("fiducia"), false);
  assert.equal(ids.includes("tavololungo"), false);
  assert.equal(ids.includes("aureola"), true);
  assert.equal(MOVES.aureola.pp, 5);
});

test("CAMPOCORNO: learnset finale conserva STAB SINISTRA e VERDE", () => {
  const types = new Set(SPECIES.campocorno.learnset.map(([, id]) => MOVES[id].type));
  assert.equal(types.has("SINISTRA"), true);
  assert.equal(types.has("VERDE"), true);
});

test("FRATOCORNO: è realmente catturabile e conta nella zona CAMPO LARGO", () => {
  const encounters = ATTO3_MAPS.campo_largo.encounters ?? [];
  assert.equal(encounters.some((entry) => entry.speciesId === "fratocorno"), true);
  assert.equal(encounters.reduce((sum, entry) => sum + entry.weight, 0), 100);
  const zone = DEX_ZONES.find((entry) => entry.id === "campo-largo");
  assert.equal(zone?.species.includes("fratocorno"), true);
});
