import { test } from "node:test";
import assert from "node:assert/strict";
import { addAlly, applyLineRedEvent, newCoalitionState } from "../../src/game/coalition.ts";
import { diplomacyRewardPatch, resolveDiplomacyChoice } from "../../src/game/diplomacyChapter.ts";

function coalition(...ids: Array<"campo_secretary" | "quantum_centrist" | "civic_mayor">) {
  let state = newCoalitionState();
  for (const id of ids) {
    const result = addAlly(state, id); if (!result.ok) throw new Error(result.error); state = result.state;
  }
  return state;
}

test("P5-T03: FEDELTÀ applica fondi, PASS e linea 12", () => {
  const result = resolveDiplomacyChoice({ choice: "loyalty", coalition: coalition("campo_secretary", "civic_mayor"), money: 100, sondaggi: 50, flags: {} });
  assert.equal(result.ok, true); if (!result.ok) return;
  assert.ok(result.patch.moneyDelta > 0);
  assert.equal(result.patch.flags["pass-vertice"], true);
  assert.deepEqual(result.patch.strained.sort(), ["campo_secretary", "civic_mayor"]);
});

test("P5-T03: AUTONOMIA con TESO paga e crea token esatto senza bonus", () => {
  const base = coalition("campo_secretary", "quantum_centrist");
  const strained = applyLineRedEvent(base, 10).state;
  const result = resolveDiplomacyChoice({ choice: "autonomy", coalition: strained, money: 700, sondaggi: 50, flags: {} });
  assert.equal(result.ok, true); if (!result.ok) return;
  assert.equal(result.patch.moneyDelta, -500);
  assert.equal(result.patch.money, 200);
  assert.equal(result.patch.repairTarget, "campo_secretary");
  assert.equal(result.patch.flags["reconcile-token:campo_secretary:v1"], true);
});

test("P5-T03: AUTONOMIA senza TESO dà solo fondi base modificati", () => {
  const result = resolveDiplomacyChoice({ choice: "autonomy", coalition: coalition("quantum_centrist"), money: 0, sondaggi: 50, flags: {} });
  assert.equal(result.ok, true); if (!result.ok) return;
  assert.ok(result.patch.moneyDelta > 0);
  assert.equal(result.patch.repairTarget, null);
});

test("P5-T03: CONSENSO dà +4, applica linea 13 e clampa", () => {
  const result = resolveDiplomacyChoice({ choice: "home", coalition: coalition("quantum_centrist"), money: 0, sondaggi: 98, flags: {} });
  assert.equal(result.ok, true); if (!result.ok) return;
  assert.equal(result.patch.sondaggi, 100);
  assert.deepEqual(result.patch.strained, ["quantum_centrist"]);
});

test("P5-T03: scelta e reward sono one-shot", () => {
  assert.deepEqual(resolveDiplomacyChoice({ choice: "home", coalition: coalition(), money: 0, sondaggi: 50, flags: { "diplomacy-choice-complete": true } }), { ok: false, error: "already_resolved" });
  assert.equal(diplomacyRewardPatch({})?.["tour-feed-unlocked"], true);
  assert.equal(diplomacyRewardPatch({ diplomacyComplete: true }), null);
});
