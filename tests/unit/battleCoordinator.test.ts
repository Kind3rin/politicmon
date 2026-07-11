import assert from "node:assert/strict";
import test from "node:test";
import type { TrainerDef } from "../../src/data/trainers";
import { buildTrainerTeam, shouldPersistTrainerVictory } from "../../src/game/world/battleCoordinator";
import { newGameState } from "../../src/game/state";

const trainer = (id: string, team: TrainerDef["team"]): TrainerDef => ({ id, name: id, pal: "aide", team, intro: [], defeat: [], money: 0 });

test("battle coordinator: conserva mosse e hold item dichiarati", () => {
  const team = buildTrainerTeam(newGameState(), trainer("test", [["giorgetta", 10, ["comizio"], "gilet"]]), {
    fallbackTeam: () => [], bossTrainerIds: []
  });
  assert.equal(team[0].moves[0].id, "comizio");
  assert.equal(team[0].heldItem, "gilet");
});

test("battle coordinator: assegna gilet all'asso boss in hard mode", () => {
  const state = newGameState();
  state.hardMode = true;
  const team = buildTrainerTeam(state, trainer("boss-test", [["giorgetta", 10], ["renzino", 12]]), {
    fallbackTeam: () => [], bossTrainerIds: ["boss-test"]
  });
  assert.equal(team.find((mon) => mon.level === Math.max(...team.map((item) => item.level)))?.heldItem, "gilet");
});

test("battle coordinator: esclude vittorie ripetibili dalla persistenza", () => {
  assert.equal(shouldPersistTrainerVictory("aide", "win"), true);
  assert.equal(shouldPersistTrainerVictory("wander:x", "win"), false);
  assert.equal(shouldPersistTrainerVictory("daily:x", "win"), false);
  assert.equal(shouldPersistTrainerVictory("coppa:x", "win"), false);
  assert.equal(shouldPersistTrainerVictory("aide", "loss"), false);
});
