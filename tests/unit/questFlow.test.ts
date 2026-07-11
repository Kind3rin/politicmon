import { test } from "node:test";
import assert from "node:assert/strict";
import { applyQuestFlagPatch, chooseQuestBranch, completeQuestBranch, failQuestBranch, meetsPrerequisite, questFlowView, type BranchingQuestDef, type QuestFacts } from "../../src/game/questFlow.ts";

const flow: BranchingQuestDef = {
  prerequisites: [{ kind: "all", rules: [{ kind: "minBadges", value: 3 }, { kind: "flag", id: "atto3-started" }] }],
  allowFailure: true,
  branches: [
    { id: "alleanza", label: "ALLEANZA", completionFlag: "future-ally-done", failureFlag: "future-ally-failed" },
    { id: "contrasto", label: "CONTRASTO", prerequisites: [{ kind: "not", rule: { kind: "flag", id: "coalition-locked" } }], completionFlag: "future-oppose-done" }
  ]
};

function facts(flags: Record<string, boolean> = {}, badges = ["a", "b", "c"]): QuestFacts {
  return { flags, badges };
}

test("quest flow: prerequisiti all/any/not sono puri", () => {
  const state = facts({ ready: true });
  assert.equal(meetsPrerequisite(state, { kind: "all", rules: [{ kind: "flag", id: "ready" }, { kind: "minBadges", value: 3 }] }), true);
  assert.equal(meetsPrerequisite(state, { kind: "any", rules: [{ kind: "flag", id: "missing" }, { kind: "flag", id: "ready" }] }), true);
  assert.equal(meetsPrerequisite(state, { kind: "not", rule: { kind: "flag", id: "missing" } }), true);
});

test("quest flow: ramo si sceglie una volta e produce patch esplicita", () => {
  const flags = { "atto3-started": true };
  const before = facts(flags);
  assert.equal(questFlowView("future", flow, before).status, "available");
  const choice = chooseQuestBranch("future", flow, "alleanza", before);
  assert.equal(choice.ok, true);
  if (!choice.ok) return;
  applyQuestFlagPatch(flags, choice.patch);
  assert.equal(questFlowView("future", flow, facts(flags)).selectedBranchId, "alleanza");
  const repeated = chooseQuestBranch("future", flow, "contrasto", facts(flags));
  assert.equal(repeated.ok, false);
  if (!repeated.ok) assert.equal(repeated.error, "already_selected");
});

test("quest flow: completa solo col flag outcome del ramo", () => {
  const flags = { "atto3-started": true, "quest:future:branch:alleanza": true };
  assert.equal(completeQuestBranch("future", flow, facts(flags)).ok, false);
  flags["future-ally-done"] = true;
  const done = completeQuestBranch("future", flow, facts(flags));
  assert.equal(done.ok, true);
  if (!done.ok) return;
  applyQuestFlagPatch(flags, done.patch);
  assert.equal(questFlowView("future", flow, facts(flags)).status, "completed");
});

test("quest flow: fallimento è terminale solo se dichiarato", () => {
  const flags = { "atto3-started": true, "quest:future:branch:alleanza": true, "future-ally-failed": true };
  const failed = failQuestBranch("future", flow, facts(flags));
  assert.equal(failed.ok, true);
  if (!failed.ok) return;
  applyQuestFlagPatch(flags, failed.patch);
  assert.equal(questFlowView("future", flow, facts(flags)).status, "failed");
});

test("quest flow: quest lineari non ricevono stato o migrazioni implicite", () => {
  const locked = questFlowView("future", flow, facts({}, ["a", "b"]));
  assert.equal(locked.status, "locked");
  assert.deepEqual(locked.availableBranchIds, []);
});
