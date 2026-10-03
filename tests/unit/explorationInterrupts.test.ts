import assert from "node:assert/strict";
import { test } from "node:test";
import { createMonster } from "../../src/game/monster.ts";
import { newGameState } from "../../src/game/state.ts";
import {
  INITIAL_WANDERER_COOLDOWN,
  firstRecruitLevel,
  newWandererCadence,
  planWanderingChallenge
} from "../../src/game/world/explorationInterrupts.ts";

test("first recruitment stays at the living lead's level, then releases the encounter table", () => {
  const state = newGameState();
  state.pos.mapId = "route1";
  const fainted = createMonster("giorgetta", 8);
  fainted.hp = 0;
  state.party = [fainted, createMonster("ellyna", 5)];
  assert.equal(firstRecruitLevel(state, 7), 5);
  assert.equal(firstRecruitLevel(state, 3), 3);
  state.flags["ach:first-catch"] = true;
  assert.equal(firstRecruitLevel(state, 7), 7);
  delete state.flags["ach:first-catch"];
  state.pos.mapId = "borgo";
  state.flags["opening-v2"] = true;
  assert.equal(firstRecruitLevel(state, 7), 5);
  delete state.flags["opening-v2"];
  assert.equal(firstRecruitLevel(state, 7), 7);
  state.pos.mapId = "route2";
  assert.equal(firstRecruitLevel(state, 7), 7);
});

test("sfida vagante: il cooldown iniziale concede 50 passi liberi", () => {
  const state = newGameState();
  state.party = [createMonster("giorgetta", 10)];
  const cadence = newWandererCadence();
  for (let i = 0; i < INITIAL_WANDERER_COOLDOWN; i += 1) {
    assert.equal(planWanderingChallenge(state, cadence, true, false, () => ({ x: 1, y: 1, facing: "down" }), () => 0), null);
  }
  assert.equal(cadence.cooldown, 0);
});

test("sfida vagante: produce solo una proposta visibile con trainer scalato", () => {
  const state = newGameState();
  state.party = [createMonster("giorgetta", 20)];
  const cadence = { cooldown: 0, recentIds: [] as string[] };
  const rolls = [0, 0, 0];
  const plan = planWanderingChallenge(
    state,
    cadence,
    true,
    false,
    () => ({ x: 4, y: 5, facing: "left" }),
    () => rolls.shift() ?? 0
  );
  assert.ok(plan);
  assert.equal(plan.spot.x, 4);
  assert.match(plan.trainer.id, /^wander:/);
  assert.ok(plan.trainer.team.every(([, level]) => level >= 2));
  assert.ok(cadence.cooldown >= 70);
  assert.equal(cadence.recentIds.length, 1);
});

test("sfida vagante: disabilitata o già presente non consuma cooldown né RNG", () => {
  const state = newGameState();
  state.party = [createMonster("giorgetta", 10)];
  const cadence = { cooldown: 0, recentIds: [] as string[] };
  let calls = 0;
  const random = () => { calls += 1; return 0; };
  assert.equal(planWanderingChallenge(state, cadence, false, false, () => null, random), null);
  assert.equal(planWanderingChallenge(state, cadence, true, true, () => null, random), null);
  assert.equal(calls, 0);
});
