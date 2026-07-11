import test from "node:test";
import assert from "node:assert/strict";
import { SPECIES } from "../../src/data/species.ts";
import { MOVES } from "../../src/data/moves.ts";
import { createMonster, levelEvolution } from "../../src/game/monster.ts";

test("SALISTROBO: curva approvata e ruolo cleaner fisico veloce", () => {
  const base = SPECIES.salistrobo;
  const evolved = SPECIES.salisound;
  assert.equal(Object.values(base.base).reduce((sum, value) => sum + value, 0), 304);
  assert.equal(Object.values(evolved.base).reduce((sum, value) => sum + value, 0), 392);
  assert.ok(evolved.base.atk > evolved.base.spc);
  assert.ok(evolved.base.spd < 100, "non supera la fascia fast legacy approvata");
  assert.deepEqual(evolved.types, ["SINISTRA", "MEDIA"]);
  assert.equal(evolved.ability, "opposizione");
});

test("SALISTROBO: evolve dal livello 32 solo con SONDAGGI almeno 55", () => {
  const mon = createMonster("salistrobo", 32);
  assert.equal(levelEvolution(mon, 54), undefined);
  assert.equal(levelEvolution(mon, 55), "salisound");
});

test("FESTIVAL: P4-T07 conserva il danno e aggiunge il proc condizionale", () => {
  const move = MOVES.festival;
  assert.equal(move.type, "SINISTRA");
  assert.equal(move.category, "fisico");
  assert.equal(move.power, 75);
  assert.equal(move.accuracy, 100);
  assert.deepEqual(move.effect?.statusIfFirst, { id: "scandalo", chance: 20, target: "foe" });
});
