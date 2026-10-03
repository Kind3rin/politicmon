import assert from "node:assert/strict";
import test from "node:test";
import { DEX_ORDER } from "../../src/data/species";
import { allBattleAnimationContracts } from "../../src/game/battle/animationContract";
import { BattleFx } from "../../src/game/battle/view";

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
    assert.ok(["sprite-sequence", "dedicated-frame", "procedural-lunge"].includes(contract.attackMode));
  }
});

test("balanced 1.7x hits remain visibly super-effective, including with reduced effects", () => {
  for (const reduced of [false, true]) {
    const fx = new BattleFx(); fx.reduceEffects = reduced;
    fx.onHit("player", 1.7, true, 9, "SINISTRA");
    assert.equal(fx.effFx?.kind, "super");
    assert.equal(fx.damageNumbers[0].super, true); assert.equal(fx.damageNumbers[0].crit, true);
    assert.equal(fx.hitStop > 0, !reduced);
    fx.onHit("foe", .6, false, 2); assert.equal(fx.effFx?.kind, "weak");
  }
});
