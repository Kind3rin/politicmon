import assert from "node:assert/strict";
import { test } from "node:test";
import { BattleScene } from "../../src/game/battle/BattleScene.ts";
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


test("the victory receipt awards funds, poll, reward and same-item loot exactly once", () => {
  const battle = Object.create(BattleScene.prototype) as any;
  battle.state = newGameState(); battle.state.boostMoneyBattles = 2; battle.state.boostSondBattles = 2;
  battle.trainer = { ...TRAINERS.aide, team: [["salvinott", 4]], defeat: ["CONTO CHIUSO."], reward: { itemId: "scheda", qty: 3 } };
  battle.foeIndex = 0; battle.foeTeam = [{}]; battle.isRematch = false;
  const before = { money: battle.state.money, polls: battle.state.sondaggi, balls: battle.state.bag.scheda ?? 0 };
  const queue: any[] = []; battle.pushFront = (steps: any[]) => queue.push(...steps);
  battle.endBattle = (result: string) => assert.equal(result, "win");
  const random = Math.random; Math.random = () => 0;
  try { battle.afterFoeDown(); } finally { Math.random = random; }
  assert.equal(queue.filter(step => step.text).length, 1);
  const receipt = queue.find(step => step.run && !step.text && step !== queue[0]);
  receipt.run(); receipt.run();
  assert.equal(battle.state.money, before.money + Math.round(TRAINERS.aide.money * 1.5));
  assert.equal(battle.state.sondaggi, before.polls + 12);
  assert.equal(battle.state.bag.scheda, before.balls + 5);
  assert.equal(queue.filter(step => step.text).length, 2);
  assert.ok(queue.at(-1).text.includes("x5"));
});

test("jackpot keeps its celebration without granting the rare item again", () => {
  const battle = Object.create(BattleScene.prototype) as any;
  battle.state = newGameState(); battle.trainer = TRAINERS.aide;
  battle.foeIndex = 1; battle.foeTeam = [{}, {}]; battle.fx = { catchFlash: 0, particles: [], startMoment() {} };
  const queue: any[] = []; battle.pushFront = (steps: any[]) => queue.push(...steps); battle.endBattle = () => {};
  const random = Math.random; const rolls = [0, .999]; Math.random = () => rolls.shift() ?? .5;
  try { battle.afterFoeDown(); } finally { Math.random = random; }
  queue.slice().forEach(step => step.run?.());
  assert.equal(battle.state.bag.tessera, 1); assert.equal(battle.fx.particles.length, 26);
  assert.ok(queue.some(step => step.text?.startsWith("JACKPOT!")));
});
