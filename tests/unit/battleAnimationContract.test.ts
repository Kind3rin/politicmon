import assert from "node:assert/strict";
import test from "node:test";
import { DEX_ORDER } from "../../src/data/species";
import { allBattleAnimationContracts } from "../../src/game/battle/animationContract";

test("HP1: ogni specie ha idle, attacco, danno e KO", () => {
  const contracts = allBattleAnimationContracts();
  assert.equal(contracts.length, DEX_ORDER.length);
  assert.deepEqual(new Set(contracts.map((c) => c.speciesId)), new Set(DEX_ORDER));
  for (const contract of contracts) {
    assert.deepEqual(contract.states, ["idle", "attack", "damage", "ko"]);
  }
});

test("HP1: ogni attacco dichiara frame dedicato o affondo procedurale", () => {
  for (const contract of allBattleAnimationContracts()) {
    assert.ok(contract.attackMode === "dedicated-frame" || contract.attackMode === "procedural-lunge");
  }
});
