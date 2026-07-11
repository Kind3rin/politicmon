import { test } from "node:test";
import assert from "node:assert/strict";
import { applyTerritoryGain, calculateElectionResult, createElectionSnapshot, endorsementDelta, newElectionState, normalizeElectionState, resolveAction, resolveElection, startElection } from "../../src/game/election.ts";
import { addAlly, newCoalitionState } from "../../src/game/coalition.ts";

test("election: crea cinque collegi canonici a consenso 38", () => {
  const state = newElectionState(true);
  assert.equal(state.phase, "tour");
  assert.deepEqual(state.districts.map((d) => d.id), ["nord", "centro", "sud", "isole", "feed"]);
  assert.ok(state.districts.every((d) => d.localConsensus === 38 && d.actionMask === 0));
});

test("election: solo i delta positivi ricevono modifier e clamp", () => {
  assert.equal(applyTerritoryGain(12, { bonusPercent: 20, malusPercent: 0 }), 14);
  assert.equal(applyTerritoryGain(12, { bonusPercent: 0, malusPercent: -20 }), 10);
  assert.equal(applyTerritoryGain(-4, { bonusPercent: 20, malusPercent: -20 }), -4);
});

test("election: terza azione e replay falliscono senza mutare stato", () => {
  const initial = newElectionState(true);
  const one = resolveAction(initial, { districtId: "nord", action: "debate", variant: "win", baseDelta: 8 });
  assert.equal(one.ok, true);
  if (!one.ok) return;
  const duplicate = resolveAction(one.state, { districtId: "nord", action: "debate", variant: "win", baseDelta: 8 });
  assert.equal(duplicate.ok, false);
  assert.deepEqual(duplicate.state, one.state);
  const two = resolveAction(one.state, { districtId: "nord", action: "promise", variant: "prudent", baseDelta: 4 });
  assert.equal(two.ok, true);
  if (!two.ok) return;
  assert.equal(two.state.districts[0].localConsensus, 50);
  const third = resolveAction(two.state, { districtId: "nord", action: "endorsement", variant: "ally", baseDelta: 6, allyId: "generorso" });
  assert.equal(third.ok, false);
  assert.deepEqual(third.state, two.state);
});

test("election: endorsement è consumato globalmente", () => {
  const first = resolveAction(newElectionState(true), { districtId: "nord", action: "endorsement", variant: "ally", baseDelta: 6, allyId: "generorso" });
  assert.equal(first.ok, true);
  if (!first.ok) return;
  const second = resolveAction(first.state, { districtId: "centro", action: "endorsement", variant: "ally", baseDelta: -3, allyId: "generorso" });
  assert.equal(second.ok, false);
  if (!second.ok) assert.equal(second.error, "ally_already_used");
  assert.equal(endorsementDelta("nord", "destra"), 6);
  assert.equal(endorsementDelta("centro", "destra"), -3);
  assert.equal(endorsementDelta("feed", "campo"), 3);
});

test("election: RICONTO applica un solo +1/-1 ai pari", () => {
  const base = newElectionState(true);
  const districts = base.districts.map((d, i) => ({ ...d, localConsensus: [50, 51, 49, 50, 80][i] }));
  const win = calculateElectionResult(districts, true);
  assert.equal(win.seats, 4);
  assert.equal(win.ending, "government");
  assert.deepEqual(win.districts.map((d) => d.afterRecount), [51, 51, 49, 51, 80]);
  const loss = calculateElectionResult(districts, false);
  assert.equal(loss.seats, 2);
  assert.equal(loss.ending, "opposition");
  assert.deepEqual(loss.districts.map((d) => d.afterRecount), [49, 51, 49, 49, 80]);
});

test("election: normalizzazione è idempotente e conserva ignoti opachi", () => {
  const raw = { phase: "ready", districts: [{ id: "nord", localConsensus: 999, actionMask: 7, outcomes: [] }, { id: "moon", payload: 3 }] };
  const once = normalizeElectionState(raw);
  const twice = normalizeElectionState(once);
  assert.deepEqual(twice, once);
  assert.equal(once.phase, "tour");
  assert.equal(once.districts[0].localConsensus, 100);
  assert.equal(once.districts[0].actionMask, 3);
  assert.equal(once.extensions.unknownDistricts.length, 1);
});

test("P5-T07: lock e risoluzione sono one-shot e legati al runId", () => {
  const ready = { ...newElectionState(true), phase: "ready" as const,
    districts: newElectionState(true).districts.map((district) => ({ ...district, actionMask: 3 })) };
  const started = startElection(ready, "run-election-night");
  assert.equal(started.ok, true);
  if (!started.ok) return;
  assert.equal(started.state.phase, "locked");
  assert.equal(resolveElection(started.state, "run-estranea", true).ok, false);
  const resolved = resolveElection(started.state, "run-election-night", false);
  assert.equal(resolved.ok, true);
  if (!resolved.ok) return;
  assert.equal(resolved.state.phase, "resolved");
  assert.equal(resolved.state.result?.bossWon, false);
  assert.deepEqual(resolveElection(resolved.state, "run-election-night", true), { ok: true, state: resolved.state });
});

test("P5-T07: snapshot SHA-256 è canonico, separa coalizione ed elezione e congela SCISSIONE", async () => {
  const added = addAlly(newCoalitionState(), "campo_secretary");
  assert.equal(added.ok, true);
  if (!added.ok) return;
  const state = newElectionState(true);
  const flags = { "coalition-broken:generorso": true };
  const one = await createElectionSnapshot(state, added.state, 63, flags, "run-1");
  const two = await createElectionSnapshot(state, added.state, 63, flags, "run-1");
  assert.equal(one.electionSnapshotId, two.electionSnapshotId);
  assert.match(one.electionSnapshotId, /^[a-f0-9]{64}$/);
  assert.match(one.coalitionSnapshotId, /^[a-f0-9]{64}$/);
  assert.notEqual(one.electionSnapshotId, one.coalitionSnapshotId);
  assert.equal(one.doctrine, "scissione");
  assert.deepEqual(one.brokenDuringChapter, ["generorso"]);
});
