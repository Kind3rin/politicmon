import { test } from "node:test";
import assert from "node:assert/strict";
import { addAlly, newCoalitionState } from "../../src/game/coalition.ts";
import { DISTRICT_CONTENT, districtActionCount, resolveDistrictEndorsement, resolveDistrictPromise } from "../../src/game/districtCampaign.ts";
import { DISTRICT_IDS, newElectionState, resolveAction } from "../../src/game/election.ts";

function coalition() {
  let state = newCoalitionState();
  for (const id of ["campo_secretary", "quantum_centrist"] as const) {
    const added = addAlly(state, id); if (!added.ok) throw new Error(added.error); state = added.state;
  }
  return state;
}

test("P5-T05: catalogo copre cinque collegi con identità, trainer e segreto", () => {
  assert.deepEqual(Object.keys(DISTRICT_CONTENT), DISTRICT_IDS);
  for (const id of DISTRICT_IDS) {
    assert.ok(DISTRICT_CONTENT[id].problem.length > 3);
    assert.ok(DISTRICT_CONTENT[id].trainerId.startsWith("district-"));
    assert.ok(DISTRICT_CONTENT[id].secret.length > 3);
  }
});

test("P5-T05: promessa prudente è gratuita e usa modificatore territorio", () => {
  const result = resolveDistrictPromise(newElectionState(true), coalition(), 0, "nord", false);
  assert.equal(result.ok, true); if (!result.ok) return;
  assert.equal(result.money, 0);
  assert.equal(districtActionCount(result.election, "nord"), 1);
  assert.equal(result.election.districts[0].localConsensus > 38, true);
});

test("P5-T05: promessa rischiosa è atomica con costo e linea rossa", () => {
  assert.deepEqual(resolveDistrictPromise(newElectionState(true), coalition(), 999, "nord", true), { ok: false, error: "insufficient_funds" });
  const result = resolveDistrictPromise(newElectionState(true), coalition(), 2000, "centro", true);
  assert.equal(result.ok, true); if (!result.ok) return;
  assert.equal(result.money, 1200);
  assert.deepEqual(result.strained, ["campo_secretary"]);
});

test("P5-T05: sostegno applica affinità e consuma alleato globalmente", () => {
  const first = resolveDistrictEndorsement(newElectionState(true), coalition(), "centro", "campo_secretary");
  assert.equal(first.ok, true); if (!first.ok) return;
  assert.equal(first.election.districts.find((district) => district.id === "centro")!.outcomes[0].baseDelta, 6);
  assert.deepEqual(resolveDistrictEndorsement(first.election, coalition(), "sud", "campo_secretary"), { ok: false, error: "election_error" });
});

test("P5-T05: ogni collegio chiude esattamente dopo due azioni", () => {
  let election = newElectionState(true);
  for (const id of DISTRICT_IDS) {
    const debate = resolveAction(election, { districtId: id, action: "debate", variant: "win", baseDelta: 8 });
    assert.equal(debate.ok, true); if (!debate.ok) return; election = debate.state;
    const promise = resolveAction(election, { districtId: id, action: "promise", variant: "prudent", baseDelta: 4 });
    assert.equal(promise.ok, true); if (!promise.ok) return; election = promise.state;
  }
  assert.equal(election.phase, "ready");
  assert.equal(election.districts.every((district) => district.outcomes.length === 2), true);
});
