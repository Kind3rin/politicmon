import assert from "node:assert/strict";
import test from "node:test";
import { moveCompanion, placeLabel } from "../../src/game/partyOrder";

const squad = () => ["a", "b", "c", "d", "e", "f"];

test("a companion moved to a place takes it and pushes the others along", () => {
  const party = squad();
  assert.equal(moveCompanion(party, 4, 1), true);
  assert.deepEqual(party, ["a", "e", "b", "c", "d", "f"]);
  assert.equal(moveCompanion(party, 1, 5), true);
  assert.deepEqual(party, ["a", "b", "c", "d", "f", "e"]);
});

test("moving to the lead place is the same rule", () => {
  const party = squad();
  moveCompanion(party, 3, 0);
  assert.deepEqual(party, ["d", "a", "b", "c", "e", "f"]);
});

test("nothing moves for the same place or a place outside the squad", () => {
  const party = squad();
  assert.equal(moveCompanion(party, 2, 2), false);
  assert.equal(moveCompanion(party, -1, 2), false);
  assert.equal(moveCompanion(party, 2, 6), false);
  assert.equal(moveCompanion(party, 1.5, 2), false);
  assert.equal(moveCompanion([], 0, 0), false);
  assert.deepEqual(party, squad());
});

test("no companion is lost or duplicated by any sequence of moves", () => {
  const party = squad();
  let seed = 11;
  const next = (n: number) => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
  for (let i = 0; i < 500; i += 1) moveCompanion(party, next(6), next(6));
  assert.deepEqual([...party].sort(), squad());
});

test("places are named from one", () => {
  assert.equal(placeLabel(0), "1º");
  assert.equal(placeLabel(5), "6º");
});

import { dropIndex } from "../../src/ui/kit/reorder";
test("a dragged row lands on the row its centre is over, clamped at both ends", () => {
  const rests = [0, 1, 2, 3].map(i => ({ top: i * 100, bottom: i * 100 + 90 }));
  assert.equal(dropIndex(-50, rests), 0);
  assert.equal(dropIndex(45, rests), 0);
  assert.equal(dropIndex(150, rests), 1);
  assert.equal(dropIndex(295, rests), 2);
  assert.equal(dropIndex(95, rests), 0, "the gap between rows belongs to the row above");
  assert.equal(dropIndex(999, rests), 3);
  assert.equal(dropIndex(10, []), 0);
});
