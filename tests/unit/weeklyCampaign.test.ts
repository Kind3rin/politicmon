import test from "node:test";
import assert from "node:assert/strict";
import { claimWeeklyReward, isoWeekKey, newWeeklyCampaignState, normalizeWeeklyCampaign, resolveWeeklyStage, startWeeklyCampaign, weeklyReward, weeklySchedule } from "../../src/game/weeklyCampaign.ts";

test("P6-T01: ISO week e schedule sono deterministici con 5 eventi, 3 dibattiti e finale", () => {
  const now = new Date(2026, 6, 11, 12);
  assert.equal(isoWeekKey(now), "2026-W28");
  const state = startWeeklyCampaign(newWeeklyCampaignState(), now);
  const one = weeklySchedule(state); const two = weeklySchedule(state);
  assert.deepEqual(two, one);
  assert.equal(one.filter((stage) => stage.kind === "event").length, 5);
  assert.equal(one.filter((stage) => stage.kind === "debate").length, 3);
  assert.equal(one.at(-1)?.kind, "final");
});

test("P6-T01: campagna si interrompe/riprende e ogni stage avanza una volta", () => {
  const now = new Date(2026, 6, 11, 12);
  let state = startWeeklyCampaign(newWeeklyCampaignState(), now);
  state = resolveWeeklyStage(state, "choice-a", 3);
  const resumed = startWeeklyCampaign(normalizeWeeklyCampaign(JSON.parse(JSON.stringify(state))), now);
  assert.deepEqual(resumed, state);
  for (let i = 1; i < 9; i += 1) state = resolveWeeklyStage(state, `result-${i}`, i % 2 ? 2 : -1);
  assert.equal(state.phase, "complete"); assert.equal(state.cursor, 9); assert.equal(state.outcomes.length, 9);
  assert.deepEqual(resolveWeeklyStage(state, "duplicate", 30), state);
});

test("P6-T01: una nuova settimana crea una run nuova senza toccare la precedente in input", () => {
  const first = startWeeklyCampaign(newWeeklyCampaignState(), new Date(2026, 6, 11));
  const progressed = resolveWeeklyStage(first, "a", 2);
  const next = startWeeklyCampaign(progressed, new Date(2026, 6, 18));
  assert.notEqual(next.weekKey, progressed.weekKey); assert.equal(next.cursor, 0); assert.equal(next.score, 0);
  assert.equal(progressed.cursor, 1);
});

test("P6-T01: premio ha tre fasce ed è reclamabile una sola volta", () => {
  const complete = { ...newWeeklyCampaignState(), phase: "complete" as const, score: 9 };
  assert.deepEqual(weeklyReward(complete), { money: 1800, ballots: 3 });
  assert.deepEqual(weeklyReward({ ...complete, score: 4 }), { money: 1200, ballots: 2 });
  assert.deepEqual(weeklyReward({ ...complete, score: 0 }), { money: 800, ballots: 1 });
  const claimed = claimWeeklyReward(complete); assert.equal(claimed.rewardClaimed, true);
  assert.equal(claimWeeklyReward(claimed), claimed);
});
