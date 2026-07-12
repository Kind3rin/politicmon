import { test } from "node:test";
import assert from "node:assert/strict";
import { createMonster } from "../../src/game/monster.ts";
import { newGameState } from "../../src/game/state.ts";
import {
  normalizeRunStats,
  recordBattleResult,
  recordBattleStarted,
  recordRunStep,
  recordPartyKo,
  recordHealingItemUsed,
  recordHealerVisit,
  syncRunCheckpoints,
  tickRunStats
} from "../../src/game/runstats.ts";

test("tempo run: conta solo attività visibile e clampa dt anomalo", () => {
  const state = newGameState();
  tickRunStats(state, 0.05, true);
  tickRunStats(state, 10, true);
  tickRunStats(state, 0.05, false);
  tickRunStats(state, Number.NaN, true);
  assert.ok(Math.abs(state.runStats.playSeconds - 0.15) < 1e-9);
});

test("contatori run: passi, battaglie ed esiti sono separati", () => {
  const state = newGameState();
  recordRunStep(state);
  recordRunStep(state);
  recordBattleStarted(state);
  for (const result of ["win", "loss", "caught", "run"] as const) {
    recordBattleResult(state, result);
  }
  assert.deepEqual(
    {
      steps: state.runStats.steps,
      battles: state.runStats.battles,
      wins: state.runStats.wins,
      losses: state.runStats.losses,
      captures: state.runStats.captures,
      runs: state.runStats.runs
    },
    { steps: 2, battles: 1, wins: 1, losses: 1, captures: 1, runs: 1 }
  );
});

test("telemetria locale: KO, cure in lotta e visite al BAR restano separate", () => {
  const state = newGameState();
  recordPartyKo(state);
  recordPartyKo(state);
  recordHealingItemUsed(state);
  recordHealerVisit(state);
  assert.deepEqual(
    {
      partyKOs: state.runStats.partyKOs,
      healingItemsUsed: state.runStats.healingItemsUsed,
      healerVisits: state.runStats.healerVisits
    },
    { partyKOs: 2, healingItemsUsed: 1, healerVisits: 1 }
  );
});

test("checkpoint: registra una volta tempo, contatori e livello medio", () => {
  const state = newGameState();
  state.party = [createMonster("giorgetta", 10), createMonster("renzino", 20)];
  state.flags["starter-chosen"] = true;
  state.runStats.playSeconds = 120;
  state.runStats.steps = 80;
  state.runStats.battles = 3;
  syncRunCheckpoints(state);
  assert.deepEqual(state.runStats.checkpoints.starter, {
    playSeconds: 120,
    steps: 80,
    battles: 3,
    averagePartyLevel: 15
  });
  state.runStats.playSeconds = 999;
  syncRunCheckpoints(state);
  assert.equal(state.runStats.checkpoints.starter?.playSeconds, 120);
});

test("checkpoint progressivi: badge e finali vengono rilevati dallo stato reale", () => {
  const state = newGameState();
  state.badges = ["auditel", "spread", "dazio"];
  state.flags["boss-beaten"] = true;
  state.flags["garante-beaten"] = true;
  state.flags["offshore-beaten"] = true;
  state.flags["ue-beaten"] = true;
  syncRunCheckpoints(state);
  for (const id of ["badge-1", "badge-2", "badge-3", "palazzo", "garante", "offshore", "bruxelles"] as const) {
    assert.ok(state.runStats.checkpoints[id], `${id} non registrato`);
  }
});

test("normalizzazione runStats: scarta checkpoint ignoti e clampa numeri corrotti", () => {
  const normalized = normalizeRunStats({
    playSeconds: -4,
    steps: 2.9,
    battles: Number.NaN,
    wins: 3.8,
    losses: "2",
    captures: 1,
    runs: -1,
    checkpoints: {
      starter: { playSeconds: 10, steps: 2.2, battles: 1.9, averagePartyLevel: 5.5 },
      intruso: { playSeconds: 999 }
    }
  });
  assert.equal(normalized.playSeconds, 0);
  assert.equal(normalized.steps, 2);
  assert.equal(normalized.battles, 0);
  assert.equal(normalized.wins, 3);
  assert.equal(normalized.losses, 0);
  assert.equal(normalized.runs, 0);
  assert.equal(normalized.checkpoints.starter?.steps, 2);
  assert.equal("intruso" in normalized.checkpoints, false);
});
