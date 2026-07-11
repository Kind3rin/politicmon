import { test } from "node:test";
import assert from "node:assert/strict";
import { addAlly, newCoalitionState } from "../../src/game/coalition.ts";
import { newElectionState } from "../../src/game/election.ts";
import { resolvePhotoEvent } from "../../src/game/photoEvent.ts";

function coalition() {
  const one = addAlly(newCoalitionState(), "campo_secretary");
  assert.equal(one.ok, true);
  if (!one.ok) throw new Error();
  const two = addAlly(one.state, "quantum_centrist");
  assert.equal(two.ok, true);
  if (!two.ok) throw new Error();
  return two.state;
}

const seen = {
  "coalition-candidate-seen:campo_secretary": true,
  "coalition-candidate-seen:quantum_centrist": true,
  "coalition-candidate-seen:civic_mayor": true
};

test("photo event: STRINGETEVI applica +4 senza costi o linee rosse", () => {
  const result = resolvePhotoEvent({ choice: "stringetevi", coalition: coalition(), election: newElectionState(), money: 1000, flags: seen });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.patch.money, 1000);
  assert.equal(result.patch.election.districts.find((d) => d.id === "centro")?.localConsensus, 42);
  assert.deepEqual(result.patch.strained, []);
  assert.equal(result.patch.coalition.members[1].status, "allied");
});

test("photo event: PANORAMICA è atomica, costa 800 e tende la linea 13", () => {
  const before = coalition();
  const denied = resolvePhotoEvent({ choice: "panoramica", coalition: before, election: newElectionState(), money: 799, flags: seen });
  assert.deepEqual(denied, { ok: false, error: "insufficient_funds" });
  assert.equal(before.members[1].status, "allied");
  const result = resolvePhotoEvent({ choice: "panoramica", coalition: before, election: newElectionState(), money: 1000, flags: seen });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.patch.money, 200);
  assert.equal(result.patch.election.districts.find((d) => d.id === "centro")?.localConsensus, 50);
  assert.deepEqual(result.patch.strained, ["quantum_centrist"]);
  assert.equal(result.patch.coalition.members[1].status, "strained");
});

test("photo event: prerequisiti e idempotenza falliscono senza patch", () => {
  assert.deepEqual(resolvePhotoEvent({ choice: "stringetevi", coalition: coalition(), election: newElectionState(), money: 1000, flags: {} }), { ok: false, error: "candidates_unseen" });
  assert.deepEqual(resolvePhotoEvent({ choice: "stringetevi", coalition: coalition(), election: newElectionState(), money: 1000, flags: { ...seen, "atto3-photo-choice:stringetevi": true } }), { ok: false, error: "already_resolved" });
});
