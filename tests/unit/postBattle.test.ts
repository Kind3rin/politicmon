import assert from "node:assert/strict";
import { test } from "node:test";
import { TRAINERS } from "../../src/data/trainers.ts";
import { newGameState } from "../../src/game/state.ts";
import { buildTrainerVictoryPlan, rollVictoryLoot } from "../../src/game/battle/postBattle.ts";

test("post-battle: payout base, sondaggi e messaggi sono deterministici", () => {
  const state = newGameState();
  const plan = buildTrainerVictoryPlan(state, TRAINERS.emittenza, false, () => 1);
  assert.equal(plan.payout, TRAINERS.emittenza.money);
  assert.equal(plan.sondaggiGain, 6);
  assert.equal(plan.loot, null);
  assert.ok(plan.introLines[0].includes(TRAINERS.emittenza.name));
  assert.ok(plan.badgeLead.some((line) => line.startsWith("BREAKING NEWS")));
});

test("post-battle: spot non si applica alle rivincite", () => {
  const state = newGameState();
  state.boostMoneyBattles = 2;
  const first = buildTrainerVictoryPlan(state, TRAINERS.tycoon, false, () => 1);
  const rematch = buildTrainerVictoryPlan(state, TRAINERS.tycoon, true, () => 1);
  assert.equal(first.payout, Math.round(TRAINERS.tycoon.money * 1.5));
  assert.equal(rematch.payout, TRAINERS.tycoon.money);
  assert.equal(rematch.spotBonus, false);
});

test("post-battle: loot pesato copre comune e jackpot", () => {
  assert.equal(rollVictoryLoot(() => 0).id, "scheda");
  assert.equal(rollVictoryLoot(() => 0.999).id, "tessera");
  const state = newGameState();
  const rolls = [0, 0.999];
  assert.equal(buildTrainerVictoryPlan(state, TRAINERS.tycoon, false, () => rolls.shift() ?? 1).loot?.jackpot, true);
});
