import { test } from "node:test";
import assert from "node:assert/strict";
import { addAlly, newCoalitionState } from "../../src/game/coalition.ts";
import { futureRewardPatch, resolveFutureChoice } from "../../src/game/futureChapter.ts";

function coalition(...ids: Array<"campo_secretary" | "quantum_centrist" | "civic_mayor">) {
  let state = newCoalitionState();
  for (const id of ids) {
    const result = addAlly(state, id);
    if (!result.ok) throw new Error(result.error);
    state = result.state;
  }
  return state;
}

test("P5-T02: ALLEANZA paga 800, recluta GENERORSO e applica evento 10", () => {
  const result = resolveFutureChoice({ choice: "alliance", coalition: coalition("campo_secretary", "quantum_centrist"), money: 1000, sondaggi: 50, flags: {} });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.patch.money, 200);
  assert.equal(result.patch.coalition.members.some((member) => member.allyId === "generorso"), true);
  assert.deepEqual(result.patch.strained, ["campo_secretary"]);
  assert.equal(result.patch.flags["a3.future.ally"], true);
});

test("P5-T02: DISTANZA applica il modificatore fondi della coalizione", () => {
  const result = resolveFutureChoice({ choice: "distance", coalition: coalition("campo_secretary", "civic_mayor"), money: 1000, sondaggi: 50, flags: {} });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.ok(result.patch.moneyDelta < 600, "il malus fondi Campo Largo deve ridurre il gain base");
  assert.equal(result.patch.money, 1000 + result.patch.moneyDelta);
  assert.equal(result.patch.flags["a3.future.distance"], true);
});

test("P5-T02: CONTRASTO dà +2 SONDAGGI e applica evento 11", () => {
  const result = resolveFutureChoice({ choice: "opposition", coalition: coalition("quantum_centrist", "civic_mayor"), money: 500, sondaggi: 99, flags: {} });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.patch.sondaggi, 100);
  assert.deepEqual(result.patch.strained, ["quantum_centrist"]);
  assert.equal(result.patch.flags["a3.future.oppose"], true);
});

test("P5-T02: errori non producono patch e reward è one-shot", () => {
  assert.deepEqual(resolveFutureChoice({ choice: "alliance", coalition: coalition("campo_secretary"), money: 799, sondaggi: 50, flags: {} }), { ok: false, error: "insufficient_funds" });
  assert.deepEqual(resolveFutureChoice({ choice: "distance", coalition: coalition(), money: 0, sondaggi: 50, flags: { "future-choice-complete": true } }), { ok: false, error: "already_resolved" });
  assert.equal(futureRewardPatch({})?.["feed-dossier-nord"], true);
  assert.equal(futureRewardPatch({ futureResolved: true }), null);
});
