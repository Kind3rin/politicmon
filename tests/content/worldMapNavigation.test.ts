import assert from "node:assert/strict";
import test from "node:test";
import { worldMapPageFor } from "../../src/scenes/WorldMapScene";

test("cartina: apre la tavola coerente con la posizione corrente", () => {
  assert.equal(worldMapPageFor("capitale"), "italietta");
  assert.equal(worldMapPageFor("offshore"), "rotte");
  assert.equal(worldMapPageFor("bruxelles"), "rotte");
  assert.equal(worldMapPageFor("campo_largo"), "atto3");
  assert.equal(worldMapPageFor("palazzo_feed_studio"), "atto3");
});

test("cartina: gli interni ereditano la tavola della loro area", () => {
  assert.equal(worldMapPageFor("commissione"), "rotte");
  assert.equal(worldMapPageFor("bar-offshore"), "rotte");
  assert.equal(worldMapPageFor("futuro_sede"), "atto3");
  assert.equal(worldMapPageFor("diplomacy_terrace"), "atto3");
});
