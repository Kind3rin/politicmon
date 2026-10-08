import assert from "node:assert/strict";
import test from "node:test";
import { DEX_ORDER } from "../../src/data/species";
import { allBattleAnimationContracts } from "../../src/game/battle/animationContract";
import { BattleFx, battleGeometry, damageImpacts, monsterCenter } from "../../src/game/battle/view";

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


test("portrait impacts stay attached to the fighters at every arena height", () => {
  for (const height of [180, 237, 354, 480]) {
    const g = battleGeometry(height), fx = new BattleFx(); fx.viewHeight = height;
    // Commands now live outside the art surface: feet stay inside it and
    // opponents remain separated vertically, including the short landscape view.
    assert.ok(g.playerBase < height && g.playerBase > g.foeBase);
    assert.ok(g.foeBase - g.size > 0); assert.ok(g.size >= 72);
    for (const side of ["player", "foe"] as const) {
      fx.onHit(side, 1, false, 6);
      const target = monsterCenter(side === "player" ? "foe" : "player", height);
      const number = fx.damageNumbers.at(-1)!;
      assert.ok(Math.abs(number.x - target.x) <= 5);
      assert.ok(Math.abs(number.y - target.y) <= 20);
    }
  }
});

test("a weak hit names itself on the field, with the label above its number", () => {
  const fx = new BattleFx();
  fx.onHit("player", .6, false, 4);
  const impacts = damageImpacts(fx.damageNumbers, 237, false);
  assert.deepEqual(impacts.map(i => i.label), ["−4", "Poco efficace"]);
  assert.deepEqual(impacts.map(i => i.kind), ["weak", "tag-weak"]);
  assert.ok(impacts[1].y < impacts[0].y, "the label sits above the number");
});

test("a super hit labels in gold and keeps its label on reduced effects, without the pop", () => {
  for (const reduced of [false, true]) {
    const fx = new BattleFx(); fx.reduceEffects = reduced;
    fx.onHit("foe", 1.7, false, 9);
    const impacts = damageImpacts(fx.damageNumbers, 237, reduced);
    assert.deepEqual(impacts.map(i => i.label), ["−9", "Super efficace"]);
    assert.equal(impacts[1].kind, "tag-super");
    if (reduced) assert.equal(impacts[0].y, fx.damageNumbers[0].y / 237 * 100, "reduced effects: the number does not pop");
  }
});

test("a hit that takes most of the bar shakes harder than a chip", () => {
  const chip = new BattleFx(); chip.onHit("foe", 1, false, 1, undefined, 1 / 60);
  const big = new BattleFx(); big.onHit("foe", 1, false, 30, undefined, .5);
  assert.ok(big.shake > chip.shake, `big ${big.shake} vs chip ${chip.shake}`);
});

test("the hit-stop holds the attacker's pose while the shake settles", () => {
  const fx = new BattleFx();
  fx.onHit("player", 1, false, 5, undefined, .3);
  const lunge = fx.lungeT.player, shake = fx.shake;
  fx.update(.05, true);
  assert.equal(fx.lungeT.player, lunge, "the attacker stays in its pose during the hold");
  assert.ok(fx.shake < shake, "the shake settles even during the hold");
  fx.update(.05, false);
  assert.ok(fx.lungeT.player < lunge, "the lunge resumes after the hold");
});
