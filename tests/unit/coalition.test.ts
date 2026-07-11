import { test } from "node:test";
import assert from "node:assert/strict";
import { addAlly, coalitionBonuses, coalitionId, newCoalitionState, normalizeCoalitionState, removeAlly, violatedLines } from "../../src/game/coalition.ts";

test("coalition: massimo tre slot e duplicati impossibili", () => {
  let state = newCoalitionState();
  for (const id of ["campo_secretary", "quantum_centrist", "civic_mayor"] as const) {
    const result = addAlly(state, id);
    assert.equal(result.ok, true);
    if (result.ok) state = result.state;
  }
  assert.equal(addAlly(state, "generorso").ok, false);
  const duplicate = addAlly(state, "campo_secretary");
  assert.equal(duplicate.ok, false);
  if (!duplicate.ok) assert.equal(duplicate.error, "duplicate");
});

test("coalition: rimozione compatta senza mutare input", () => {
  const first = addAlly(newCoalitionState(), "campo_secretary");
  assert.equal(first.ok, true);
  if (!first.ok) return;
  const second = addAlly(first.state, "quantum_centrist");
  assert.equal(second.ok, true);
  if (!second.ok) return;
  const removed = removeAlly(second.state, "campo_secretary");
  assert.equal(removed.ok, true);
  if (removed.ok) assert.deepEqual(removed.state.members.map((m) => m.allyId), ["quantum_centrist"]);
  assert.equal(second.state.members.length, 2);
});

test("coalition: linee rosse deterministiche e catalog-driven", () => {
  const one = addAlly(newCoalitionState(), "campo_secretary");
  assert.equal(one.ok, true);
  if (!one.ok) return;
  const two = addAlly(one.state, "quantum_centrist");
  assert.equal(two.ok, true);
  if (!two.ok) return;
  assert.deepEqual(violatedLines(two.state, 10), ["campo_secretary"]);
  assert.deepEqual(violatedLines(two.state, 11), ["quantum_centrist"]);
  assert.deepEqual(violatedLines(two.state, 999), []);
});

test("coalition: assetto, bucket separati e KO sospende solo bonus", () => {
  const one = addAlly(newCoalitionState(), "campo_secretary");
  assert.equal(one.ok, true);
  if (!one.ok) return;
  assert.equal(coalitionId(one.state), "campo_largo");
  const active = coalitionBonuses(one.state);
  assert.equal(active.bonus.territoryGain, 15);
  assert.equal(active.malus.funds, -9);
  const ko = coalitionBonuses(one.state, ["campo_secretary"]);
  assert.equal(ko.bonus.territoryGain, 5);
  assert.equal(ko.malus.funds, -9);
});

test("coalition: normalizzazione save scarta ignoti/duplicati e clampa ledger", () => {
  const state = normalizeCoalitionState({
    members: [
      { allyId: "campo_secretary", status: "strained", violationCount: 999 },
      { allyId: "campo_secretary" },
      { allyId: "intruso" },
      { allyId: "generorso", status: "nonsense" }
    ],
    locked: true,
    pendingConsequences: ["a", "a", 3],
    processedConsequences: ["done"]
  });
  assert.deepEqual(state.members.map((m) => m.allyId), ["campo_secretary", "generorso"]);
  assert.equal(state.members[0].violationCount, 99);
  assert.equal(state.members[1].status, "allied");
  assert.deepEqual(state.pendingConsequences, ["a"]);
  assert.equal(state.locked, true);
});
